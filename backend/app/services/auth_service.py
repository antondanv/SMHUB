from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.course import Course
from app.models.program import Program
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import UserLogin, UserRegister


DEFAULT_USER_ROLE = "student"


def get_user_by_email(db: Session, email: str) -> User | None:
    normalized_email = email.strip().lower()
    
    return db.scalar(
        select(User).where(User.email == normalized_email)
    )
    

def get_user_by_username(db: Session, username: str) -> User | None:
    normalized_username = username.strip().lower()
    
    return db.scalar(
        select(User).where(User.username == normalized_username)
    )


def get_role(db: Session, name: str) -> Role:
    role = db.scalar(
        select(Role).where(Role.name == name)
    )
    
    if role is None:
        raise ValueError(f"Role '{name}' not found")

    return role


def validate_course_id(db: Session, course_id: int | None) -> None:
    if course_id is None:
        return

    course_exists = db.scalar(
        select(Course.id).where(Course.id == course_id)
    )

    if course_exists is None:
        raise ValueError("Course not found")


def validate_program_id(db: Session, program_id: int | None) -> None:
    if program_id is None:
        return

    program_exists = db.scalar(
        select(Program.id).where(Program.id == program_id)
    )

    if program_exists is None:
        raise ValueError("Program not found")


def create_user_with_role(
    db: Session,
    user_data: UserRegister,
    role_name: str,
) -> User:
    if get_user_by_email(db, user_data.email) is not None:
        raise ValueError("Email already exists")
    
    if get_user_by_username(db, user_data.username) is not None:
        raise ValueError("Username already exists")

    validate_course_id(db, user_data.course_id)
    validate_program_id(db, user_data.program_id)
    
    role = get_role(db, role_name)
    
    user = User(
        email=user_data.email.strip().lower(),
        username=user_data.username.strip(),
        
        hashed_password=hash_password(user_data.password),

        last_name=user_data.last_name.strip(),
        first_name=user_data.first_name.strip(),
        middle_name=user_data.middle_name.strip() if user_data.middle_name else None,
        
        role_id=role.id,
        is_active=True,
        
        course_id=user_data.course_id,
        program_id=user_data.program_id,
        group_name=user_data.group_name.strip() if user_data.group_name else None,
    )
    
    db.add(user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError("Failed to create user") from exc
    
    db.refresh(user)
    
    return user


def create_user(db: Session, user_data: UserRegister) -> User:
    return create_user_with_role(db, user_data, DEFAULT_USER_ROLE)

def authenticate_user(db: Session, login_data: UserLogin) -> User | None:
    user = get_user_by_email(db, login_data.email)
    
    if user is None:
        return None
    
    if not verify_password(login_data.password, user.hashed_password):
        return None
    
    if not user.is_active:
        return None
    
    return user
