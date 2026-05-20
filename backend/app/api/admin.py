from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.auth import get_current_user
from app.api.materials_common import full_name_for_user, is_privileged_user
from app.db.database import get_db
from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.material import Material
from app.models.material_status import MaterialStatus
from app.models.role import Role
from app.models.user import User


router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User) -> None:
    if not is_privileged_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required",
        )


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
