from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from app.api.auth import get_current_user
from app.api.materials_common import is_privileged_user
from app.db.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User


router = APIRouter(prefix="/admin/audit", tags=["audit"])


class AuditLogEntryResponse(BaseModel):
    id: int
    action: str
    target_type: Optional[str]
    target_id: Optional[int]
    payload: Optional[dict[str, Any]]
    ip: Optional[str]
    created_at: datetime
    actor_id: Optional[int]
    actor_username: Optional[str]


class AuditLogListResponse(BaseModel):
    items: list[AuditLogEntryResponse]
    total: int
    page: int
    total_pages: int


def _require_admin(current_user: User) -> None:
    if not is_privileged_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required",
        )


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


@router.get("", response_model=AuditLogListResponse)
def list_audit(
    actor_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuditLogListResponse:
    _require_admin(current_user)

    stmt = select(AuditLog).options(joinedload(AuditLog.actor))

    if actor_id is not None:
        stmt = stmt.where(AuditLog.actor_id == actor_id)
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"{action}%"))
    dt_from = _parse_dt(date_from)
    dt_to = _parse_dt(date_to)
    if dt_from is not None:
        stmt = stmt.where(AuditLog.created_at >= dt_from)
    if dt_to is not None:
        stmt = stmt.where(AuditLog.created_at <= dt_to)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    offset = (page - 1) * per_page
    entries = db.scalars(
        stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(per_page)
    ).all()

    return AuditLogListResponse(
        items=[
            AuditLogEntryResponse(
                id=e.id,
                action=e.action,
                target_type=e.target_type,
                target_id=e.target_id,
                payload=e.payload,
                ip=e.ip,
                created_at=e.created_at,
                actor_id=e.actor_id,
                actor_username=e.actor.username if e.actor else None,
            )
            for e in entries
        ],
        total=total,
        page=page,
        total_pages=max(1, (total + per_page - 1) // per_page),
    )
