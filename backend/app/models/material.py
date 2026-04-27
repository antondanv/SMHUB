from datetime import datetime
from typing import List

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import MaterialStatus


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    material_type_id: Mapped[int] = mapped_column(
        ForeignKey("material_types.id"), nullable=True
    )
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"), nullable=True)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=True)
    status: Mapped[MaterialStatus] = mapped_column(
        Enum(
            MaterialStatus,
            name="material_status",
            values_callable=lambda enum_class: [item.value for item in enum_class],
        ),
        nullable=False,
        default=MaterialStatus.PENDING,
    )
    views_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    downloads_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    likes_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comments_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    favorites_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    author: Mapped["User"] = relationship(back_populates="materials")
    subject: Mapped["Subject"] = relationship(back_populates="materials")
    material_type: Mapped["MaterialType"] = relationship(back_populates="materials")
    course: Mapped["Course"] = relationship(back_populates="materials")
    program: Mapped["Program"] = relationship(back_populates="materials")
    comments: Mapped[List["Comment"]] = relationship(back_populates="material")
    likes: Mapped[List["Like"]] = relationship(back_populates="material")
    favorites: Mapped[List["Favorite"]] = relationship(back_populates="material")
    ratings: Mapped[List["Rating"]] = relationship(back_populates="material")
