# Agent Instructions

High-signal guidance for working in the SMHUB repository.

## Commands

### Backend (from root)
- **Setup:** `python -m venv .venv && pip install -r backend/requirements.txt`
- **Run:** `uvicorn app.main:app --reload --app-dir backend`
- **Migrations:** `./.venv/bin/alembic -c backend/alembic.ini upgrade head`
- **Generate Migration:** `./.venv/bin/alembic -c backend/alembic.ini revision --autogenerate -m "description"`
- **Seed:** `cd backend && ../.venv/bin/python -m app.db.seed`

### Frontend (from `frontend/`)
- **Setup:** `npm install`
- **Run:** `npm run dev`
- **Lint:** `npm run lint`

## Architecture & Conventions

- **Structure:** Monorepo. Backend is FastAPI (`backend/app/`), Frontend is React/Vite (`frontend/src/`).
- **Sources of Truth:**
  - `docs/API_CONTRACT.md`: Defined API endpoints (some may not be implemented yet).
  - `docs/MODELS.md`: Target database schema.
- **Database:** PostgreSQL via `docker-compose.yml`. Models are in `backend/app/models/`.
- **Environment:** Backend requires `backend/.env` (template: `.env.example`).
- **CORS:** Only `http://localhost:5173` is allowed by default in `backend/app/main.py`.

## Verification Workflow

1. **Backend:** Apply migrations -> Run dev server -> Check `/health` or `/docs` (Swagger).
2. **Frontend:** Run `npm run lint` -> Run dev server -> Check browser (`localhost:5173`).
3. **Docs:** Keep `docs/PLAN.md` and `docs/TASKS.md` updated after major changes.

## Quirks & Gotchas

- **Python Path:** When running backend scripts (like seed), execute from `backend` or ensure it's in `PYTHONPATH`. Command: `cd backend && ../.venv/bin/python -m app.db.seed`.
- **Alembic:** Always autogenerate migrations after model changes and verify the generated script in `backend/alembic/versions/`.
- **Implementation Gap:** Not all routes defined in `docs/API_CONTRACT.md` are currently included in `backend/app/main.py`. Check `app.include_router` calls.
- **Missing Models:** Some entities in `docs/MODELS.md` (e.g., `ratings`) may not be implemented in `backend/app/models/` yet.
