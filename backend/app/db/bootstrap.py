from __future__ import annotations

from pathlib import Path
from threading import Lock

from alembic import command
from alembic.config import Config
from sqlalchemy.engine import Engine

from app.core.config import settings


_bootstrap_lock = Lock()
_is_bootstrapped = False


def _get_alembic_config() -> Config:
    base_dir = Path(__file__).resolve().parents[2]
    return Config(str(base_dir / "alembic.ini"))


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

        seed_reference_data()
        _is_bootstrapped = True
