from pydantic import BaseModel, ConfigDict, Field


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
