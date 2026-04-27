from typing import List

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    users: Mapped[List["User"]] = relationship(back_populates="program")
    subject_programs: Mapped[List["SubjectProgram"]] = relationship(
        back_populates="program"
    )
    materials: Mapped[List["Material"]] = relationship(back_populates="program")
