# SMHUB

SMHUB - проект для обмена учебными материалами между студентами.

## Текущая структура

```text
SMHUB/
├── docker-compose.yml
├── run.sh
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── Dockerfile
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── API_CONTRACT.md
│   ├── IDEA.md
│   ├── MODELS.md
│   ├── PLAN.md
│   └── TASKS.md
└── README.md
```

## Что уже сделано

- проект собран в один репозиторий;
- создана базовая структура backend на FastAPI;
- инициализирован frontend на React + Vite;
- добавлен Docker Compose для кроссплатформенного запуска `db + backend + frontend`;
- настроен frontend-backend runtime для локального и контейнерного запуска;
- реализован endpoint проверки состояния `GET /health` на backend;
- реализована проверка backend на главной странице frontend;
- актуальные рабочие документы лежат в `docs/`.

## Запуск через Docker

Нужен только установленный Docker Desktop или связка Docker Engine + Docker Compose.

Из корня репозитория:

```bash
docker compose up --build
```

Или через обертку:

```bash
./run.sh
```

Что поднимется автоматически:

- `db` на `localhost:5432`;
- `backend` на `http://localhost:8000`;
- `frontend` на `http://localhost:5173`.

Что делает compose:

- ждёт готовности PostgreSQL;
- применяет Alembic-миграции;
- заполняет справочники seed-данными;
- запускает FastAPI и Vite в dev-режиме с проброшенными портами.

Остановить стек:

```bash
docker compose down
```

Если нужно сбросить контейнеры вместе с volume базы данных:

```bash
docker compose down -v
```

## Локальный запуск без Docker

### Backend

Backend находится в папке `backend/`.

Требуется Python `3.12+`.

1. Создайте и активируйте виртуальное окружение:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
```

Для Windows:

```bash
.venv\Scripts\activate
```

2. Установите зависимости:

```bash
pip install -r backend/requirements.txt
```

3. При необходимости создайте `.env` из примера:

```bash
cp backend/.env.example backend/.env
```

4. Примените миграции:

```bash
./.venv/bin/alembic -c backend/alembic.ini upgrade head
```

5. При необходимости заполните справочники стартовыми данными:

```bash
cd backend
../.venv/bin/python -m app.db.seed
```

6. Запустите сервер разработки из корня репозитория:

```bash
uvicorn app.main:app --reload --app-dir backend
```

После запуска backend будет доступен по адресам:

- `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- проверка состояния: `http://127.0.0.1:8000/health`

### Frontend

Frontend находится в папке `frontend/`.

1. Перейдите в папку frontend:

```bash
cd frontend
```

2. Установите зависимости:

```bash
npm install
```

3. Запустите сервер разработки:

```bash
npm run dev
```

После запуска frontend будет доступен по адресу:

- `http://localhost:5173`

## Документация

- [GitHub Project Board](https://github.com/users/antondanv/projects/1)
- [Workflow и процесс работы](docs/WORKFLOW.md)
- [Общий план](docs/PLAN.md)
- [API-контракт](docs/API_CONTRACT.md)
- [Архив старого task-tracking](docs/TASKS.md)
- [Идея проекта](docs/IDEA.md)
- [Заметки по моделям](docs/MODELS.md)
