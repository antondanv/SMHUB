from datetime import datetime
from typing import List

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    middle_name: Mapped[str] = mapped_column(String(255), nullable=True)
    role_id: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("roles.id"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    course_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
    )
    program_id: Mapped[int] = mapped_column(
        ForeignKey("programs.id", ondelete="SET NULL"),
        nullable=True,
    )
    group_name: Mapped[str] = mapped_column(String(100), nullable=True)
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
    role: Mapped["Role"] = relationship(back_populates="users")
    course: Mapped["Course"] = relationship(back_populates="users")
    program: Mapped["Program"] = relationship(back_populates="users")
    materials: Mapped[List["Material"]] = relationship(back_populates="author")
    comments: Mapped[List["Comment"]] = relationship(back_populates="user")
    likes: Mapped[List["Like"]] = relationship(back_populates="user")
    favorites: Mapped[List["Favorite"]] = relationship(back_populates="user")
    ratings: Mapped[List["Rating"]] = relationship(back_populates="user")
