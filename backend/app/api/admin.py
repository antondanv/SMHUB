from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.materials_common import is_privileged_user
from app.db.database import get_db
from app.models.course import Course
from app.models.material import Material
from app.models.material_type import MaterialType
from app.models.program import Program
from app.models.subject import Subject
from app.models.user import User


router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User) -> None:
    if not is_privileged_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required",
        )


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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    subject = Subject(name=data.name.strip(), description=data.description)
    db.add(subject)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subject already exists")
    db.refresh(subject)
    return {"id": subject.id, "name": subject.name, "description": subject.description}


@router.patch("/subjects/{subject_id}")
def update_subject(
    subject_id: int,
    data: SubjectUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    if data.name is not None:
        subject.name = data.name.strip()
    if data.description is not None:
        subject.description = data.description
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Subject name already exists")
    db.refresh(subject)
    return {"id": subject.id, "name": subject.name, "description": subject.description}


@router.delete("/subjects/{subject_id}", status_code=204)
def delete_subject(
    subject_id: int,
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
    db.commit()


# ──────────────────────────── Material Types ────────────────────────────

class MaterialTypeCreateRequest(BaseModel):
    name: str


class MaterialTypeUpdateRequest(BaseModel):
    name: Optional[str] = None


@router.post("/material_types", status_code=201)
def create_material_type(
    data: MaterialTypeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    mt = MaterialType(name=data.name.strip())
    db.add(mt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Material type already exists")
    db.refresh(mt)
    return {"id": mt.id, "name": mt.name}


@router.patch("/material_types/{mt_id}")
def update_material_type(
    mt_id: int,
    data: MaterialTypeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    mt = db.get(MaterialType, mt_id)
    if mt is None:
        raise HTTPException(status_code=404, detail="Material type not found")
    if data.name is not None:
        mt.name = data.name.strip()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Material type name already exists")
    db.refresh(mt)
    return {"id": mt.id, "name": mt.name}


@router.delete("/material_types/{mt_id}", status_code=204)
def delete_material_type(
    mt_id: int,
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    course = Course(name=data.name.strip(), number=data.number)
    db.add(course)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Course already exists")
    db.refresh(course)
    return {"id": course.id, "name": course.name, "number": course.number}


@router.patch("/courses/{course_id}")
def update_course(
    course_id: int,
    data: CourseUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    if data.name is not None:
        course.name = data.name.strip()
    if data.number is not None:
        course.number = data.number
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Course already exists")
    db.refresh(course)
    return {"id": course.id, "name": course.name, "number": course.number}


@router.delete("/courses/{course_id}", status_code=204)
def delete_course(
    course_id: int,
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    program = Program(name=data.name.strip(), code=data.code.strip(), description=data.description)
    db.add(program)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Program already exists")
    db.refresh(program)
    return {"id": program.id, "name": program.name, "code": program.code}


@router.patch("/programs/{program_id}")
def update_program(
    program_id: int,
    data: ProgramUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    program = db.get(Program, program_id)
    if program is None:
        raise HTTPException(status_code=404, detail="Program not found")
    if data.name is not None:
        program.name = data.name.strip()
    if data.code is not None:
        program.code = data.code.strip()
    if data.description is not None:
        program.description = data.description
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Program already exists")
    db.refresh(program)
    return {"id": program.id, "name": program.name, "code": program.code}


@router.delete("/programs/{program_id}", status_code=204)
def delete_program(
    program_id: int,
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
    db.delete(program)
    db.commit()
