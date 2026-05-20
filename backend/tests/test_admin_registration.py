import unittest

from fastapi import HTTPException
import psycopg2
from psycopg2 import sql
from sqlalchemy import create_engine, func, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401
from app.api.auth import get_current_user, login, register_admin
from app.core.config import settings
from app.db.base import Base
from app.db.bootstrap import ensure_first_admin_exists
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import AdminRegister, UserLogin


class AdminRegistrationTests(unittest.TestCase):
    test_database_name = "smhub_test_admin_registration"

    @classmethod
    def setUpClass(cls) -> None:
        database_url = make_url(settings.database_url)
        cls.admin_database_url = database_url.set(database="postgres")
        cls.test_database_url = database_url.set(database=cls.test_database_name)
        cls._recreate_database()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._drop_database()

    @classmethod
    def _connect_to_admin_database(cls):
        return psycopg2.connect(
            dbname=cls.admin_database_url.database,
            user=cls.admin_database_url.username,
            password=cls.admin_database_url.password,
            host=cls.admin_database_url.host,
            port=cls.admin_database_url.port,
        )

    @classmethod
    def _drop_database(cls) -> None:
        connection = cls._connect_to_admin_database()
        try:
            connection.autocommit = True
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT pg_terminate_backend(pid) "
                    "FROM pg_stat_activity "
                    "WHERE datname = %s AND pid <> pg_backend_pid()",
                    (cls.test_database_name,),
                )
                cursor.execute(
                    sql.SQL("DROP DATABASE IF EXISTS {}").format(
                        sql.Identifier(cls.test_database_name)
                    )
                )
        finally:
            connection.close()

    @classmethod
    def _recreate_database(cls) -> None:
        cls._drop_database()
        connection = cls._connect_to_admin_database()
        try:
            connection.autocommit = True
            with connection.cursor() as cursor:
                cursor.execute(
                    sql.SQL("CREATE DATABASE {}").format(
                        sql.Identifier(cls.test_database_name)
                    )
                )
        finally:
            connection.close()

    def setUp(self) -> None:
        self.original_auto_db_bootstrap = settings.auto_db_bootstrap
        self.original_admin_registration_secret = settings.admin_registration_secret
        self.original_first_admin_email = settings.first_admin_email
        self.original_first_admin_password = settings.first_admin_password
        self.original_first_admin_username = settings.first_admin_username

        settings.auto_db_bootstrap = False
        settings.admin_registration_secret = ""
        settings.first_admin_email = ""
        settings.first_admin_password = ""
        settings.first_admin_username = ""

        self.engine = create_engine(
            str(self.test_database_url),
            future=True,
            pool_pre_ping=True,
        )
        self.session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine,
        )

        Base.metadata.create_all(self.engine)

        with self.session_factory() as session:
            session.add_all(
                [
                    Role(id=1, name="student", description="Student"),
                    Role(id=2, name="admin", description="Admin"),
                ]
            )
            session.commit()

    def tearDown(self) -> None:
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

        settings.auto_db_bootstrap = self.original_auto_db_bootstrap
        settings.admin_registration_secret = self.original_admin_registration_secret
        settings.first_admin_email = self.original_first_admin_email
        settings.first_admin_password = self.original_first_admin_password
        settings.first_admin_username = self.original_first_admin_username

    def _build_payload(self, **overrides) -> dict:
        payload = {
            "email": "admin@example.com",
            "username": "admin_user",
            "password": "secret123",
            "last_name": "Иванов",
            "first_name": "Иван",
            "middle_name": "Иванович",
            "course_id": None,
            "program_id": None,
            "group_name": None,
            "admin_secret": "top-secret",
        }
        payload.update(overrides)
        return payload

    def test_register_admin_returns_404_when_secret_is_not_configured(self) -> None:
        with self.session_factory() as session:
            with self.assertRaises(HTTPException) as error:
                register_admin(
                    AdminRegister(**self._build_payload()),
                    db=session,
                )

        self.assertEqual(error.exception.status_code, 404)
        self.assertEqual(error.exception.detail, "Admin registration is not available")

    def test_register_admin_returns_403_when_secret_is_invalid(self) -> None:
        settings.admin_registration_secret = "expected-secret"

        with self.session_factory() as session:
            with self.assertRaises(HTTPException) as error:
                register_admin(
                    AdminRegister(**self._build_payload(admin_secret="wrong-secret")),
                    db=session,
                )

        self.assertEqual(error.exception.status_code, 403)
        self.assertEqual(error.exception.detail, "Invalid admin registration secret")

        with self.session_factory() as session:
            users_total = session.scalar(select(func.count()).select_from(User))

        self.assertEqual(users_total, 0)

    def test_register_admin_creates_admin_and_allows_login(self) -> None:
        settings.admin_registration_secret = "top-secret"

        with self.session_factory() as session:
            new_admin = register_admin(
                AdminRegister(**self._build_payload()),
                db=session,
            )
            auth_token = login(
                UserLogin(
                    email="admin@example.com",
                    password="secret123",
                ),
                db=session,
            )
            current_user = get_current_user(
                token=auth_token.access_token,
                db=session,
            )

        self.assertEqual(new_admin.role_name, "admin")
        self.assertEqual(current_user.email, "admin@example.com")
        self.assertEqual(current_user.role_name, "admin")

        with self.session_factory() as session:
            admin_user = session.scalar(select(User).where(User.email == "admin@example.com"))

        self.assertIsNotNone(admin_user)
        self.assertEqual(admin_user.role_id, 2)

    def test_bootstrap_first_admin_is_idempotent(self) -> None:
        settings.first_admin_email = "first.admin@example.com"
        settings.first_admin_password = "bootstrap123"
        settings.first_admin_username = ""

        with self.session_factory() as session:
            created_user = ensure_first_admin_exists(session)

        self.assertIsNotNone(created_user)
        self.assertEqual(created_user.email, "first.admin@example.com")
        self.assertEqual(created_user.username, "first.admin")

        with self.session_factory() as session:
            second_run_user = ensure_first_admin_exists(session)
            admin_users = session.scalars(
                select(User)
                .join(Role, Role.id == User.role_id)
                .where(Role.name == "admin")
            ).all()

        self.assertIsNone(second_run_user)
        self.assertEqual(len(admin_users), 1)
        self.assertEqual(admin_users[0].email, "first.admin@example.com")


if __name__ == "__main__":
    unittest.main()
