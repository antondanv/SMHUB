# SMHUB

SMHUB - проект для обмена учебными материалами между студентами.

Сейчас в репозитории уже есть базовый backend на FastAPI и рабочая документация. Папка `frontend/` создана, но клиентская часть ещё не инициализирована.

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
- настроен CORS для `http://localhost:5173`;
- реализован endpoint проверки состояния `GET /health`;
- актуальные рабочие документы лежат в `docs/`.

## Запуск backend

Backend находится в папке `backend/` и сейчас является основной готовой частью проекта.

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

Ожидаемый ответ от `GET /health`:

```json
{
  "status": "ok"
}
```

## Статус frontend

Папка `frontend/` уже создана, но приложение на React + Vite ещё не добавлено. Это следующий крупный шаг для завершения этапа 0.

## Документация

- [Общий план](docs/PLAN.md)
- [Текущий и следующий таск](docs/TASKS.md)
- [Идея проекта](docs/IDEA.md)
- [Заметки по моделям](docs/MODELS.md)

## Ограничения на текущем этапе

- frontend ещё не готов;
- PostgreSQL, SQLAlchemy и Alembic запланированы на следующий этап;
- полный запуск backend в этом окружении не был проверен, потому что локально не установлены Python-зависимости.
