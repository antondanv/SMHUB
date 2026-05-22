from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.security import (
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    validate_password_strength,
)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)

    @field_validator("new_password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        return validate_password_strength(value)


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str

    last_name: str
    first_name: str
    middle_name: str | None

    role_id: int
    is_active: bool

    course_id: int | None
    program_id: int | None
    group_name: str | None


class UserProfileUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=100)

    last_name: str | None = Field(default=None, max_length=255)
    first_name: str | None = Field(default=None, max_length=255)
    middle_name: str | None = Field(default=None, max_length=255)

    course_id: int | None = None
    program_id: int | None = None
    group_name: str | None = Field(default=None, max_length=100)
