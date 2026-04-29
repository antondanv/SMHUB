from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
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


def get_student_role(db: Session) -> Role:
    role = db.scalar(
        select(Role).where(Role.name == DEFAULT_USER_ROLE)
    )
    
    if role is None:
        raise ValueError("Student role not found")

    return role

def create_user(db: Session, user_data: UserRegister) -> User:
    if get_user_by_email(db, user_data.email) is not None:
        raise ValueError("Email already exists")
    
    if get_user_by_username(db, user_data.username) is not None:
        raise ValueError("Username already exists")
    
    student_role = get_student_role(db)
    
    user = User(
        email=user_data.email.strip().lower(),
        username=user_data.username.strip(),
        
        hashed_password=hash_password(user_data.password),

        last_name=user_data.last_name.strip(),
        first_name=user_data.first_name.strip(),
        middle_name=user_data.middle_name.strip() if user_data.middle_name else None,
        
        role_id=student_role.id,
        is_active=True,
        
        course_id=user_data.course_id,
        program_id=user_data.program_id,
        group_name=user_data.group_name.strip() if user_data.group_name else None,
    )
    
    db.add(user)
    db.commit()
    
    db.refresh(user)
    
    return user

def authenticate_user(db: Session, login_data: UserLogin) -> User | None:
    user = get_user_by_email(db, login_data.email)
    
    if user is None:
        return None
    
    if not verify_password(login_data.password, user.hashed_password):
        return None
    
    if not user.is_active:
        return None
    
    return user
