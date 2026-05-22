from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import cast, delete as sa_delete, func, select, Date
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.api.auth import get_current_user
from app.api.materials_common import full_name_for_user, is_privileged_user
from app.db.database import get_db
from app.services import audit_log
from app.models.comment import Comment
from app.models.course import Course
from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.favorite import Favorite
from app.models.like import Like
from app.models.material import Material
from app.models.material_status import MaterialStatus
from app.models.material_type import MaterialType
from app.models.program import Program
from app.models.rating import Rating
from app.models.role import Role
from app.models.subject import Subject
from app.models.user import User
from app.models.user_event import UserEvent


BASE_DIR = Path(__file__).resolve().parents[2]

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
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)

    user = db.scalar(select(User).options(joinedload(User.role)).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    before_role = user.role.name if user.role else None
    before_active = user.is_active

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

    after_role = user.role.name if user.role else None
    after_active = user.is_active

    if before_role != after_role:
        audit_log.record(
            db,
            actor_id=current_user.id,
            action="user.role.change",
            target_type="user",
            target_id=user.id,
            payload={"before": before_role, "after": after_role, "username": user.username},
            request=request,
        )
    if before_active != after_active:
        audit_log.record(
            db,
            actor_id=current_user.id,
            action="user.active.change",
            target_type="user",
            target_id=user.id,
            payload={"before": before_active, "after": after_active, "username": user.username},
            request=request,
        )

    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role.name if user.role else "—",
        "is_active": user.is_active,
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)

    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нельзя удалить собственный аккаунт",
        )

    user = db.scalar(select(User).options(joinedload(User.role)).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Не даём удалить последнего администратора, иначе систему некому будет вести.
    if user.role and user.role.name == "admin":
        admin_count = db.scalar(
            select(func.count())
            .select_from(User)
            .join(Role, Role.id == User.role_id)
            .where(Role.name == "admin")
        ) or 0
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Нельзя удалить последнего администратора",
            )

    # Материалы пользователя удаляем каскадом вместе с чужими реакциями на них.
    materials = db.scalars(select(Material).where(Material.author_id == user_id)).all()
    material_ids = [material.id for material in materials]
    file_paths = [BASE_DIR / material.file_url for material in materials]

    username = user.username
    user_email = user.email

    try:
        if material_ids:
            db.execute(sa_delete(Comment).where(Comment.material_id.in_(material_ids)))
            db.execute(sa_delete(Like).where(Like.material_id.in_(material_ids)))
            db.execute(sa_delete(Favorite).where(Favorite.material_id.in_(material_ids)))
            db.execute(sa_delete(Rating).where(Rating.material_id.in_(material_ids)))
            # featured_items и moderation_log на материалы каскадятся на уровне БД.
            db.execute(sa_delete(Material).where(Material.id.in_(material_ids)))

        # Собственные реакции пользователя на чужие материалы.
        db.execute(sa_delete(Comment).where(Comment.user_id == user_id))
        db.execute(sa_delete(Like).where(Like.user_id == user_id))
        db.execute(sa_delete(Favorite).where(Favorite.user_id == user_id))
        db.execute(sa_delete(Rating).where(Rating.user_id == user_id))

        # Ссылки в user_events / audit_log / moderation_log / reports / featured_items
        # обнуляются автоматически (ondelete=SET NULL).
        audit_log.record(
            db,
            actor_id=current_user.id,
            action="user.delete",
            target_type="user",
            target_id=user_id,
            payload={
                "username": username,
                "email": user_email,
                "materials_deleted": len(material_ids),
            },
            request=request,
        )

        db.delete(user)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user",
        ) from exc

    # Чистим файлы материалов уже после успешной транзакции. На read-only ФС
    # (Vercel) unlink может бросить OSError — это не должно ронять ответ.
    for file_path in file_paths:
        try:
            file_path.unlink(missing_ok=True)
            sidecar = file_path.with_suffix(file_path.suffix + ".preview.json")
            sidecar.unlink(missing_ok=True)
        except OSError:
            pass


def _check_material_count(db: Session, field, value: int) -> int:
    return db.scalar(select(func.count()).select_from(Material).where(field == value)) or 0


# ──────────────────────────── Subjects ────────────────────────────

class SubjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class SubjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.post("/subjects", status_code=201)
def create_subject(
    data: SubjectCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    subject = Subject(name=data.name.strip(), description=data.description)
    db.add(subject)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subject already exists")
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.subject.create",
        target_type="subject",
        target_id=subject.id,
        payload={"after": {"name": subject.name, "description": subject.description}},
        request=request,
    )
    db.commit()
    db.refresh(subject)
    return {"id": subject.id, "name": subject.name, "description": subject.description}


@router.patch("/subjects/{subject_id}")
def update_subject(
    subject_id: int,
    data: SubjectUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    before = {"name": subject.name, "description": subject.description}
    if data.name is not None:
        subject.name = data.name.strip()
    if data.description is not None:
        subject.description = data.description
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Subject name already exists")
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.subject.update",
        target_type="subject",
        target_id=subject.id,
        payload={"before": before, "after": {"name": subject.name, "description": subject.description}},
        request=request,
    )
    db.commit()
    db.refresh(subject)
    return {"id": subject.id, "name": subject.name, "description": subject.description}


@router.delete("/subjects/{subject_id}", status_code=204)
def delete_subject(
    subject_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    count = _check_material_count(db, Material.subject_id, subject_id)
    if count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {count} material(s) reference this subject",
        )
    subject.is_active = False
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.subject.delete",
        target_type="subject",
        target_id=subject.id,
        payload={"before": {"name": subject.name, "description": subject.description}},
        request=request,
    )
    db.commit()


