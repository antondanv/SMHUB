from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.api.auth import get_current_user
from app.api.materials_common import (
    base_material_query,
    serialize_material,
)
from app.models.enums import MaterialStatus as MaterialStatusEnum, UserRole
from app.db.database import get_db
from app.models.featured_item import FeaturedItem
from app.models.material import Material
from app.models.user import User
from app.schemas.material import MaterialSummaryResponse


router = APIRouter(tags=["featured"])


SECTIONS = ("hero", "recommended", "editorial", "seasonal")


class FeaturedItemAdminResponse(BaseModel):
    id: int
    section: str
    material_id: int
    material_title: str
    position: int
    is_active: bool


class FeaturedCreateRequest(BaseModel):
    section: Literal["hero", "recommended", "editorial", "seasonal"]
    material_id: int
    position: Optional[int] = 0
    is_active: Optional[bool] = True


class FeaturedUpdateRequest(BaseModel):
    position: Optional[int] = None
    is_active: Optional[bool] = None


def _require_admin(current_user: User) -> None:
    if current_user is None or current_user.role is None or current_user.role.name != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access is required"
        )


def _is_published_material(material: Material | None) -> bool:
    return (
        material is not None
        and material.status is not None
        and material.status.name == MaterialStatusEnum.PUBLISHED.value
    )


# ──────────────────────────── Public ────────────────────────────

@router.get("/home/featured", response_model=list[MaterialSummaryResponse])
def get_featured(
    section: Literal["hero", "recommended", "editorial", "seasonal"] = Query(...),
    db: Session = Depends(get_db),
) -> list[MaterialSummaryResponse]:
    items = db.scalars(
        select(FeaturedItem)
        .where(FeaturedItem.section == section, FeaturedItem.is_active.is_(True))
        .order_by(FeaturedItem.position.asc(), FeaturedItem.created_at.asc())
    ).all()

    if not items:
        return []

    material_ids = [i.material_id for i in items]
    materials = db.scalars(
        base_material_query().where(
            Material.id.in_(material_ids),
            Material.status.has(name=MaterialStatusEnum.PUBLISHED.value),
        )
    ).unique().all()

    by_id = {m.id: m for m in materials}
    ordered = [by_id[i.material_id] for i in items if i.material_id in by_id]

    return [serialize_material(m) for m in ordered]


# ──────────────────────────── Admin ────────────────────────────

@router.get("/admin/featured", response_model=list[FeaturedItemAdminResponse])
def list_featured_admin(
    section: Optional[Literal["hero", "recommended", "editorial", "seasonal"]] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    stmt = select(FeaturedItem).options(joinedload(FeaturedItem.material))
    if section:
        stmt = stmt.where(FeaturedItem.section == section)
    stmt = stmt.order_by(FeaturedItem.section.asc(), FeaturedItem.position.asc())

    items = db.scalars(stmt).all()

    return [
        FeaturedItemAdminResponse(
            id=i.id,
            section=i.section,
            material_id=i.material_id,
            material_title=i.material.title if i.material else "—",
            position=i.position,
            is_active=i.is_active,
        )
        for i in items
    ]


@router.post("/admin/featured", status_code=201, response_model=FeaturedItemAdminResponse)
def create_featured(
    data: FeaturedCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    material = db.scalar(
        select(Material)
        .options(joinedload(Material.status))
        .where(Material.id == data.material_id)
    )
    if material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    if data.is_active is not False and not _is_published_material(material):
        raise HTTPException(
            status_code=409,
            detail="Only published materials can be activated in public featured sections",
        )

    item = FeaturedItem(
        section=data.section,
        material_id=data.material_id,
        position=data.position or 0,
        is_active=data.is_active if data.is_active is not None else True,
        created_by=current_user.id,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Material is already featured in this section"
        )
    db.refresh(item)

    return FeaturedItemAdminResponse(
        id=item.id,
        section=item.section,
        material_id=item.material_id,
        material_title=material.title,
        position=item.position,
        is_active=item.is_active,
    )


@router.patch("/admin/featured/{item_id}", response_model=FeaturedItemAdminResponse)
def update_featured(
    item_id: int,
    data: FeaturedUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    item = db.scalar(
        select(FeaturedItem)
        .options(joinedload(FeaturedItem.material).joinedload(Material.status))
        .where(FeaturedItem.id == item_id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Featured item not found")

    if data.position is not None:
        item.position = data.position
    if data.is_active is not None:
        if data.is_active and not _is_published_material(item.material):
            raise HTTPException(
                status_code=409,
                detail="Only published materials can be activated in public featured sections",
            )
        item.is_active = data.is_active

    db.commit()
    db.refresh(item)

    return FeaturedItemAdminResponse(
        id=item.id,
        section=item.section,
        material_id=item.material_id,
        material_title=item.material.title if item.material else "—",
        position=item.position,
        is_active=item.is_active,
    )


@router.delete("/admin/featured/{item_id}", status_code=204)
def delete_featured(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    item = db.get(FeaturedItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Featured item not found")
    db.delete(item)
    db.commit()
