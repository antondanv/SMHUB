import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base
from backend.app.models.enums import UserRole

if TYPE_CHECKING:
    from backend.app.models.course import Course
    from backend.app.models.program import Program
    from backend.app.models.material import Material
    from backend.app.models.comment import Comment
    from backend.app.models.like import Like
    from backend.app.models.favorite import Favorite
    from backend.app.models.rating import Rating


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    course_id: Mapped[Optional[int]] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"))
    program_id: Mapped[Optional[int]] = mapped_column(ForeignKey("programs.id", ondelete="SET NULL"))
    group_name: Mapped[Optional[str]] = mapped_column(String(50))
    
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    course: Mapped[Optional["Course"]] = relationship()
    program: Mapped[Optional["Program"]] = relationship()
    materials: Mapped[list["Material"]] = relationship(back_populates="author")
    comments: Mapped[list["Comment"]] = relationship(back_populates="user")
    likes: Mapped[list["Like"]] = relationship(back_populates="user")
    favorites: Mapped[list["Favorite"]] = relationship(back_populates="user")
    ratings: Mapped[list["Rating"]] = relationship(back_populates="user")
