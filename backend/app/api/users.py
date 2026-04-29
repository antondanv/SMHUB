from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.course import Course
from app.models.program import Program
from app.models.user import User
from app.schemas.user import UserProfileResponse, UserProfileUpdate
from app.services.auth_service import get_user_by_username


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user


@router.patch("/me", response_model=UserProfileResponse)
def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    update_data = profile_data.model_dump(exclude_unset=True)

    if "username" in update_data and update_data["username"] is not None:
        new_username = update_data["username"].strip()
        existing_user = get_user_by_username(db, new_username)

        if existing_user is not None and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

        current_user.username = new_username

    if "last_name" in update_data and update_data["last_name"] is not None:
        current_user.last_name = update_data["last_name"].strip()

    if "first_name" in update_data and update_data["first_name"] is not None:
        current_user.first_name = update_data["first_name"].strip()

    if "middle_name" in update_data:
        current_user.middle_name = (
            update_data["middle_name"].strip()
            if update_data["middle_name"]
            else None
        )

    if "course_id" in update_data:
        course_id = update_data["course_id"]

        if course_id is not None:
            course = db.scalar(select(Course).where(Course.id == course_id))

            if course is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Course not found",
                )

        current_user.course_id = course_id

    if "program_id" in update_data:
        program_id = update_data["program_id"]

        if program_id is not None:
            program = db.scalar(select(Program).where(Program.id == program_id))

            if program is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Program not found",
                )

        current_user.program_id = program_id

    if "group_name" in update_data:
        current_user.group_name = (
            update_data["group_name"].strip()
            if update_data["group_name"]
            else None
        )

    db.commit()
    db.refresh(current_user)

    return current_user
