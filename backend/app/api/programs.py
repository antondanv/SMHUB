from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db

router = APIRouter(prefix="/programs", tags=["programs"])


@router.get("")
def get_programs(db: Session = Depends(get_db)):
    from app.models.program import Program
    
    programs = db.query(Program).order_by(Program.name).all()
    return [{"id": p.id, "name": p.name, "code": p.code} for p in programs]