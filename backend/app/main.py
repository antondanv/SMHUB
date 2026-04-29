from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.users import router as users_router

app = FastAPI(
    title="SMHUB API",
    description="API для системы обмена учебными материалами",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роутер авторизации (/auth/register, /auth/login, /auth/me)
app.include_router(auth_router)

# Роутер профиля пользователя (/users/me)
app.include_router(users_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}