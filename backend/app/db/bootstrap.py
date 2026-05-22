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

    # Пароль первого админа задаёт оператор через окружение (например, простой
    # FIRST_ADMIN_PASSWORD=111111 для локального стенда). Он не проходит через
    # форму регистрации, поэтому намеренно НЕ подчиняется пользовательской
    # политике паролей — иначе bootstrap на чистой базе падал бы. Используем
    # ``model_construct``, чтобы пропустить валидацию схемы.
    admin_payload = UserRegister.model_construct(
        email=first_admin_email,
        username=_resolve_first_admin_username(first_admin_email),
        password=first_admin_password,
        last_name="Bootstrap",
        first_name="Admin",
        middle_name=None,
        course_id=None,
        program_id=None,
        group_name=None,
    )

    return create_user_with_role(db, admin_payload, "admin", email_confirmed=True)


def report_first_admin_status() -> None:
    """Создать (если нужно) администратора и вывести понятное сообщение.

    Запускается при каждом старте приложения, независимо от
    ``auto_db_bootstrap``: в docker-режиме миграции и сиды выполняются
    отдельной командой, поэтому без этого вызова админ не появлялся бы.
    Любые ошибки логируются, но не валят запуск приложения.
    """
    from app.db.database import SessionLocal

    email = settings.first_admin_email.strip().lower()
    password = settings.first_admin_password

    if not email or not password:
        print(
            "\n[SMHUB] Аккаунт администратора не задан.\n"
            "        Укажите FIRST_ADMIN_EMAIL и FIRST_ADMIN_PASSWORD "
            "(в backend/.env или в окружении docker-compose) и перезапустите.\n",
            flush=True,
        )
        return

    try:
        with SessionLocal() as session:
            created = ensure_first_admin_exists(session)
    except Exception as exc:  # noqa: BLE001 - старт не должен падать из-за этого
        print(
            f"\n[SMHUB] Не удалось создать аккаунт администратора: {exc}\n",
            flush=True,
        )
        return

    if created is not None:
        print(
            f"\n[SMHUB] Аккаунт администратора создан успешно: вход по email "
            f"'{email}'.\n",
            flush=True,
        )
    else:
        print(
            f"\n[SMHUB] Аккаунт администратора уже существует (email '{email}').\n",
            flush=True,
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

        from app.db.seed import seed_materials, seed_reference_data

        seed_reference_data()

        # Сидинг редакционных материалов идемпотентен и не перезаписывает
        # накопленные метрики у уже существующих записей. На Vercel это
        # единственный способ наполнить базу — там нет docker-команды,
        # которая делала бы это отдельно. Падение сидинга не должно ронять
        # старт приложения.
        try:
            seed_materials()
        except Exception as exc:  # noqa: BLE001
            print(
                f"\n[SMHUB] Не удалось засидить материалы: {exc}\n",
                flush=True,
            )

        # Создание администратора вынесено в report_first_admin_status(),
        # который вызывается на старте независимо от auto_db_bootstrap.
        _is_bootstrapped = True
