from enum import Enum

class UserRole(str, Enum):
    STUDENT = "student"
    MODERATOR = "moderator"
    ADMIN = "admin"

