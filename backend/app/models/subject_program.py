from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SubjectProgram(Base):
    __tablename__ = "subject_programs"
    __table_args__ = (
        UniqueConstraint(
            "subject_id",
            "program_id",
            "course_id",
            name="uq_subject_program_course",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
    )
    program_id: Mapped[int] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    subject: Mapped["Subject"] = relationship(back_populates="subject_programs")
    program: Mapped["Program"] = relationship(back_populates="subject_programs")
    course: Mapped["Course"] = relationship(back_populates="subject_programs")
