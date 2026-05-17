from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("")
def get_subjects(db: Session = Depends(get_db)):
    from app.models.subject import Subject

    subjects = db.query(Subject).filter(Subject.is_active == True).order_by(Subject.name).all()
    return [{"id": s.id, "name": s.name, "description": s.description} for s in subjects]
