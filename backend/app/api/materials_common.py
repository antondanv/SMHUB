from __future__ import annotations

from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.enums import UserRole
from app.models.favorite import Favorite
from app.models.like import Like
from app.models.material import Material
from app.models.material_status import MaterialStatus
from app.models.user import User
from app.schemas.material import (
    CourseBriefResponse,
    MaterialAuthorResponse,
    MaterialSummaryResponse,
    MaterialTypeBriefResponse,
    ProgramBriefResponse,
    SubjectBriefResponse,
)


ROLE_NAMES_WITH_EXTENDED_ACCESS = {
    UserRole.ADMIN.value,
}

ROLES_PUBLISHING_WITHOUT_MODERATION = {
    UserRole.ADMIN.value,
    UserRole.TEACHER.value,
}


def full_name_for_user(user: User) -> str:
    parts = [user.last_name, user.first_name, user.middle_name]
    return " ".join(part for part in parts if part)


def is_privileged_user(user: User | None) -> bool:
    if user is None or user.role is None:
        return False

    return user.role.name in ROLE_NAMES_WITH_EXTENDED_ACCESS


def can_publish_without_moderation(user: User | None) -> bool:
    if user is None or user.role is None:
        return False

    return user.role.name in ROLES_PUBLISHING_WITHOUT_MODERATION


def can_access_hidden_material(user: User | None, material: Material) -> bool:
    if user is None:
        return False

    return is_privileged_user(user) or material.author_id == user.id


def assert_material_is_visible(material: Material, user: User | None) -> None:
    if material.status.name == MaterialStatusEnum.PUBLISHED.value:
        return

    if can_access_hidden_material(user, material):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this material",
    )


def base_material_query() -> Select[tuple[Material]]:
    return select(Material).options(
        joinedload(Material.author),
        joinedload(Material.subject),
        joinedload(Material.material_type),
        joinedload(Material.course),
        joinedload(Material.program),
        joinedload(Material.mime_type),
        joinedload(Material.status),
    )


def get_material_or_404(db: Session, material_id: int) -> Material:
    material = db.scalar(base_material_query().where(Material.id == material_id))

    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )

    return material


def get_status_or_500(db: Session, status_name: MaterialStatusEnum) -> MaterialStatus:
    material_status = db.scalar(
        select(MaterialStatus).where(MaterialStatus.name == status_name.value)
    )

    if material_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Material status "{status_name.value}" is not configured',
        )

    return material_status


def fetch_like_ids(
    db: Session,
    user_id: int,
    material_ids: Sequence[int],
) -> set[int]:
    if not material_ids:
        return set()

    like_rows = db.scalars(
        select(Like.material_id).where(
            Like.user_id == user_id,
            Like.material_id.in_(material_ids),
        )
    ).all()

    return set(like_rows)


def fetch_favorite_ids(
    db: Session,
    user_id: int,
    material_ids: Sequence[int],
) -> set[int]:
    if not material_ids:
        return set()

    favorite_rows = db.scalars(
        select(Favorite.material_id).where(
            Favorite.user_id == user_id,
            Favorite.material_id.in_(material_ids),
        )
    ).all()

    return set(favorite_rows)


def serialize_material(
    material: Material,
    *,
    is_favorite: bool = False,
    is_liked: bool = False,
    user_rating: int | None = None,
) -> MaterialSummaryResponse:
    return MaterialSummaryResponse(
        id=material.id,
        title=material.title,
        description=material.description,
        status=material.status.name,
        mime_type=material.mime_type.name,
        file_url=material.file_url,
        file_name=material.file_name,
        file_size=material.file_size,
        views_count=material.views_count,
        downloads_count=material.downloads_count,
        likes_count=material.likes_count,
        comments_count=material.comments_count,
        favorites_count=material.favorites_count,
        published_at=material.published_at,
        created_at=material.created_at,
        updated_at=material.updated_at,
        is_editorial=material.is_editorial,
        is_favorite=is_favorite,
        is_liked=is_liked,
        avg_rating=material.avg_rating,
        ratings_count=material.ratings_count,
        user_rating=user_rating,
        author=MaterialAuthorResponse(
            id=material.author.id,
            username=material.author.username,
            full_name=full_name_for_user(material.author),
        ),
        subject=SubjectBriefResponse(
            id=material.subject.id,
            name=material.subject.name,
        ),
        material_type=MaterialTypeBriefResponse(
            id=material.material_type.id,
            name=material.material_type.name,
        ),
        course=CourseBriefResponse(
            id=material.course.id,
            name=material.course.name,
            number=material.course.number,
        ),
        program=ProgramBriefResponse(
            id=material.program.id,
            name=material.program.name,
            code=material.program.code,
        ),
    )
