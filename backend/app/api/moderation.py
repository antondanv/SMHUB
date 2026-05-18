from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.materials_common import (
    base_material_query,
    get_material_or_404,
    get_status_or_500,
    is_privileged_user,
    serialize_material,
)
from app.db.database import get_db
from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.material import Material
from app.models.user import User
from app.schemas.material import (
    ModerationDecisionRequest,
    ModerationQueueResponse,
    MaterialSummaryResponse,
)


router = APIRouter(prefix="/moderation", tags=["moderation"])


def require_moderation_access(current_user: User) -> None:
    if not is_privileged_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator or admin access is required",
        )


@router.get("/materials", response_model=ModerationQueueResponse)
def list_pending_materials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ModerationQueueResponse:
    require_moderation_access(current_user)

    materials = db.scalars(
        base_material_query()
        .where(Material.status.has(name=MaterialStatusEnum.PENDING.value))
        .order_by(Material.created_at.asc())
    ).unique().all()

    return ModerationQueueResponse(
        items=[serialize_material(material) for material in materials],
        total=len(materials),
    )


@router.patch("/materials/{material_id}", response_model=MaterialSummaryResponse)
def moderate_material(
    material_id: int,
    payload: ModerationDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialSummaryResponse:
    require_moderation_access(current_user)

    material = get_material_or_404(db, material_id)
    next_status = get_status_or_500(
        db,
        MaterialStatusEnum(payload.status),
    )

    material.status_id = next_status.id
    material.status = next_status

    if payload.status == MaterialStatusEnum.PUBLISHED.value:
        material.published_at = datetime.now(timezone.utc)
    elif payload.status == MaterialStatusEnum.REJECTED.value:
        material.published_at = None

    db.commit()
    db.refresh(material)

    return serialize_material(material)
