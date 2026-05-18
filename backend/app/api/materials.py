from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.auth import get_current_user, get_optional_user
from app.api.materials_common import (
    assert_material_is_visible,
    fetch_favorite_ids,
    get_material_or_404,
    get_status_or_500,
    serialize_material,
)
from app.core.config import BASE_DIR
from app.db.database import get_db
from app.models.course import Course
from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.favorite import Favorite
from app.models.material import Material
from app.models.material_type import MaterialType
from app.models.mime_type import MimeType
from app.models.program import Program
from app.models.subject import Subject
from app.models.user import User
from app.schemas.material import (
    FavoriteToggleResponse,
    MaterialCreateResponse,
    MaterialSummaryResponse,
)


router = APIRouter(prefix="/materials", tags=["materials"])

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
UPLOADS_DIR = BASE_DIR / "uploads" / "materials"


def build_material_create_response(material: Material) -> MaterialCreateResponse:
    return MaterialCreateResponse(
        id=material.id,
        title=material.title,
        description=material.description,
        author_id=material.author_id,
        subject_id=material.subject_id,
        material_type_id=material.material_type_id,
        course_id=material.course_id,
        program_id=material.program_id,
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
    )


def require_entity(db: Session, model: type, entity_id: int, error_message: str):
    entity = db.scalar(select(model).where(model.id == entity_id))

    if entity is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message,
        )

    return entity


def resolve_mime_type(
    db: Session,
    file_name: str,
    content_type: str | None,
) -> MimeType:
    if content_type:
        mime_type = db.scalar(
            select(MimeType).where(MimeType.name == content_type)
        )

        if mime_type is not None:
            return mime_type

    extension = Path(file_name).suffix.lower()

    if extension:
        mime_type = db.scalar(
            select(MimeType).where(MimeType.extension == extension)
        )

        if mime_type is not None:
            return mime_type

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported file type. Allowed formats: PDF, DOC, DOCX, PPT, PPTX.",
    )


@router.post("", response_model=MaterialCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    title: str = Form(..., max_length=255),
    description: str | None = Form(default=None),
    subject_id: int = Form(...),
    material_type_id: int = Form(...),
    course_id: int = Form(...),
    program_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialCreateResponse:
    normalized_title = title.strip()

    if not normalized_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title is required",
        )

    original_file_name = Path(file.filename or "").name

    if not original_file_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is required",
        )

    subject = require_entity(db, Subject, subject_id, "Subject not found")

    if not subject.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject is inactive",
        )

    require_entity(db, MaterialType, material_type_id, "Material type not found")
    require_entity(db, Course, course_id, "Course not found")
    require_entity(db, Program, program_id, "Program not found")

    mime_type = resolve_mime_type(db, original_file_name, file.content_type)
    pending_status = get_status_or_500(db, MaterialStatusEnum.PENDING)

    file_bytes = await file.read()
    file_size = len(file_bytes)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large. Maximum size is 20 MB.",
        )

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    stored_extension = mime_type.extension or Path(original_file_name).suffix.lower()
    stored_file_name = f"{uuid4().hex}{stored_extension}"
    stored_file_path = UPLOADS_DIR / stored_file_name
    stored_file_path.write_bytes(file_bytes)

    material = Material(
        title=normalized_title,
        description=description.strip() if description and description.strip() else None,
        author_id=current_user.id,
        subject_id=subject_id,
        material_type_id=material_type_id,
        course_id=course_id,
        program_id=program_id,
        mime_type_id=mime_type.id,
        status_id=pending_status.id,
        file_url=str(Path("uploads") / "materials" / stored_file_name),
        file_name=original_file_name,
        file_size=file_size,
        views_count=0,
        downloads_count=0,
        likes_count=0,
        comments_count=0,
        favorites_count=0,
    )
    material.mime_type = mime_type
    material.status = pending_status

    db.add(material)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        stored_file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create material",
        ) from exc

    db.refresh(material)

    return build_material_create_response(material)


@router.post("/{material_id}/favorite", response_model=FavoriteToggleResponse)
def add_material_to_favorites(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FavoriteToggleResponse:
    material = get_material_or_404(db, material_id)
    assert_material_is_visible(material, current_user)

    existing_favorite = db.scalar(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.material_id == material.id,
        )
    )

    if existing_favorite is None:
        db.add(Favorite(user_id=current_user.id, material_id=material.id))
        material.favorites_count += 1
        db.commit()
        db.refresh(material)

    return FavoriteToggleResponse(
        material_id=material.id,
        is_favorite=True,
        favorites_count=material.favorites_count,
    )


@router.delete("/{material_id}/favorite", response_model=FavoriteToggleResponse)
def remove_material_from_favorites(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FavoriteToggleResponse:
    material = get_material_or_404(db, material_id)
    assert_material_is_visible(material, current_user)

    existing_favorite = db.scalar(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.material_id == material.id,
        )
    )

    if existing_favorite is not None:
        db.delete(existing_favorite)
        material.favorites_count = max(material.favorites_count - 1, 0)
        db.commit()
        db.refresh(material)

    return FavoriteToggleResponse(
        material_id=material.id,
        is_favorite=False,
        favorites_count=material.favorites_count,
    )


@router.get("/{material_id}/download")
def download_material(
    material_id: int,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    material = get_material_or_404(db, material_id)
    assert_material_is_visible(material, current_user)

    file_path = BASE_DIR / material.file_url

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material file not found",
        )

    material.downloads_count += 1
    db.commit()

    return FileResponse(
        path=file_path,
        filename=material.file_name,
        media_type=material.mime_type.name,
    )


@router.get("/{material_id}", response_model=MaterialSummaryResponse)
def get_material_detail(
    material_id: int,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> MaterialSummaryResponse:
    material = get_material_or_404(db, material_id)
    assert_material_is_visible(material, current_user)

    material.views_count += 1
    db.commit()
    db.refresh(material)

    favorite_ids = set()

    if current_user is not None:
        favorite_ids = fetch_favorite_ids(db, current_user.id, [material.id])

    return serialize_material(
        material,
        is_favorite=material.id in favorite_ids,
    )
