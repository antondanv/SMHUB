from __future__ import annotations

from pathlib import Path
from threading import Lock

from alembic import command
from alembic.config import Config
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import UserRegister


_bootstrap_lock = Lock()
_is_bootstrapped = False


def _get_alembic_config() -> Config:
    base_dir = Path(__file__).resolve().parents[2]
    return Config(str(base_dir / "alembic.ini"))


def _resolve_first_admin_username(email: str) -> str:
    configured_username = settings.first_admin_username.strip()
    if configured_username:
        return configured_username

    local_part = email.split("@", 1)[0].strip() or "admin"
    if len(local_part) >= 3:
        return local_part[:100]

    return f"{local_part}_admin"[:100]


def ensure_first_admin_exists(db: Session) -> User | None:
    first_admin_email = settings.first_admin_email.strip().lower()
    first_admin_password = settings.first_admin_password

    if not first_admin_email or not first_admin_password:
        return None

    admin_exists = db.scalar(
        select(User.id)
        .join(Role, Role.id == User.role_id)
        .where(Role.name == "admin")
        .limit(1)
    )

    if admin_exists is not None:
        return None

    from app.services.auth_service import create_user_with_role

    return create_user_with_role(
        db,
        UserRegister(
            email=first_admin_email,
            username=_resolve_first_admin_username(first_admin_email),
            password=first_admin_password,
            last_name="Bootstrap",
            first_name="Admin",
            middle_name=None,
            course_id=None,
            program_id=None,
            group_name=None,
        ),
        "admin",
    )


def ensure_database_ready(engine: Engine) -> None:
    global _is_bootstrapped

    if not settings.auto_db_bootstrap or _is_bootstrapped:
        return

    with _bootstrap_lock:
        if _is_bootstrapped:
            return

        # Keep local databases aligned with the latest schema, not only with the
        # very first bootstrap state.
        command.upgrade(_get_alembic_config(), "head")

        from app.db.seed import seed_reference_data
        from app.db.database import SessionLocal

        seed_reference_data()

        with SessionLocal() as session:
            ensure_first_admin_exists(session)

        _is_bootstrapped = True
