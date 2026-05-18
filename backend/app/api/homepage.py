from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.auth import get_optional_user
from app.api.materials_common import (
    base_material_query,
    fetch_favorite_ids,
    serialize_material,
)
from app.db.database import get_db
from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.material import Material
from app.models.subject import Subject
from app.models.user import User
from app.schemas.material import HomepageResponse, HomepageSubjectResponse


router = APIRouter(prefix="/homepage", tags=["homepage"])

SECTION_LIMIT = 6


def material_popularity_score():
    return (
        Material.downloads_count
        + Material.likes_count
        + Material.comments_count
        + Material.favorites_count
    )


def load_materials(
    db: Session,
    *,
    filters: list,
    order_by: tuple,
    limit: int = SECTION_LIMIT,
) -> list[Material]:
    return db.scalars(
        base_material_query()
        .where(*filters)
        .order_by(*order_by)
        .limit(limit)
    ).unique().all()


@router.get("", response_model=HomepageResponse)
def get_homepage(
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> HomepageResponse:
    published_filters = [Material.status.has(name=MaterialStatusEnum.PUBLISHED.value)]

    latest = load_materials(
        db,
        filters=published_filters,
        order_by=(Material.published_at.desc(), Material.created_at.desc()),
    )
    popular = load_materials(
        db,
        filters=published_filters,
        order_by=(
            material_popularity_score().desc(),
            Material.downloads_count.desc(),
            Material.created_at.desc(),
        ),
    )
    subject_rows = db.execute(
        select(
            Subject.id,
            Subject.name,
            func.count(Material.id).label("materials_count"),
        )
        .join(Material, Material.subject_id == Subject.id)
        .where(*published_filters)
        .group_by(Subject.id, Subject.name)
        .order_by(func.count(Material.id).desc(), Subject.name.asc())
        .limit(SECTION_LIMIT)
    ).all()

    course_materials: list[Material] = []
    program_materials: list[Material] = []
    related_materials: list[Material] = []
    popular_in_course: list[Material] = []
    rules = [
        "Гостю показываются последние и популярные опубликованные материалы, а также самые наполненные предметы.",
    ]

    if current_user is not None:
        if current_user.course_id is not None:
            course_materials = load_materials(
                db,
                filters=[*published_filters, Material.course_id == current_user.course_id],
                order_by=(Material.published_at.desc(), Material.created_at.desc()),
            )
            popular_in_course = load_materials(
                db,
                filters=[*published_filters, Material.course_id == current_user.course_id],
                order_by=(
                    material_popularity_score().desc(),
                    Material.downloads_count.desc(),
                    Material.created_at.desc(),
                ),
            )

        if current_user.program_id is not None:
            program_materials = load_materials(
                db,
                filters=[*published_filters, Material.program_id == current_user.program_id],
                order_by=(Material.published_at.desc(), Material.created_at.desc()),
            )

        if current_user.course_id is not None and current_user.program_id is not None:
            related_materials = load_materials(
                db,
                filters=[
                    *published_filters,
                    Material.course_id == current_user.course_id,
                    Material.program_id == current_user.program_id,
                ],
                order_by=(Material.published_at.desc(), Material.created_at.desc()),
            )

        rules.extend(
            [
                "Авторизованному пользователю дополнительно показываются материалы его курса и направления.",
                "Блок related_materials строится по совпадению курса и направления пользователя.",
                "Блок popular_in_course показывает самые популярные материалы среди того же курса.",
            ]
        )

    all_materials = (
        latest
        + popular
        + course_materials
        + program_materials
        + related_materials
        + popular_in_course
    )
    favorite_ids = set()

    if current_user is not None:
        favorite_ids = fetch_favorite_ids(
            db,
            current_user.id,
            [material.id for material in all_materials],
        )

    return HomepageResponse(
        audience="authenticated" if current_user is not None else "guest",
        latest=[
            serialize_material(material, is_favorite=material.id in favorite_ids)
            for material in latest
        ],
        popular=[
            serialize_material(material, is_favorite=material.id in favorite_ids)
            for material in popular
        ],
        subjects=[
            HomepageSubjectResponse(
                id=row.id,
                name=row.name,
                materials_count=row.materials_count,
            )
            for row in subject_rows
        ],
        course_materials=[
            serialize_material(material, is_favorite=material.id in favorite_ids)
            for material in course_materials
        ],
        program_materials=[
            serialize_material(material, is_favorite=material.id in favorite_ids)
            for material in program_materials
        ],
        related_materials=[
            serialize_material(material, is_favorite=material.id in favorite_ids)
            for material in related_materials
        ],
        popular_in_course=[
            serialize_material(material, is_favorite=material.id in favorite_ids)
            for material in popular_in_course
        ],
        rules=rules,
    )
