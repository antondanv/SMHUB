from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import users, courses, programs

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

app.include_router(users.router)
app.include_router(courses.router)
app.include_router(programs.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}