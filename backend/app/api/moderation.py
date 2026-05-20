from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.auth import get_current_user
from app.api.materials_common import (
    base_material_query,
    full_name_for_user,
    get_material_or_404,
    get_status_or_500,
    is_privileged_user,
    serialize_material,
)
from app.db.database import get_db
from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.material import Material
from app.models.moderation_log import ModerationLog
from app.models.user import User
from app.schemas.material import (
    BulkModerationRequest,
    BulkModerationResponse,
    ModerationDecisionRequest,
    ModerationHistoryResponse,
    ModerationLogEntryResponse,
    ModerationQueueResponse,
    MaterialSummaryResponse,
)


router = APIRouter(prefix="/moderation", tags=["moderation"])


def require_moderation_access(current_user: User) -> None:
    if not is_privileged_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required",
        )


def _record_log(
    db: Session,
    material_id: int,
    actor_id: int,
    action: str,
    comment: str | None,
) -> None:
    db.add(ModerationLog(
        material_id=material_id,
        actor_id=actor_id,
        action=action,
        comment=comment,
    ))


@router.get("/materials", response_model=ModerationQueueResponse)
def list_pending_materials(
    status_filter: Optional[str] = Query(None, alias="status"),
    author_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ModerationQueueResponse:
    require_moderation_access(current_user)

    if status_filter:
        stmt = base_material_query().where(Material.status.has(name=status_filter))
    else:
        stmt = base_material_query().where(
            Material.status.has(name=MaterialStatusEnum.PENDING.value)
        )

    if author_id:
        stmt = stmt.where(Material.author_id == author_id)
    if subject_id:
        stmt = stmt.where(Material.subject_id == subject_id)
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            stmt = stmt.where(Material.created_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
            stmt = stmt.where(Material.created_at <= dt_to)
        except ValueError:
            pass

    stmt = stmt.order_by(Material.created_at.asc())

    total = db.scalar(
        select(Material.id).select_from(stmt.subquery())
    )
    total_count = len(db.scalars(stmt).unique().all())

    offset = (page - 1) * per_page
    materials = db.scalars(stmt.offset(offset).limit(per_page)).unique().all()

    return ModerationQueueResponse(
        items=[serialize_material(m) for m in materials],
        total=total_count,
    )


@router.patch("/materials/{material_id}", response_model=MaterialSummaryResponse)
def moderate_material(
    material_id: int,
    payload: ModerationDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialSummaryResponse:
    require_moderation_access(current_user)

    if payload.status == MaterialStatusEnum.REJECTED.value and not payload.comment:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Rejection reason is required",
        )

    material = get_material_or_404(db, material_id)
    next_status = get_status_or_500(db, MaterialStatusEnum(payload.status))

    material.status_id = next_status.id
    material.status = next_status

    if payload.status == MaterialStatusEnum.PUBLISHED.value:
        material.published_at = datetime.now(timezone.utc)
    elif payload.status == MaterialStatusEnum.REJECTED.value:
        material.published_at = None

    action_map = {
        MaterialStatusEnum.PUBLISHED.value: "approved",
        MaterialStatusEnum.REJECTED.value: "rejected",
        MaterialStatusEnum.PENDING.value: "returned",
    }
    _record_log(
        db,
        material_id=material.id,
        actor_id=current_user.id,
        action=action_map.get(payload.status, payload.status),
        comment=payload.comment,
    )

    db.commit()
    db.refresh(material)

    return serialize_material(material)


@router.get("/materials/{material_id}/history", response_model=ModerationHistoryResponse)
def get_material_history(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ModerationHistoryResponse:
    require_moderation_access(current_user)

    get_material_or_404(db, material_id)

    entries = db.scalars(
        select(ModerationLog)
        .options(joinedload(ModerationLog.actor))
        .where(ModerationLog.material_id == material_id)
        .order_by(ModerationLog.created_at.desc())
    ).all()

    return ModerationHistoryResponse(
        material_id=material_id,
        entries=[
            ModerationLogEntryResponse(
                id=e.id,
                action=e.action,
                comment=e.comment,
                actor_username=e.actor.username if e.actor else None,
                actor_full_name=full_name_for_user(e.actor) if e.actor else None,
                created_at=e.created_at,
            )
            for e in entries
        ],
    )


@router.post("/bulk", response_model=BulkModerationResponse)
def bulk_moderate(
    payload: BulkModerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BulkModerationResponse:
    require_moderation_access(current_user)

    if payload.action == "rejected" and not payload.comment:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Rejection reason is required for bulk reject",
        )

    try:
        next_status_enum = MaterialStatusEnum(payload.action)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action: {payload.action}",
        )

    next_status = get_status_or_500(db, next_status_enum)

    action_map = {
        MaterialStatusEnum.PUBLISHED.value: "approved",
        MaterialStatusEnum.REJECTED.value: "rejected",
        MaterialStatusEnum.PENDING.value: "returned",
    }
    log_action = action_map.get(payload.action, payload.action)

    updated = 0
    skipped = 0

    for material_id in payload.ids:
        material = db.get(Material, material_id)
        if material is None:
            skipped += 1
            continue

        material.status_id = next_status.id
        material.status = next_status

        if payload.action == MaterialStatusEnum.PUBLISHED.value:
            material.published_at = datetime.now(timezone.utc)
        elif payload.action == MaterialStatusEnum.REJECTED.value:
            material.published_at = None

        _record_log(
            db,
            material_id=material.id,
            actor_id=current_user.id,
            action=log_action,
            comment=payload.comment,
        )
        updated += 1

    db.commit()

    return BulkModerationResponse(updated=updated, skipped=skipped)
