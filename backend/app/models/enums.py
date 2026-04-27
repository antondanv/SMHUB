from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    MODERATOR = "moderator"
    ADMIN = "admin"


class MaterialStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    PUBLISHED = "published"
    REJECTED = "rejected"
    ARCHIVED = "archived"
