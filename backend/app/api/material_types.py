from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db

router = APIRouter(prefix="/material-types", tags=["material_types"])


@router.get("")
def get_material_types(db: Session = Depends(get_db)):
    from app.models.material_type import MaterialType

    material_types = db.query(MaterialType).order_by(MaterialType.name).all()
    return [{"id": mt.id, "name": mt.name} for mt in material_types]
