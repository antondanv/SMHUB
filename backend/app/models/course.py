from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
