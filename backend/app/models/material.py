from datetime import datetime
from typing import List

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    material_type_id: Mapped[int] = mapped_column(
        ForeignKey("material_types.id"),
        nullable=False,
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id"),
        nullable=False,
    )
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"), nullable=False)
    mime_type_id: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("mime_types.id"),
        nullable=False,
    )
    status_id: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("material_statuses.id"),
        nullable=False,
    )
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    views_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    downloads_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    likes_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comments_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    favorites_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_editorial: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    avg_rating: Mapped[float] = mapped_column(Float, nullable=True)
    ratings_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        server_default=func.now(),
        onupdate=func.now(),
    )

    author: Mapped["User"] = relationship(back_populates="materials")
    subject: Mapped["Subject"] = relationship(back_populates="materials")
    material_type: Mapped["MaterialType"] = relationship(back_populates="materials")
    course: Mapped["Course"] = relationship(back_populates="materials")
    program: Mapped["Program"] = relationship(back_populates="materials")
    mime_type: Mapped["MimeType"] = relationship(back_populates="materials")
    status: Mapped["MaterialStatus"] = relationship(back_populates="materials")
    comments: Mapped[List["Comment"]] = relationship(back_populates="material")
    likes: Mapped[List["Like"]] = relationship(back_populates="material")
    favorites: Mapped[List["Favorite"]] = relationship(back_populates="material")
    ratings: Mapped[List["Rating"]] = relationship(back_populates="material")
