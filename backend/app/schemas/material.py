from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MaterialUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject_id: Optional[int] = None
    material_type_id: Optional[int] = None
    course_id: Optional[int] = None
    program_id: Optional[int] = None


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
    is_favorite: bool = False
    is_liked: bool = False
    avg_rating: float | None = None
    ratings_count: int = 0
    user_rating: int | None = None
    author: MaterialAuthorResponse
    subject: SubjectBriefResponse
    material_type: MaterialTypeBriefResponse
    course: CourseBriefResponse
    program: ProgramBriefResponse


class MaterialPreviewSectionResponse(BaseModel):
    heading: str
    bullets: list[str]


class MaterialPreviewResponse(BaseModel):
    material_id: int
    title: str
    summary: str
    sections: list[MaterialPreviewSectionResponse]
    note: str


class CommentAuthorResponse(BaseModel):
    id: int
    username: str
    full_name: str


class CommentResponse(BaseModel):
    id: int
    material_id: int
    content: str
    created_at: datetime
    updated_at: datetime | None
    author: CommentAuthorResponse
    can_edit: bool = False


class CommentCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class CommentUpdateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class FavoriteToggleResponse(BaseModel):
    material_id: int
    is_favorite: bool
    favorites_count: int


class MaterialListResponse(BaseModel):
    items: list[MaterialSummaryResponse]
    total: int
    page: int
    page_size: int


class HomepageSubjectResponse(BaseModel):
    id: int
    name: str
    materials_count: int


class HomepageResponse(BaseModel):
    audience: str
    latest: list[MaterialSummaryResponse]
    popular: list[MaterialSummaryResponse]
    subjects: list[HomepageSubjectResponse]
    course_materials: list[MaterialSummaryResponse]
    program_materials: list[MaterialSummaryResponse]
    related_materials: list[MaterialSummaryResponse]
    popular_in_course: list[MaterialSummaryResponse]
    rules: list[str]


class ModerationQueueResponse(BaseModel):
    items: list[MaterialSummaryResponse]
    total: int


class ModerationDecisionRequest(BaseModel):
    status: str
