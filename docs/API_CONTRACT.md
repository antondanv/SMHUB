# API Contract

Этот файл фиксирует текущее состояние публичного API проекта SMHUB.

## Правило обновления

- все новые endpoints сначала добавляются сюда;
- изменения request/response тоже отражаются здесь;
- frontend ориентируется на этот файл как на рабочий контракт до появления Swagger-first или отдельной схемы.

## Базовый endpoint

### `GET /health`

Проверка доступности backend.

Response `200 OK`:

```json
{
  "status": "ok"
}
```

## Материалы

### `POST /materials`

Создание нового материала и отправка его на модерацию.

- требует `Authorization: Bearer <token>`
- request format: `multipart/form-data`
- допустимые файлы: `pdf`, `doc`, `docx`, `ppt`, `pptx`
- максимальный размер файла: `20 MB`

Request fields:

- `title` — обязательная строка до `255` символов
- `description` — необязательная строка
- `subject_id` — обязательный `integer`
- `material_type_id` — обязательный `integer`
- `course_id` — обязательный `integer`
- `program_id` — обязательный `integer`
- `file` — обязательный файл

Response `201 Created`:

```json
{
  "id": 1,
  "title": "Конспект по базам данных",
  "description": "Разбор основных тем и примеров.",
  "author_id": 3,
  "subject_id": 4,
  "material_type_id": 2,
  "course_id": 2,
  "program_id": 2,
  "status": "pending",
  "mime_type": "application/pdf",
  "file_url": "uploads/materials/4f0bf5c611eb40a6a7f1ce76f7d14d0f.pdf",
  "file_name": "db-notes.pdf",
  "file_size": 182944,
  "views_count": 0,
  "downloads_count": 0,
  "likes_count": 0,
  "comments_count": 0,
  "favorites_count": 0,
  "published_at": null,
  "created_at": "2026-05-18T10:00:00Z",
  "updated_at": "2026-05-18T10:00:00Z"
}
```

Возможные ошибки:

- `400 Bad Request` — невалидные поля, несуществующий справочник, неподдерживаемый тип файла, пустой файл, превышение лимита размера
- `401 Unauthorized` — пользователь не авторизован
- `500 Internal Server Error` — не удалось сохранить материал
