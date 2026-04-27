import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, DateTime, Integer, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.material import Material


class Rating(Base):
    __tablename__ = "ratings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False) # e.g., 1 to 5
    
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    material: Mapped["Material"] = relationship(back_populates="ratings")
    user: Mapped["User"] = relationship(back_populates="ratings")

    __table_args__ = (
        UniqueConstraint("user_id", "material_id", name="uq_user_material_rating"),
    )
