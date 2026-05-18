from datetime import datetime

from pydantic import BaseModel


class MaterialCreateResponse(BaseModel):
    id: int
    title: str
    description: str | None
    author_id: int
    subject_id: int
    material_type_id: int
    course_id: int
    program_id: int
    status: str
    mime_type: str
    file_url: str
    file_name: str
    file_size: int
    views_count: int
    downloads_count: int
    likes_count: int
    comments_count: int
    favorites_count: int
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime | None


class MaterialAuthorResponse(BaseModel):
    id: int
    username: str
    full_name: str


class SubjectBriefResponse(BaseModel):
    id: int
    name: str


class MaterialTypeBriefResponse(BaseModel):
    id: int
    name: str


class CourseBriefResponse(BaseModel):
    id: int
    name: str
    number: int


class ProgramBriefResponse(BaseModel):
    id: int
    name: str
    code: str


class MaterialSummaryResponse(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    mime_type: str
    file_url: str
    file_name: str
    file_size: int
    views_count: int
    downloads_count: int
    likes_count: int
    comments_count: int
    favorites_count: int
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime | None
    author: MaterialAuthorResponse
    subject: SubjectBriefResponse
    material_type: MaterialTypeBriefResponse
    course: CourseBriefResponse
    program: ProgramBriefResponse
