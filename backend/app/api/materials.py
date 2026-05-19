from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.security import decode_access_token
from app.core.config import BASE_DIR
from app.db.database import get_db
from app.models.course import Course
from app.models.enums import MaterialStatus as MaterialStatusEnum, UserRole
from app.models.like import Like
from app.models.rating import Rating
from app.models.material import Material
from app.models.material_status import MaterialStatus
from app.models.material_type import MaterialType
from app.models.mime_type import MimeType
from app.models.program import Program
from app.models.subject import Subject
from app.models.user import User
from app.schemas.material import MaterialCreateResponse, MaterialUpdateRequest


router = APIRouter(prefix="/materials", tags=["materials"])
_optional_bearer = HTTPBearer(auto_error=False)


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    return db.scalar(select(User).where(User.id == int(user_id)))

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
UPLOADS_DIR = BASE_DIR / "uploads" / "materials"


def build_material_response(material: Material) -> MaterialCreateResponse:
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


def build_material_detail(material: Material, is_liked: bool = False, user_rating: Optional[int] = None) -> dict:
    return {
        "id": material.id,
        "title": material.title,
        "description": material.description,
        "author_id": material.author_id,
        "author": {"id": material.author.id, "full_name": material.author.full_name} if material.author else None,
        "subject_id": material.subject_id,
        "subject": {"id": material.subject.id, "name": material.subject.name} if material.subject else None,
        "material_type_id": material.material_type_id,
        "material_type": {"id": material.material_type.id, "name": material.material_type.name} if material.material_type else None,
        "course_id": material.course_id,
        "course": {"id": material.course.id, "name": material.course.name} if material.course else None,
        "program_id": material.program_id,
        "program": {"id": material.program.id, "name": material.program.name} if material.program else None,
        "status": material.status.name,
        "mime_type": material.mime_type.name,
        "file_name": material.file_name,
        "file_size": material.file_size,
        "views_count": material.views_count,
        "downloads_count": material.downloads_count,
        "likes_count": material.likes_count,
        "comments_count": material.comments_count,
        "favorites_count": material.favorites_count,
        "published_at": material.published_at.isoformat() if material.published_at else None,
        "created_at": material.created_at.isoformat() if material.created_at else None,
        "updated_at": material.updated_at.isoformat() if material.updated_at else None,
        "is_liked": is_liked,
        "avg_rating": material.avg_rating,
        "ratings_count": material.ratings_count,
        "user_rating": user_rating,
    }


def require_can_edit_material(material: Material, current_user: User) -> None:
    is_owner = material.author_id == current_user.id
    is_privileged = current_user.role.name in (UserRole.ADMIN.value, UserRole.MODERATOR.value)
    if not (is_owner or is_privileged):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


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


