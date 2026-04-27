# SMHUB

SMHUB - проект для обмена учебными материалами между студентами.

## Текущая структура

```text
SMHUB/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── docs/
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
- настроен CORS для `http://localhost:5173`;
- реализован endpoint проверки состояния `GET /health` на backend;
- реализована проверка backend на главной странице frontend;
- актуальные рабочие документы лежат в `docs/`.

## Запуск backend

Backend находится в папке `backend/`.

1. Создайте и активируйте виртуальное окружение:

```bash
python -m venv .venv
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

4. Запустите сервер разработки из корня репозитория:

```bash
uvicorn app.main:app --reload --app-dir backend
```

После запуска backend будет доступен по адресам:

- `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- проверка состояния: `http://127.0.0.1:8000/health`

## Запуск frontend

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

- [Общий план](docs/PLAN.md)
- [Текущий и следующий таск](docs/TASKS.md)
- [Идея проекта](docs/IDEA.md)
- [Заметки по моделям](docs/MODELS.md)
