from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.auth import get_current_user
from app.api.materials_common import full_name_for_user, is_privileged_user
from app.db.database import get_db
from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.material import Material
from app.models.material_status import MaterialStatus
from app.models.user import User


router = APIRouter(prefix="/admin", tags=["admin"])


class TopMaterialItem(BaseModel):
    id: int
    title: str
    views: int
    author: str


class TopAuthorItem(BaseModel):
    user_id: int
    username: str
    full_name: str
    materials_count: int


class DashboardSummaryResponse(BaseModel):
    users_total: int
    users_new_last_7d: int
    users_active: int
    materials_total: int
    materials_pending_count: int
    materials_rejected_count: int
    views_total: int
    downloads_total: int
    likes_total: int
    top_materials: list[TopMaterialItem]
    top_authors: list[TopAuthorItem]


def require_admin(current_user: User) -> None:
    if not is_privileged_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required",
        )


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardSummaryResponse:
    require_admin(current_user)

    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    users_total = db.scalar(select(func.count()).select_from(User)) or 0
    users_new_last_7d = (
        db.scalar(
            select(func.count()).select_from(User).where(User.created_at >= seven_days_ago)
        )
        or 0
    )
    users_active = (
        db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True)))
        or 0
    )

    pending_status = db.scalar(
        select(MaterialStatus).where(MaterialStatus.name == MaterialStatusEnum.PENDING.value)
    )
    rejected_status = db.scalar(
        select(MaterialStatus).where(MaterialStatus.name == MaterialStatusEnum.REJECTED.value)
    )

    materials_total = db.scalar(select(func.count()).select_from(Material)) or 0
    materials_pending_count = (
        db.scalar(
            select(func.count())
            .select_from(Material)
            .where(Material.status_id == pending_status.id if pending_status else False)
        )
        or 0
    )
    materials_rejected_count = (
        db.scalar(
            select(func.count())
            .select_from(Material)
            .where(Material.status_id == rejected_status.id if rejected_status else False)
        )
        or 0
    )

    views_total = db.scalar(select(func.sum(Material.views_count))) or 0
    downloads_total = db.scalar(select(func.sum(Material.downloads_count))) or 0
    likes_total = db.scalar(select(func.sum(Material.likes_count))) or 0

    top_materials_rows = db.execute(
        select(Material)
        .options(joinedload(Material.author))
        .order_by(Material.views_count.desc())
        .limit(10)
    ).scalars().all()

    top_materials = [
        TopMaterialItem(
            id=m.id,
            title=m.title,
            views=m.views_count,
            author=full_name_for_user(m.author) if m.author else "—",
        )
        for m in top_materials_rows
    ]

    top_authors_rows = db.execute(
        select(User, func.count(Material.id).label("cnt"))
        .join(Material, Material.author_id == User.id)
        .group_by(User.id)
        .order_by(func.count(Material.id).desc())
        .limit(10)
    ).all()

    top_authors = [
        TopAuthorItem(
            user_id=row.User.id,
            username=row.User.username,
            full_name=full_name_for_user(row.User),
            materials_count=row.cnt,
        )
        for row in top_authors_rows
    ]

    return DashboardSummaryResponse(
        users_total=users_total,
        users_new_last_7d=users_new_last_7d,
        users_active=users_active,
        materials_total=materials_total,
        materials_pending_count=materials_pending_count,
        materials_rejected_count=materials_rejected_count,
        views_total=views_total,
        downloads_total=downloads_total,
        likes_total=likes_total,
        top_materials=top_materials,
        top_authors=top_authors,
    )
