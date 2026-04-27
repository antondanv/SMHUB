import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String, Integer, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base
from backend.app.models.enums import MaterialStatus

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.subject import Subject
    from backend.app.models.material_type import MaterialType
    from backend.app.models.course import Course
    from backend.app.models.program import Program
    from backend.app.models.comment import Comment
    from backend.app.models.like import Like
    from backend.app.models.favorite import Favorite
    from backend.app.models.rating import Rating


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000))
    
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    material_type_id: Mapped[int] = mapped_column(ForeignKey("material_types.id", ondelete="SET NULL"), nullable=True)
    course_id: Mapped[Optional[int]] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"))
    program_id: Mapped[Optional[int]] = mapped_column(ForeignKey("programs.id", ondelete="SET NULL"))
    
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    
    status: Mapped[MaterialStatus] = mapped_column(
        Enum(MaterialStatus), default=MaterialStatus.PENDING, nullable=False
    )
    
    views_count: Mapped[int] = mapped_column(Integer, default=0)
    downloads_count: Mapped[int] = mapped_column(Integer, default=0)
    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    comments_count: Mapped[int] = mapped_column(Integer, default=0)
    favorites_count: Mapped[int] = mapped_column(Integer, default=0)
    
    published_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    author: Mapped["User"] = relationship(back_populates="materials")
    subject: Mapped["Subject"] = relationship(back_populates="materials")
    material_type: Mapped["MaterialType"] = relationship(back_populates="materials")
    course: Mapped["Course"] = relationship()
    program: Mapped["Program"] = relationship()
    
    comments: Mapped[list["Comment"]] = relationship(back_populates="material", cascade="all, delete-orphan")
    likes: Mapped[list["Like"]] = relationship(back_populates="material", cascade="all, delete-orphan")
    favorites: Mapped[list["Favorite"]] = relationship(back_populates="material", cascade="all, delete-orphan")
    ratings: Mapped[list["Rating"]] = relationship(back_populates="material", cascade="all, delete-orphan")