# ──────────────────────────── Material Types ────────────────────────────

class MaterialTypeCreateRequest(BaseModel):
    name: str


class MaterialTypeUpdateRequest(BaseModel):
    name: Optional[str] = None


@router.post("/material_types", status_code=201)
def create_material_type(
    data: MaterialTypeCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    mt = MaterialType(name=data.name.strip())
    db.add(mt)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Material type already exists")
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.material_type.create",
        target_type="material_type",
        target_id=mt.id,
        payload={"after": {"name": mt.name}},
        request=request,
    )
    db.commit()
    db.refresh(mt)
    return {"id": mt.id, "name": mt.name}


@router.patch("/material_types/{mt_id}")
def update_material_type(
    mt_id: int,
    data: MaterialTypeUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    mt = db.get(MaterialType, mt_id)
    if mt is None:
        raise HTTPException(status_code=404, detail="Material type not found")
    before = {"name": mt.name}
    if data.name is not None:
        mt.name = data.name.strip()
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Material type name already exists")
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.material_type.update",
        target_type="material_type",
        target_id=mt.id,
        payload={"before": before, "after": {"name": mt.name}},
        request=request,
    )
    db.commit()
    db.refresh(mt)
    return {"id": mt.id, "name": mt.name}


@router.delete("/material_types/{mt_id}", status_code=204)
def delete_material_type(
    mt_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    mt = db.get(MaterialType, mt_id)
    if mt is None:
        raise HTTPException(status_code=404, detail="Material type not found")
    count = _check_material_count(db, Material.material_type_id, mt_id)
    if count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {count} material(s) reference this type",
        )
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.material_type.delete",
        target_type="material_type",
        target_id=mt.id,
        payload={"before": {"name": mt.name}},
        request=request,
    )
    db.delete(mt)
    db.commit()


# ──────────────────────────── Courses ────────────────────────────

class CourseCreateRequest(BaseModel):
    name: str
    number: int


class CourseUpdateRequest(BaseModel):
    name: Optional[str] = None
    number: Optional[int] = None


@router.post("/courses", status_code=201)
def create_course(
    data: CourseCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    course = Course(name=data.name.strip(), number=data.number)
    db.add(course)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Course already exists")
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.course.create",
        target_type="course",
        target_id=course.id,
        payload={"after": {"name": course.name, "number": course.number}},
        request=request,
    )
    db.commit()
    db.refresh(course)
    return {"id": course.id, "name": course.name, "number": course.number}


@router.patch("/courses/{course_id}")
def update_course(
    course_id: int,
    data: CourseUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    before = {"name": course.name, "number": course.number}
    if data.name is not None:
        course.name = data.name.strip()
    if data.number is not None:
        course.number = data.number
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Course already exists")
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.course.update",
        target_type="course",
        target_id=course.id,
        payload={"before": before, "after": {"name": course.name, "number": course.number}},
        request=request,
    )
    db.commit()
    db.refresh(course)
    return {"id": course.id, "name": course.name, "number": course.number}


@router.delete("/courses/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    count = _check_material_count(db, Material.course_id, course_id)
    if count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {count} material(s) reference this course",
        )
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.course.delete",
        target_type="course",
        target_id=course.id,
        payload={"before": {"name": course.name, "number": course.number}},
        request=request,
    )
    db.delete(course)
    db.commit()


# ──────────────────────────── Programs ────────────────────────────

class ProgramCreateRequest(BaseModel):
    name: str
    code: str
    description: Optional[str] = None


class ProgramUpdateRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None


@router.post("/programs", status_code=201)
def create_program(
    data: ProgramCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    program = Program(name=data.name.strip(), code=data.code.strip(), description=data.description)
    db.add(program)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Program already exists")
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.program.create",
        target_type="program",
        target_id=program.id,
        payload={"after": {"name": program.name, "code": program.code, "description": program.description}},
        request=request,
    )
    db.commit()
    db.refresh(program)
    return {"id": program.id, "name": program.name, "code": program.code}


@router.patch("/programs/{program_id}")
def update_program(
    program_id: int,
    data: ProgramUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    program = db.get(Program, program_id)
    if program is None:
        raise HTTPException(status_code=404, detail="Program not found")
    before = {"name": program.name, "code": program.code, "description": program.description}
    if data.name is not None:
        program.name = data.name.strip()
    if data.code is not None:
        program.code = data.code.strip()
    if data.description is not None:
        program.description = data.description
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Program already exists")
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.program.update",
        target_type="program",
        target_id=program.id,
        payload={"before": before, "after": {"name": program.name, "code": program.code, "description": program.description}},
        request=request,
    )
    db.commit()
    db.refresh(program)
    return {"id": program.id, "name": program.name, "code": program.code}


@router.delete("/programs/{program_id}", status_code=204)
def delete_program(
    program_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    program = db.get(Program, program_id)
    if program is None:
        raise HTTPException(status_code=404, detail="Program not found")
    count = _check_material_count(db, Material.program_id, program_id)
    if count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {count} material(s) reference this program",
        )
    audit_log.record(
        db,
        actor_id=current_user.id,
        action="reference.program.delete",
        target_type="program",
        target_id=program.id,
        payload={"before": {"name": program.name, "code": program.code, "description": program.description}},
        request=request,
    )
    db.delete(program)
    db.commit()
