from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.courses import router as courses_router
from app.api.material_types import router as material_types_router
from app.api.programs import router as programs_router
from app.api.subjects import router as subjects_router
from app.api.users import router as users_router


app = FastAPI(
    title="SMHUB API",
    description="API для системы обмена учебными материалами",
    version="0.1.0",
    root_path="/api",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(courses_router)
app.include_router(programs_router)
app.include_router(subjects_router)
app.include_router(material_types_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
