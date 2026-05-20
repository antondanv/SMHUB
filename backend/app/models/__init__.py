"""SQLAlchemy models package."""

from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.enums import UserRole as UserRoleEnum
from app.models.course import Course
from app.models.material_status import MaterialStatus
from app.models.program import Program
from app.models.role import Role
from app.models.subject import Subject
from app.models.subject_program import SubjectProgram
from app.models.user import User
from app.models.material_type import MaterialType
from app.models.mime_type import MimeType
from app.models.material import Material
from app.models.comment import Comment
from app.models.like import Like
from app.models.favorite import Favorite
from app.models.featured_item import FeaturedItem
from app.models.rating import Rating

__all__ = [
    "UserRoleEnum",
    "MaterialStatusEnum",
    "Course",
    "Program",
    "Subject",
    "SubjectProgram",
    "Role",
    "User",
    "MaterialType",
    "MaterialStatus",
    "MimeType",
    "Material",
    "Comment",
    "Like",
    "Favorite",
    "Rating",
    "FeaturedItem",
]
