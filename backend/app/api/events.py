from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.user_event import UserEvent


def record_event(
    db: Session,
    event_type: str,
    user_id: int | None = None,
    entity_id: int | None = None,
    session_id: str | None = None,
) -> None:
    try:
        event = UserEvent(
            event_type=event_type,
            user_id=user_id,
            entity_id=entity_id,
            session_id=session_id,
        )
        db.add(event)
        db.flush()
    except Exception:
        pass
