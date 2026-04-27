from typing import List

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    users: Mapped[List["User"]] = relationship(back_populates="course")
    subject_programs: Mapped[List["SubjectProgram"]] = relationship(
        back_populates="course"
    )
    materials: Mapped[List["Material"]] = relationship(back_populates="course")
