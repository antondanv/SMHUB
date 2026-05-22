from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.email_token import EmailToken
from app.models.user import User


PURPOSE_CONFIRM = "confirm"
PURPOSE_RESET = "reset"


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def issue_token(
    db: Session,
    *,
    user_id: int,
    purpose: str,
    ttl: timedelta,
) -> str:
    """Создать новый токен. Возвращает сырое значение (для ссылки в письме)."""
    raw = secrets.token_urlsafe(32)
    token = EmailToken(
        user_id=user_id,
        token_hash=_hash_token(raw),
        purpose=purpose,
        expires_at=datetime.now(timezone.utc) + ttl,
    )
    db.add(token)
    db.flush()
    return raw


def invalidate_pending(db: Session, *, user_id: int, purpose: str) -> None:
    """Пометить все неиспользованные токены пользователя как использованные."""
    now = datetime.now(timezone.utc)
    db.execute(
        update(EmailToken)
        .where(
            EmailToken.user_id == user_id,
            EmailToken.purpose == purpose,
            EmailToken.used_at.is_(None),
        )
        .values(used_at=now)
    )


def consume_token(db: Session, *, raw: str, purpose: str) -> User | None:
    """Проверить токен и пометить как использованный. Возвращает пользователя."""
    if not raw:
        return None

    token = db.scalar(
        select(EmailToken).where(
            EmailToken.token_hash == _hash_token(raw),
            EmailToken.purpose == purpose,
        )
    )

    if token is None:
        return None

    if token.used_at is not None:
        return None

    if token.expires_at <= datetime.now(timezone.utc):
        return None

    user = db.get(User, token.user_id)
    if user is None:
        return None

    token.used_at = datetime.now(timezone.utc)
    db.flush()
    return user
