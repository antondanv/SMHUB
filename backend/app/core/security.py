from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


def validate_password_strength(password: str) -> str:
    """Проверить пароль по единой политике (длина + буквы и цифры).

    Возвращает сам пароль, чтобы удобно использовать в pydantic-валидаторах.
    Бросает ``ValueError`` с понятным сообщением, если требования не выполнены.
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(
            f"Пароль должен содержать минимум {PASSWORD_MIN_LENGTH} символов"
        )

    if len(password) > PASSWORD_MAX_LENGTH:
        raise ValueError(
            f"Пароль не должен превышать {PASSWORD_MAX_LENGTH} символов"
        )

    if not any(character.isalpha() for character in password):
        raise ValueError("Пароль должен содержать хотя бы одну букву")

    if not any(character.isdigit() for character in password):
        raise ValueError("Пароль должен содержать хотя бы одну цифру")

    return password

def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_context.verify(plain_password, hashed_password)

def create_access_token(subject: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
        )
    payload = {
        "exp": expires_at, 
        "sub": subject
        }
    return jwt.encode(
        payload, 
        settings.secret_key, 
        algorithm=settings.algorithm
        )
    
def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(
            token, 
            settings.secret_key, 
            algorithms=[settings.algorithm]
            )
    except JWTError:
        return None

