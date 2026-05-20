from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.auth import get_current_user, get_optional_user
from app.api.materials_common import (
    assert_material_is_visible,
    full_name_for_user,
    get_material_or_404,
    is_privileged_user,
)
from app.db.database import get_db
from app.models.comment import Comment
from app.models.user import User
from app.schemas.material import (
    CommentAuthorResponse,
    CommentCreateRequest,
    CommentResponse,
    CommentUpdateRequest,
)


router = APIRouter(tags=["comments"])


def serialize_comment(comment: Comment, current_user: User | None) -> CommentResponse:
    can_edit = current_user is not None and (
        comment.user_id == current_user.id or is_privileged_user(current_user)
    )

    return CommentResponse(
        id=comment.id,
        material_id=comment.material_id,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        can_edit=can_edit,
        author=CommentAuthorResponse(
            id=comment.user.id,
            username=comment.user.username,
            full_name=full_name_for_user(comment.user),
        ),
    )


def get_comment_or_404(db: Session, comment_id: int) -> Comment:
    comment = db.scalar(
        select(Comment)
        .options(joinedload(Comment.user), joinedload(Comment.material))
        .where(Comment.id == comment_id)
    )

    if comment is None or comment.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )

    return comment


@router.get("/materials/{material_id}/comments", response_model=list[CommentResponse])
def list_material_comments(
    material_id: int,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> list[CommentResponse]:
    material = get_material_or_404(db, material_id)
    assert_material_is_visible(material, current_user)

    comments = db.scalars(
        select(Comment)
        .options(joinedload(Comment.user))
        .where(
            Comment.material_id == material.id,
            Comment.is_deleted.is_(False),
        )
        .order_by(Comment.created_at.asc())
    ).all()

    return [serialize_comment(comment, current_user) for comment in comments]


@router.post(
    "/materials/{material_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_material_comment(
    material_id: int,
    payload: CommentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommentResponse:
    material = get_material_or_404(db, material_id)
    assert_material_is_visible(material, current_user)
    normalized_content = payload.content.strip()

    if not normalized_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment content is required",
        )

    comment = Comment(
        material_id=material.id,
        user_id=current_user.id,
        content=normalized_content,
    )
    db.add(comment)
    material.comments_count += 1
    db.commit()
    db.refresh(comment)

    return serialize_comment(comment, current_user)


@router.patch("/comments/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    payload: CommentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommentResponse:
    comment = get_comment_or_404(db, comment_id)

    if comment.user_id != current_user.id and not is_privileged_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this comment",
        )

    normalized_content = payload.content.strip()

    if not normalized_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment content is required",
        )

    comment.content = normalized_content
    db.commit()
    db.refresh(comment)

    return serialize_comment(comment, current_user)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    comment = get_comment_or_404(db, comment_id)

    if comment.user_id != current_user.id and not is_privileged_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this comment",
        )

    comment.is_deleted = True
    comment.material.comments_count = max(comment.material.comments_count - 1, 0)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
