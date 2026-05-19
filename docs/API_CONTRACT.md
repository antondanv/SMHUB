# API Contract

Этот файл фиксирует текущее состояние публичного API проекта SMHUB.

## Правило обновления

- все новые endpoints сначала добавляются сюда;
- изменения request/response тоже отражаются здесь;
- frontend ориентируется на этот файл как на рабочий контракт до появления Swagger-first или отдельной схемы.

## Справочники

Все endpoints справочников не требуют авторизации. CRUD-операции для администратора в текущий scope не входят.

### `GET /courses`

Список учебных курсов.

Response `200 OK`:

```json
[
  { "id": 1, "name": "1 курс", "number": 1 },
  { "id": 2, "name": "2 курс", "number": 2 }
]
```

Сортировка: по возрастанию `number`.

### `GET /programs`

Список образовательных программ.

Response `200 OK`:

```json
[
  { "id": 1, "name": "Информатика и вычислительная техника", "code": "09.03.01" },
  { "id": 2, "name": "Прикладная информатика", "code": "09.03.03" }
]
```

Сортировка: по алфавиту `name`.

### `GET /subjects`

Список учебных предметов (только активные).

Response `200 OK`:

```json
[
  { "id": 1, "name": "Математический анализ", "description": "Основы анализа, пределов, производных и интегралов." },
  { "id": 2, "name": "Алгебра и геометрия", "description": "Линейная алгебра, матрицы, векторы и аналитическая геометрия." }
]
```

Фильтрация: только `is_active == true`. Сортировка: по алфавиту `name`.

### `GET /material-types`

Список типов материалов.

Response `200 OK`:

```json
[
  { "id": 1, "name": "Лекция" },
  { "id": 2, "name": "Конспект" }
]
```

Сортировка: по алфавиту `name`.

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

### `GET /materials`

Каталог материалов с фильтрацией, поиском, сортировкой и пагинацией. Не требует авторизации.

Query-параметры:

| Параметр | Тип | Описание |
|---|---|---|
| `search` | string | Поиск по названию материала (case-insensitive) |
| `subject_id` | integer | Фильтр по предмету |
| `material_type_id` | integer | Фильтр по типу материала |
| `course_id` | integer | Фильтр по курсу |
| `program_id` | integer | Фильтр по программе |
| `sort` | string | Сортировка: `new` (по умолчанию, по дате создания) или `popular` (по скачиваниям и просмотрам) |
| `page` | integer | Номер страницы (по умолчанию 1) |
| `per_page` | integer | Количество на странице (по умолчанию 10, макс. 50) |

По умолчанию отдаются только материалы со статусом `published`.

Response `200 OK`:

```json
{
  "items": [
    {
      "id": 1,
      "title": "Конспект по базам данных",
      "description": "Разбор основных тем и примеров.",
      "subject": { "id": 4, "name": "Базы данных" },
      "material_type": { "id": 2, "name": "Конспект" },
      "course": { "id": 2, "name": "2 курс" },
      "program": { "id": 2, "name": "Прикладная информатика" },
      "author": { "id": 3, "full_name": "Иванов Иван" },
      "file_name": "db-notes.pdf",
      "file_size": 182944,
      "views_count": 10,
      "downloads_count": 5,
      "likes_count": 3,
      "comments_count": 1,
      "created_at": "2026-05-18T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 10,
  "total_pages": 5
}
```

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
