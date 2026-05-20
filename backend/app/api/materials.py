from __future__ import annotations

from pathlib import Path
from typing import Optional
from urllib.parse import quote
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.auth import get_current_user, get_optional_user
from app.api.events import record_event
from app.api.materials_common import (
    assert_material_is_visible,
    base_material_query,
    fetch_favorite_ids,
    get_material_or_404,
    get_status_or_500,
    is_privileged_user,
    serialize_material,
)
from app.schemas.material import LikeToggleResponse
from app.core.config import BASE_DIR
from app.db.database import get_db
from app.models.course import Course
from app.models.enums import MaterialStatus as MaterialStatusEnum, UserRole
from app.models.favorite import Favorite
from app.models.like import Like
from app.models.material import Material
from app.models.material_status import MaterialStatus
from app.models.material_type import MaterialType
from app.models.mime_type import MimeType
from app.models.program import Program
from app.models.rating import Rating
from app.models.subject import Subject
from app.models.user import User
from app.schemas.material import (
    FavoriteToggleResponse,
    MaterialCreateResponse,
    MaterialPreviewResponse,
    MaterialPreviewSectionResponse,
    MaterialSummaryResponse,
    MaterialUpdateRequest,
)
from app.services.material_preview import (
    build_preview_from_paragraphs,
    extract_docx_paragraphs,
    load_preview_sidecar,
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


def require_can_edit_material(material: Material, current_user: User) -> None:
    is_owner = material.author_id == current_user.id
    if not (is_owner or is_privileged_user(current_user)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
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


def _refresh_material_rating(material: Material, db: Session) -> None:
    result = db.execute(
        select(func.avg(Rating.value), func.count(Rating.id)).where(
            Rating.material_id == material.id
        )
    ).fetchone()
    material.avg_rating = round(float(result[0]), 2) if result[0] else None
    material.ratings_count = result[1]


def _resolve_user_flags(
    db: Session,
    material: Material,
    current_user: User | None,
) -> tuple[bool, bool, int | None]:
    if current_user is None:
        return False, False, None

    is_favorite = material.id in fetch_favorite_ids(db, current_user.id, [material.id])
    is_liked = db.scalar(
        select(Like.id).where(
            Like.material_id == material.id,
            Like.user_id == current_user.id,
        )
    ) is not None
    rating_row = db.scalar(
        select(Rating).where(
            Rating.material_id == material.id,
            Rating.user_id == current_user.id,
        )
    )
    user_rating = rating_row.value if rating_row else None
    return is_favorite, is_liked, user_rating


def _build_preview_response(material: Material) -> MaterialPreviewResponse | None:
    file_path = BASE_DIR / material.file_url
    preview = load_preview_sidecar(file_path)
    if preview is None and material.file_name.lower().endswith(".docx"):
        preview = build_preview_from_paragraphs(
            extract_docx_paragraphs(file_path),
            material.title,
        )
    if preview is None:
        return None

    return MaterialPreviewResponse(
        material_id=material.id,
        title=preview["title"],
        summary=preview["summary"],
        sections=[
            MaterialPreviewSectionResponse(
                heading=section["heading"],
                bullets=section["bullets"],
            )
            for section in preview["sections"]
        ],
        note=preview["note"],
    )


def _build_content_disposition(file_name: str, disposition_type: str) -> str:
    suffix = Path(file_name).suffix or ".bin"
    ascii_stem = Path(file_name).stem.encode("ascii", "ignore").decode("ascii")
    ascii_stem = "".join(
        char
        for char in ascii_stem
        if char.isalnum() or char in {" ", "_", "-"}
    )
    ascii_stem = " ".join(ascii_stem.split()).strip(" .-_")
    ascii_name = f"{ascii_stem or 'material'}{suffix}"
    ascii_name = ascii_name.replace("\\", "\\\\").replace('"', '\\"')
    return (
        f'{disposition_type}; filename="{ascii_name}"; '
        f"filename*=UTF-8''{quote(file_name)}"
    )


@router.get("")
def list_materials(
    search: Optional[str] = Query(None, min_length=1),
    subject_id: Optional[int] = Query(None),
    material_type_id: Optional[int] = Query(None),
    course_id: Optional[int] = Query(None),
    program_id: Optional[int] = Query(None),
    sort: Optional[str] = Query(None, pattern="^(new|popular)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    published_status = get_status_or_500(db, MaterialStatusEnum.PUBLISHED)

    stmt = base_material_query().where(Material.status_id == published_status.id)

    if search:
        stmt = stmt.where(Material.title.ilike(f"%{search}%"))
    if subject_id:
        stmt = stmt.where(Material.subject_id == subject_id)
    if material_type_id:
        stmt = stmt.where(Material.material_type_id == material_type_id)
    if course_id:
        stmt = stmt.where(Material.course_id == course_id)
    if program_id:
        stmt = stmt.where(Material.program_id == program_id)

    if sort == "popular":
        stmt = stmt.order_by(
            Material.downloads_count.desc(),
            Material.views_count.desc(),
        )
    else:
        stmt = stmt.order_by(Material.created_at.desc())

    count_stmt = select(func.count()).select_from(
        select(Material.id).where(stmt.whereclause).subquery()
    )
    total = db.scalar(count_stmt) or 0

    materials = db.scalars(stmt.offset((page - 1) * per_page).limit(per_page)).unique().all()

    material_ids = [m.id for m in materials]
    favorite_ids: set[int] = set()
    if current_user is not None and material_ids:
        favorite_ids = fetch_favorite_ids(db, current_user.id, material_ids)

    return {
        "items": [
            serialize_material(m, is_favorite=m.id in favorite_ids)
            for m in materials
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.get("/me")
def list_my_materials(
    status_name: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = base_material_query().where(Material.author_id == current_user.id)

    if status_name:
        status_row = db.scalar(
            select(MaterialStatus).where(MaterialStatus.name == status_name)
        )
        if status_row:
            stmt = stmt.where(Material.status_id == status_row.id)

    stmt = stmt.order_by(Material.created_at.desc())

    count_stmt = select(func.count(Material.id)).where(
        Material.author_id == current_user.id
    )
    if status_name:
        status_row = db.scalar(
            select(MaterialStatus).where(MaterialStatus.name == status_name)
        )
        if status_row:
            count_stmt = count_stmt.where(Material.status_id == status_row.id)
    total = db.scalar(count_stmt) or 0

    materials = db.scalars(stmt.offset((page - 1) * per_page).limit(per_page)).unique().all()

    return {
        "items": [serialize_material(m) for m in materials],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.post("", response_model=MaterialCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    title: str = Form(..., max_length=255),
    description: str | None = Form(default=None),
    subject_id: int = Form(...),
    material_type_id: int = Form(...),
    course_id: int = Form(...),
    program_id: int = Form(...),
    is_editorial: bool = Form(False),
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

    if is_editorial and not is_privileged_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can publish editorial materials",
        )

    mime_type = resolve_mime_type(db, original_file_name, file.content_type)

    if is_editorial:
        initial_status = get_status_or_500(db, MaterialStatusEnum.PUBLISHED)
    else:
        initial_status = get_status_or_500(db, MaterialStatusEnum.PENDING)

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
        status_id=initial_status.id,
        is_editorial=is_editorial,
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
    material.status = initial_status

    db.add(material)
    record_event(db, "material_upload", user_id=current_user.id)

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


@router.post("/{material_id}/like", response_model=LikeToggleResponse)
def like_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LikeToggleResponse:
    material = get_material_or_404(db, material_id)

    already_liked = db.scalar(
        select(Like).where(
            Like.material_id == material_id,
            Like.user_id == current_user.id,
        )
    )
    if already_liked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already liked",
        )

    db.add(Like(user_id=current_user.id, material_id=material_id))
    material.likes_count += 1
    record_event(db, "material_like", user_id=current_user.id, entity_id=material_id)

    existing_favorite = db.scalar(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.material_id == material_id,
        )
    )
    if existing_favorite is None:
        db.add(Favorite(user_id=current_user.id, material_id=material_id))
        material.favorites_count += 1

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to like",
        ) from exc

    return LikeToggleResponse(
        likes_count=material.likes_count,
        is_liked=True,
        is_favorite=True,
        favorites_count=material.favorites_count,
    )


@router.delete("/{material_id}/like", response_model=LikeToggleResponse)
def unlike_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LikeToggleResponse:
    material = get_material_or_404(db, material_id)

    like = db.scalar(
        select(Like).where(
            Like.material_id == material_id,
            Like.user_id == current_user.id,
        )
    )
    if like is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not liked",
        )

    db.delete(like)
    material.likes_count = max(0, material.likes_count - 1)

    existing_favorite = db.scalar(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.material_id == material_id,
        )
    )
    if existing_favorite is not None:
        db.delete(existing_favorite)
        material.favorites_count = max(0, material.favorites_count - 1)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unlike",
        ) from exc

    return LikeToggleResponse(
        likes_count=material.likes_count,
        is_liked=False,
        is_favorite=False,
        favorites_count=material.favorites_count,
    )


@router.post("/{material_id}/rating")
def rate_material(
    material_id: int,
    value: int = Query(..., ge=1, le=5),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = get_material_or_404(db, material_id)

    existing = db.scalar(
        select(Rating).where(
            Rating.material_id == material_id,
            Rating.user_id == current_user.id,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already rated. Use PATCH to update.",
        )

    db.add(Rating(user_id=current_user.id, material_id=material_id, value=value))
    db.flush()
    _refresh_material_rating(material, db)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to rate",
        ) from exc

    return {
        "avg_rating": material.avg_rating,
        "ratings_count": material.ratings_count,
        "user_rating": value,
    }


@router.patch("/{material_id}/rating")
def update_rating(
    material_id: int,
    value: int = Query(..., ge=1, le=5),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = get_material_or_404(db, material_id)

    existing = db.scalar(
        select(Rating).where(
            Rating.material_id == material_id,
            Rating.user_id == current_user.id,
        )
    )
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No rating to update. Use POST first.",
        )

    existing.value = value
    _refresh_material_rating(material, db)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update rating",
        ) from exc

    return {
        "avg_rating": material.avg_rating,
        "ratings_count": material.ratings_count,
        "user_rating": value,
    }


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
    record_event(db, "material_download", user_id=current_user.id if current_user else None, entity_id=material_id)
    db.commit()

    return FileResponse(
        path=file_path,
        media_type=material.mime_type.name,
        headers={
            "Content-Disposition": _build_content_disposition(
                material.file_name,
                "attachment",
            )
        },
    )


@router.get("/{material_id}/file")
def view_material_file(
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

    return FileResponse(
        path=file_path,
        media_type=material.mime_type.name,
        headers={
            "Content-Disposition": _build_content_disposition(
                material.file_name,
                "inline",
            )
        },
    )


@router.get("/{material_id}/preview", response_model=MaterialPreviewResponse | None)
def get_material_preview(
    material_id: int,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> MaterialPreviewResponse | None:
    material = get_material_or_404(db, material_id)
    assert_material_is_visible(material, current_user)
    return _build_preview_response(material)


@router.get("/{material_id}", response_model=MaterialSummaryResponse)
def get_material_detail(
    material_id: int,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> MaterialSummaryResponse:
    material = get_material_or_404(db, material_id)
    assert_material_is_visible(material, current_user)

    material.views_count += 1
    record_event(db, "material_view", user_id=current_user.id if current_user else None, entity_id=material_id)
    db.commit()
    db.refresh(material)

    is_favorite, is_liked, user_rating = _resolve_user_flags(db, material, current_user)

    return serialize_material(
        material,
        is_favorite=is_favorite,
        is_liked=is_liked,
        user_rating=user_rating,
    )


@router.patch("/{material_id}", response_model=MaterialSummaryResponse)
def update_material(
    material_id: int,
    data: MaterialUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialSummaryResponse:
    material = get_material_or_404(db, material_id)
    require_can_edit_material(material, current_user)

    if data.title is not None:
        normalized = data.title.strip()
        if not normalized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Title cannot be empty",
            )
        material.title = normalized

    if data.description is not None:
        material.description = data.description.strip() or None

    if data.subject_id is not None:
        require_entity(db, Subject, data.subject_id, "Subject not found")
        material.subject_id = data.subject_id

    if data.material_type_id is not None:
        require_entity(db, MaterialType, data.material_type_id, "Material type not found")
        material.material_type_id = data.material_type_id

    if data.course_id is not None:
        require_entity(db, Course, data.course_id, "Course not found")
        material.course_id = data.course_id

    if data.program_id is not None:
        require_entity(db, Program, data.program_id, "Program not found")
        material.program_id = data.program_id

    if data.is_editorial is not None:
        if not is_privileged_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin can change editorial flag",
            )
        material.is_editorial = data.is_editorial

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update material",
        ) from exc

    db.refresh(material)
    is_favorite, is_liked, user_rating = _resolve_user_flags(db, material, current_user)
    return serialize_material(
        material,
        is_favorite=is_favorite,
        is_liked=is_liked,
        user_rating=user_rating,
    )


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = get_material_or_404(db, material_id)
    require_can_edit_material(material, current_user)

    file_path = BASE_DIR / material.file_url
    preview_sidecar_path = file_path.with_suffix(file_path.suffix + ".preview.json")

    try:
        db.delete(material)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete material",
        ) from exc

    file_path.unlink(missing_ok=True)
    preview_sidecar_path.unlink(missing_ok=True)