@router.get("")
def get_materials(
    search: Optional[str] = Query(None, min_length=1),
    subject_id: Optional[int] = Query(None),
    material_type_id: Optional[int] = Query(None),
    course_id: Optional[int] = Query(None),
    program_id: Optional[int] = Query(None),
    sort: Optional[str] = Query(None, pattern="^(new|popular)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    status_subquery = (
        db.query(MaterialStatus)
        .filter(MaterialStatus.name == "published")
        .subquery()
    )

    query = db.query(Material).filter(
        Material.status_id == status_subquery.c.id
    )

    if search:
        query = query.filter(Material.title.ilike(f"%{search}%"))
    if subject_id:
        query = query.filter(Material.subject_id == subject_id)
    if material_type_id:
        query = query.filter(Material.material_type_id == material_type_id)
    if course_id:
        query = query.filter(Material.course_id == course_id)
    if program_id:
        query = query.filter(Material.program_id == program_id)

    if sort == "popular":
        query = query.order_by(Material.downloads_count.desc(), Material.views_count.desc())
    else:
        query = query.order_by(Material.created_at.desc())

    total = db.query(func.count()).select_from(query.subquery()).scalar()
    materials = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [
            {
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "subject": {"id": m.subject.id, "name": m.subject.name} if m.subject else None,
                "material_type": {"id": m.material_type.id, "name": m.material_type.name} if m.material_type else None,
                "course": {"id": m.course.id, "name": m.course.name} if m.course else None,
                "program": {"id": m.program.id, "name": m.program.name} if m.program else None,
                "author": {"id": m.author.id, "full_name": m.author.full_name} if m.author else None,
                "file_name": m.file_name,
                "file_size": m.file_size,
                "views_count": m.views_count,
                "downloads_count": m.downloads_count,
                "likes_count": m.likes_count,
                "comments_count": m.comments_count,
                "avg_rating": m.avg_rating,
                "ratings_count": m.ratings_count,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in materials
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.get("/{material_id}")
def get_material(
    material_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    material = db.scalar(select(Material).where(Material.id == material_id))
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    is_liked = False
    user_rating = None
    if current_user:
        is_liked = db.scalar(
            select(Like).where(Like.material_id == material_id, Like.user_id == current_user.id)
        ) is not None
        rating_row = db.scalar(
            select(Rating).where(Rating.material_id == material_id, Rating.user_id == current_user.id)
        )
        user_rating = rating_row.value if rating_row else None
    return build_material_detail(material, is_liked=is_liked, user_rating=user_rating)


@router.patch("/{material_id}")
def update_material(
    material_id: int,
    data: MaterialUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = db.scalar(select(Material).where(Material.id == material_id))
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    require_can_edit_material(material, current_user)

    if data.title is not None:
        normalized = data.title.strip()
        if not normalized:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title cannot be empty")
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

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update material") from exc

    db.refresh(material)
    return build_material_detail(material)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = db.scalar(select(Material).where(Material.id == material_id))
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    require_can_edit_material(material, current_user)

    file_path = BASE_DIR / material.file_url

    try:
        db.delete(material)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete material") from exc

    file_path.unlink(missing_ok=True)


@router.post("/{material_id}/like")
def like_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = db.scalar(select(Material).where(Material.id == material_id))
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    already_liked = db.scalar(
        select(Like).where(Like.material_id == material_id, Like.user_id == current_user.id)
    )
    if already_liked:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already liked")

    db.add(Like(user_id=current_user.id, material_id=material_id))
    material.likes_count += 1

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to like") from exc

    return {"likes_count": material.likes_count, "is_liked": True}


@router.delete("/{material_id}/like")
def unlike_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = db.scalar(select(Material).where(Material.id == material_id))
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    like = db.scalar(
        select(Like).where(Like.material_id == material_id, Like.user_id == current_user.id)
    )
    if like is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not liked")

    db.delete(like)
    material.likes_count = max(0, material.likes_count - 1)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to unlike") from exc

    return {"likes_count": material.likes_count, "is_liked": False}


def _refresh_material_rating(material: Material, db: Session) -> None:
    result = db.execute(
        select(func.avg(Rating.value), func.count(Rating.id)).where(Rating.material_id == material.id)
    ).fetchone()
    material.avg_rating = round(float(result[0]), 2) if result[0] else None
    material.ratings_count = result[1]


@router.post("/{material_id}/rating")
def rate_material(
    material_id: int,
    value: int = Query(..., ge=1, le=5),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = db.scalar(select(Material).where(Material.id == material_id))
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    existing = db.scalar(
        select(Rating).where(Rating.material_id == material_id, Rating.user_id == current_user.id)
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already rated. Use PATCH to update.")

    db.add(Rating(user_id=current_user.id, material_id=material_id, value=value))
    db.flush()
    _refresh_material_rating(material, db)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to rate") from exc

    return {"avg_rating": material.avg_rating, "ratings_count": material.ratings_count, "user_rating": value}


@router.patch("/{material_id}/rating")
def update_rating(
    material_id: int,
    value: int = Query(..., ge=1, le=5),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = db.scalar(select(Material).where(Material.id == material_id))
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    existing = db.scalar(
        select(Rating).where(Rating.material_id == material_id, Rating.user_id == current_user.id)
    )
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No rating to update. Use POST first.")

    existing.value = value
    _refresh_material_rating(material, db)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update rating") from exc

    return {"avg_rating": material.avg_rating, "ratings_count": material.ratings_count, "user_rating": value}


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
    pending_status = db.scalar(
        select(MaterialStatus).where(
            MaterialStatus.name == MaterialStatusEnum.PENDING.value
        )
    )

    if pending_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Pending status is not configured",
        )

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

    return build_material_response(material)
