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
