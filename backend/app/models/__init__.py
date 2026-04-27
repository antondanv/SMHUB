"""SQLAlchemy models package."""

from app.models.enums import MaterialStatus, UserRole
from app.models.course import Course
from app.models.program import Program
from app.models.subject import Subject
from app.models.subject_program import SubjectProgram
from app.models.user import User
from app.models.material_type import MaterialType
from app.models.material import Material
from app.models.comment import Comment
from app.models.like import Like
from app.models.favorite import Favorite
from app.models.rating import Rating

__all__ = [
    "UserRole",
    "MaterialStatus",
    "Course",
    "Program",
    "Subject",
    "SubjectProgram",
    "User",
    "MaterialType",
    "Material",
    "Comment",
    "Like",
    "Favorite",
    "Rating",
]
