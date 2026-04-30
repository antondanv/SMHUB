from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("")
def get_courses(db: Session = Depends(get_db)):
    from app.models.course import Course

    courses = db.query(Course).order_by(Course.number).all()
    return [{"id": c.id, "name": c.name, "number": c.number} for c in courses]
