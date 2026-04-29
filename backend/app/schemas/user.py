from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    course_id: Optional[int] = None
    program_id: Optional[int] = None
    group_name: Optional[str] = None


class UserResponse(UserBase):
    id: int
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    role_id: int
    is_active: bool
    course_id: Optional[int] = None
    program_id: Optional[int] = None
    group_name: Optional[str] = None

    class Config:
        from_attributes = True


class UserProfileResponse(UserResponse):
    pass