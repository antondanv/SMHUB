import unittest

import psycopg2
from fastapi import HTTPException
from psycopg2 import sql
from sqlalchemy import create_engine, func, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401
from app.api.featured import (
    FeaturedCreateRequest,
    FeaturedUpdateRequest,
    create_featured,
    get_featured,
    update_featured,
)
from app.api.materials import delete_material, like_material
from app.api.reports import ReportUpdateRequest, update_report
from app.core.config import settings
from app.db.base import Base
from app.models.comment import Comment
from app.models.course import Course
from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.favorite import Favorite
from app.models.featured_item import FeaturedItem
from app.models.like import Like
from app.models.material import Material
from app.models.material_status import MaterialStatus
from app.models.material_type import MaterialType
from app.models.mime_type import MimeType
from app.models.program import Program
from app.models.rating import Rating
from app.models.report import Report
from app.models.role import Role
from app.models.subject import Subject
from app.models.user import User


class ReviewFixesTestBase(unittest.TestCase):
    """Shared Postgres setup mirroring tests/test_admin_registration.py."""

    test_database_name = "smhub_test_review_fixes"

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
        self._seed_reference_data()

    def tearDown(self) -> None:
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def _seed_reference_data(self) -> None:
        with self.session_factory() as session:
            session.add_all(
                [
                    Role(id=1, name="student", description="Student"),
                    Role(id=2, name="admin", description="Admin"),
                    Subject(id=1, name="Математика"),
                    MaterialType(id=1, name="Лекция"),
                    Course(id=1, name="Первый", number=1),
                    Program(id=1, name="Информатика", code="INF"),
                    MimeType(id=1, name="application/pdf", extension="pdf"),
                    MaterialStatus(id=1, name=MaterialStatusEnum.PUBLISHED.value),
                    MaterialStatus(id=2, name=MaterialStatusEnum.PENDING.value),
                ]
            )
            session.commit()

    def _make_user(self, session, *, email: str, role_id: int) -> User:
        user = User(
            email=email,
            username=email.split("@")[0],
            hashed_password="x",
            last_name="Тест",
            first_name="Пользователь",
            role_id=role_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    def _make_material(self, session, *, author_id: int, status_id: int) -> Material:
        material = Material(
            title="Материал",
            description="Описание",
            author_id=author_id,
            subject_id=1,
            material_type_id=1,
            course_id=1,
            program_id=1,
            mime_type_id=1,
            status_id=status_id,
            file_url="uploads/does-not-exist.pdf",
            file_name="file.pdf",
            file_size=10,
        )
        session.add(material)
        session.commit()
        session.refresh(material)
        return material


class FeaturedPublishedOnlyTests(ReviewFixesTestBase):
    def test_get_featured_excludes_unpublished_materials(self) -> None:
        with self.session_factory() as session:
            author = self._make_user(session, email="author@example.com", role_id=1)
            published = self._make_material(session, author_id=author.id, status_id=1)
            pending = self._make_material(session, author_id=author.id, status_id=2)
            published_id = published.id
            pending_id = pending.id
            session.add_all(
                [
                    FeaturedItem(section="hero", material_id=published_id, position=0, is_active=True),
                    FeaturedItem(section="hero", material_id=pending_id, position=1, is_active=True),
                ]
            )
            session.commit()

            result = get_featured(section="hero", db=session)
            returned_ids = {item.id for item in result}

        self.assertIn(published_id, returned_ids)
        self.assertNotIn(pending_id, returned_ids)

    def test_create_featured_rejects_active_block_for_unpublished(self) -> None:
        with self.session_factory() as session:
            admin = self._make_user(session, email="admin@example.com", role_id=2)
            author = self._make_user(session, email="author@example.com", role_id=1)
            pending = self._make_material(session, author_id=author.id, status_id=2)

            with self.assertRaises(HTTPException) as error:
                create_featured(
                    FeaturedCreateRequest(section="hero", material_id=pending.id, is_active=True),
                    current_user=admin,
                    db=session,
                )

        self.assertEqual(error.exception.status_code, 409)
        with self.session_factory() as session:
            total = session.scalar(select(func.count()).select_from(FeaturedItem))
        self.assertEqual(total, 0)

    def test_create_featured_allows_inactive_block_for_unpublished(self) -> None:
        with self.session_factory() as session:
            admin = self._make_user(session, email="admin@example.com", role_id=2)
            author = self._make_user(session, email="author@example.com", role_id=1)
            pending = self._make_material(session, author_id=author.id, status_id=2)

            response = create_featured(
                FeaturedCreateRequest(section="hero", material_id=pending.id, is_active=False),
                current_user=admin,
                db=session,
            )

        self.assertFalse(response.is_active)
        self.assertEqual(response.material_id, pending.id)

    def test_update_featured_rejects_activating_unpublished(self) -> None:
        with self.session_factory() as session:
            admin = self._make_user(session, email="admin@example.com", role_id=2)
            author = self._make_user(session, email="author@example.com", role_id=1)
            pending = self._make_material(session, author_id=author.id, status_id=2)
            item = FeaturedItem(section="hero", material_id=pending.id, position=0, is_active=False)
            session.add(item)
            session.commit()
            item_id = item.id

            with self.assertRaises(HTTPException) as error:
                update_featured(
                    item_id=item_id,
                    data=FeaturedUpdateRequest(is_active=True),
                    current_user=admin,
                    db=session,
                )

        self.assertEqual(error.exception.status_code, 409)
        with self.session_factory() as session:
            refreshed = session.get(FeaturedItem, item_id)
        self.assertFalse(refreshed.is_active)


class MaterialDeletionTests(ReviewFixesTestBase):
    def test_delete_material_removes_dependent_records(self) -> None:
        with self.session_factory() as session:
            author = self._make_user(session, email="author@example.com", role_id=1)
            other = self._make_user(session, email="other@example.com", role_id=1)
            material = self._make_material(session, author_id=author.id, status_id=1)
            session.add_all(
                [
                    Comment(material_id=material.id, user_id=other.id, content="Комментарий"),
                    Like(material_id=material.id, user_id=other.id),
                    Favorite(material_id=material.id, user_id=other.id),
                    Rating(material_id=material.id, user_id=other.id, value=5),
                ]
            )
            session.commit()
            material_id = material.id

            delete_material(material_id=material_id, current_user=author, db=session)

        with self.session_factory() as session:
            self.assertIsNone(session.get(Material, material_id))
            for model in (Comment, Like, Favorite, Rating):
                remaining = session.scalar(
                    select(func.count())
                    .select_from(model)
                    .where(model.material_id == material_id)
                )
                self.assertEqual(remaining, 0, f"{model.__name__} rows should be deleted")


class HiddenMaterialReactionTests(ReviewFixesTestBase):
    def test_like_on_hidden_material_is_forbidden_for_other_user(self) -> None:
        with self.session_factory() as session:
            author = self._make_user(session, email="author@example.com", role_id=1)
            stranger = self._make_user(session, email="stranger@example.com", role_id=1)
            pending = self._make_material(session, author_id=author.id, status_id=2)

            with self.assertRaises(HTTPException) as error:
                like_material(material_id=pending.id, current_user=stranger, db=session)

        self.assertEqual(error.exception.status_code, 403)
        with self.session_factory() as session:
            likes = session.scalar(select(func.count()).select_from(Like))
        self.assertEqual(likes, 0)


class ReportCommentDeletionTests(ReviewFixesTestBase):
    def test_delete_comment_action_soft_deletes_and_decrements_count(self) -> None:
        with self.session_factory() as session:
            admin = self._make_user(session, email="admin@example.com", role_id=2)
            author = self._make_user(session, email="author@example.com", role_id=1)
            material = self._make_material(session, author_id=author.id, status_id=1)
            material.comments_count = 1
            comment = Comment(material_id=material.id, user_id=author.id, content="Жалоба")
            session.add(comment)
            session.commit()
            report = Report(
                reporter_user_id=author.id,
                target_type="comment",
                target_id=comment.id,
                reason="spam",
                status="open",
            )
            session.add(report)
            session.commit()
            comment_id = comment.id
            material_id = material.id
            report_id = report.id

            update_report(
                report_id=report_id,
                data=ReportUpdateRequest(status="resolved", action="delete_comment"),
                request=None,
                current_user=admin,
                db=session,
            )

        with self.session_factory() as session:
            refreshed_comment = session.get(Comment, comment_id)
            refreshed_material = session.get(Material, material_id)

        self.assertTrue(refreshed_comment.is_deleted, "comment should be soft-deleted, not removed")
        self.assertEqual(refreshed_material.comments_count, 0)


if __name__ == "__main__":
    unittest.main()
