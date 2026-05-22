from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.security import (
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    validate_password_strength,
)


class UserRegister(BaseModel):
    email: str = Field(max_length=255)
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)

    last_name: str = Field(max_length=255)
    first_name: str = Field(max_length=255)
    middle_name: str | None = Field(default=None, max_length=255)

    course_id: int | None = None
    program_id: int | None = None
    group_name: str | None = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        return validate_password_strength(value)


class AdminRegister(UserRegister):
    admin_secret: str = Field(min_length=1, max_length=255)


class UserLogin(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    """Запрос ссылки на сброс пароля по email."""

    email: str = Field(max_length=255)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)

    @field_validator("new_password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        return validate_password_strength(value)


class EmailConfirmRequest(BaseModel):
    token: str = Field(min_length=1, max_length=128)


class ResendConfirmationRequest(BaseModel):
    email: str = Field(max_length=255)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str

    last_name: str
    first_name: str
    middle_name: str | None

    role_id: int
    role_name: str | None
    is_active: bool
    email_confirmed: bool

    course_id: int | None
    program_id: int | None
    group_name: str | None
