from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import cast, func, select, Date
from sqlalchemy.orm import Session, joinedload

from app.api.auth import get_current_user
from app.api.materials_common import full_name_for_user, is_privileged_user
from app.db.database import get_db
from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.material import Material
from app.models.material_status import MaterialStatus
from app.models.role import Role
from app.models.user import User
from app.models.user_event import UserEvent


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


class TimeseriesPoint(BaseModel):
    date: str
    count: int


class TimeseriesResponse(BaseModel):
    metric: str
    period: str
    data: list[TimeseriesPoint]


def require_admin(current_user: User) -> None:
    if not is_privileged_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required",
        )


PERIOD_DAYS: dict[str, int] = {"7d": 7, "30d": 30, "90d": 90}

METRIC_TO_EVENT: dict[str, str] = {
    "visits": "material_view",
    "downloads": "material_download",
    "likes": "material_like",
    "registrations": "register",
    "uploads": "material_upload",
    "logins": "login",
}


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

    top_materials_rows = (
        db.execute(
            select(Material)
            .options(joinedload(Material.author))
            .order_by(Material.views_count.desc())
            .limit(10)
        )
        .scalars()
        .all()
    )

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


@router.get("/dashboard/timeseries", response_model=TimeseriesResponse)
def get_dashboard_timeseries(
    metric: Literal["visits", "downloads", "likes", "registrations", "uploads", "logins"] = Query("visits"),
    period: Literal["7d", "30d", "90d"] = Query("7d"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TimeseriesResponse:
    require_admin(current_user)

    days = PERIOD_DAYS[period]
    event_type = METRIC_TO_EVENT[metric]
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = db.execute(
        select(
            cast(UserEvent.created_at, Date).label("day"),
            func.count().label("cnt"),
        )
        .where(UserEvent.event_type == event_type, UserEvent.created_at >= since)
        .group_by(cast(UserEvent.created_at, Date))
        .order_by(cast(UserEvent.created_at, Date))
    ).all()

    counts_by_day: dict[str, int] = {str(row.day): row.cnt for row in rows}

    data = []
    for i in range(days):
        day = (since + timedelta(days=i + 1)).date()
        day_str = str(day)
        data.append(TimeseriesPoint(date=day_str, count=counts_by_day.get(day_str, 0)))

    return TimeseriesResponse(metric=metric, period=period, data=data)


# ──────────────────────────── Users ────────────────────────────

class UserListItem(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    materials_count: int
    created_at: str


class UserListResponse(BaseModel):
    items: list[UserListItem]
    total: int
    page: int
    total_pages: int


class UserDetailResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: str
    materials_total: int
    materials_pending: int
    materials_published: int
    materials_rejected: int


class UserUpdateRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/users", response_model=UserListResponse)
def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserListResponse:
    require_admin(current_user)

    stmt = select(User).options(joinedload(User.role))

    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            (User.email.ilike(like)) | (User.username.ilike(like))
        )
    if role:
        stmt = stmt.join(Role, User.role_id == Role.id).where(Role.name == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))

    total = len(db.scalars(stmt).all())
    offset = (page - 1) * per_page
    users = db.scalars(stmt.order_by(User.created_at.desc()).offset(offset).limit(per_page)).all()

    mat_counts = {
        row[0]: row[1]
        for row in db.execute(
            select(Material.author_id, func.count(Material.id)).group_by(Material.author_id)
        ).all()
    }

    items = [
        UserListItem(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=full_name_for_user(u),
            role=u.role.name if u.role else "—",
            is_active=u.is_active,
            materials_count=mat_counts.get(u.id, 0),
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]

    return UserListResponse(
        items=items,
        total=total,
        page=page,
        total_pages=max(1, (total + per_page - 1) // per_page),
    )


@router.get("/users/{user_id}", response_model=UserDetailResponse)
def get_user_detail(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserDetailResponse:
    require_admin(current_user)

    user = db.scalar(select(User).options(joinedload(User.role)).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    def count_by_status(status_name: str) -> int:
        st = db.scalar(select(MaterialStatus).where(MaterialStatus.name == status_name))
        if st is None:
            return 0
        return db.scalar(
            select(func.count()).select_from(Material).where(
                Material.author_id == user_id,
                Material.status_id == st.id,
            )
        ) or 0

    return UserDetailResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=full_name_for_user(user),
        role=user.role.name if user.role else "—",
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
        materials_total=db.scalar(
            select(func.count()).select_from(Material).where(Material.author_id == user_id)
        ) or 0,
        materials_pending=count_by_status(MaterialStatusEnum.PENDING.value),
        materials_published=count_by_status(MaterialStatusEnum.PUBLISHED.value),
        materials_rejected=count_by_status(MaterialStatusEnum.REJECTED.value),
    )


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)

    user = db.scalar(select(User).options(joinedload(User.role)).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if data.role is not None:
        if user_id == current_user.id and data.role != (current_user.role.name if current_user.role else None):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change your own role",
            )
        role = db.scalar(select(Role).where(Role.name == data.role))
        if role is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not found")
        user.role_id = role.id
        user.role = role

    if data.is_active is not None:
        if user_id == current_user.id and not data.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot deactivate your own account",
            )
        user.is_active = data.is_active

    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role.name if user.role else "—",
        "is_active": user.is_active,
    }
