import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.events import record_event
from app.core.config import settings
from app.core.security import create_access_token, decode_access_token
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AdminRegister,
    AuthUserResponse,
    ForgotPasswordRequest,
    Token,
    UserLogin,
    UserRegister,
)
from app.services.auth_service import (
    authenticate_user,
    create_user,
    create_user_with_role,
    reset_password_by_identity,
)


router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
        
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
        
    user = db.scalar(
        select(User).options(joinedload(User.role)).where(User.id == int(user_id)),
    )
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )
    
    return user


def get_optional_user(
    token: str | None = Depends(optional_oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if not token:
        return None

    payload = decode_access_token(token)

    if payload is None:
        return None

    user_id = payload.get("sub")

    if user_id is None:
        return None

    user = db.scalar(
        select(User).options(joinedload(User.role)).where(User.id == int(user_id)),
    )

    if user is None or not user.is_active:
        return None

    return user


@router.post("/register", response_model=AuthUserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserRegister,
    db: Session = Depends(get_db),
) -> User:
    try:
        new_user = create_user(db, user_data)
        record_event(db, "register", user_id=new_user.id)
        db.commit()
        return new_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/admin/register", response_model=AuthUserResponse, status_code=status.HTTP_201_CREATED)
def register_admin(
    user_data: AdminRegister,
    db: Session = Depends(get_db),
) -> User:
    if not settings.admin_registration_secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin registration is not available",
        )

    if not secrets.compare_digest(user_data.admin_secret, settings.admin_registration_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin registration secret",
        )

    try:
        new_user = create_user_with_role(
            db,
            UserRegister(**user_data.model_dump(exclude={"admin_secret"})),
            "admin",
        )
        record_event(db, "register", user_id=new_user.id)
        db.commit()
        return new_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db),
) -> Token:
    user = authenticate_user(db, login_data)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = create_access_token(subject=str(user.id))
    record_event(db, "login", user_id=user.id)
    db.commit()
    return Token(access_token=access_token)


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    reset_ok = reset_password_by_identity(
        db,
        email=payload.email,
        username=payload.username,
        last_name=payload.last_name,
        first_name=payload.first_name,
        new_password=payload.new_password,
    )

    if not reset_ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Данные не совпадают ни с одним аккаунтом. Проверьте email, имя пользователя и ФИО.",
        )

    return {"detail": "Пароль успешно изменён. Теперь можно войти с новым паролем."}


@router.get("/me", response_model=AuthUserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user
