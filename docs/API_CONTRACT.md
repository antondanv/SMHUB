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

## Аутентификация

### `POST /auth/register`

Обычная регистрация пользователя со стартовой ролью `student`.

Request:

```json
{
  "email": "student@university.ru",
  "username": "ivan_21",
  "password": "secret123",
  "last_name": "Иванов",
  "first_name": "Иван",
  "middle_name": "Иванович",
  "course_id": 2,
  "program_id": 1,
  "group_name": "ИВТ-21-1"
}
```

Поля `middle_name`, `course_id`, `program_id`, `group_name` можно передавать как `null`.

Response `201 Created`:

```json
{
  "id": 15,
  "email": "student@university.ru",
  "username": "ivan_21",
  "last_name": "Иванов",
  "first_name": "Иван",
  "middle_name": "Иванович",
  "role_id": 1,
  "role_name": "student",
  "is_active": true,
  "course_id": 2,
  "program_id": 1,
  "group_name": "ИВТ-21-1"
}
```

Возможные ошибки:

- `400 Bad Request` — email или username уже заняты, либо передан несуществующий `course_id` / `program_id`

### `POST /auth/admin/register`

Публичная регистрация администратора по секретному коду из `ADMIN_REGISTRATION_SECRET`.

Если `ADMIN_REGISTRATION_SECRET` пустой, endpoint считается отключённым.

Request:

```json
{
  "email": "admin@university.ru",
  "username": "admin_ivanov",
  "password": "secret123",
  "last_name": "Иванов",
  "first_name": "Иван",
  "middle_name": null,
  "course_id": null,
  "program_id": null,
  "group_name": null,
  "admin_secret": "top-secret"
}
```

Для администратора учебный контекст не обязателен, поэтому `course_id`, `program_id` и `group_name` можно передавать как `null`.

Response `201 Created`:

```json
{
  "id": 16,
  "email": "admin@university.ru",
  "username": "admin_ivanov",
  "last_name": "Иванов",
  "first_name": "Иван",
  "middle_name": null,
  "role_id": 2,
  "role_name": "admin",
  "is_active": true,
  "course_id": null,
  "program_id": null,
  "group_name": null
}
```

Возможные ошибки:

- `400 Bad Request` — email или username уже заняты, либо передан несуществующий `course_id` / `program_id`
- `403 Forbidden` — неверный `admin_secret`
- `404 Not Found` — админская регистрация отключена, потому что `ADMIN_REGISTRATION_SECRET` не задан

### `POST /auth/login`

Вход по email и паролю.

Request:

```json
{
  "email": "admin@university.ru",
  "password": "secret123"
}
```

Response `200 OK`:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

Возможные ошибки:

- `401 Unauthorized` — неверный email, пароль или неактивный пользователь

### `GET /auth/me`

Текущий авторизованный пользователь.

- требует `Authorization: Bearer <token>`

Response `200 OK`:

```json
{
  "id": 16,
  "email": "admin@university.ru",
  "username": "admin_ivanov",
  "last_name": "Иванов",
  "first_name": "Иван",
  "middle_name": null,
  "role_id": 2,
  "role_name": "admin",
  "is_active": true,
  "course_id": null,
  "program_id": null,
  "group_name": null
}
```

Возможные ошибки:

- `401 Unauthorized` — отсутствует или невалиден токен
- `403 Forbidden` — пользователь деактивирован

### Bootstrap первого администратора

При старте приложения backend может создать первого администратора из окружения:

- `FIRST_ADMIN_EMAIL`
- `FIRST_ADMIN_PASSWORD`
- `FIRST_ADMIN_USERNAME` — опционально

Правила:

- пользователь создаётся только если в БД ещё нет ни одного администратора;
- повторный старт приложения не создаёт дубликаты;
- если `FIRST_ADMIN_USERNAME` не задан, username вычисляется из локальной части email.

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

### `GET /materials/{id}`

Детальная карточка материала.

Правила доступа:

- гость и обычный пользователь видят только `published`;
- автор, `moderator` и `admin` могут открывать скрытые статусы своего или модерируемого материала.

Дополнительная логика:

- при успешном открытии увеличивается `views_count`.

Response `200 OK`:

```json
{
  "id": 12,
  "title": "Конспект по базам данных",
  "description": "Разбор основных тем и примеров.",
  "status": "published",
  "mime_type": "application/pdf",
  "file_url": "uploads/materials/4f0bf5c611eb40a6a7f1ce76f7d14d0f.pdf",
  "file_name": "db-notes.pdf",
  "file_size": 182944,
  "views_count": 14,
  "downloads_count": 5,
  "likes_count": 0,
  "comments_count": 0,
  "favorites_count": 0,
  "published_at": "2026-05-18T10:00:00Z",
  "created_at": "2026-05-18T10:00:00Z",
  "updated_at": "2026-05-18T10:00:00Z",
  "author": {
    "id": 3,
    "username": "anton",
    "full_name": "Данилов Антон"
  },
  "subject": { "id": 4, "name": "Базы данных" },
  "material_type": { "id": 2, "name": "Конспект" },
  "course": { "id": 2, "name": "2 курс", "number": 2 },
  "program": {
    "id": 2,
    "name": "Прикладная информатика",
    "code": "09.03.03"
  }
}
```

Возможные ошибки:

- `403 Forbidden` — нет доступа к скрытому материалу
- `404 Not Found` — материал не найден

### `GET /materials/{id}/download`

Скачивание файла материала.

Правила доступа такие же, как у `GET /materials/{id}`.

Дополнительная логика:

- при успешном скачивании увеличивается `downloads_count`.

Response `200 OK`:

- бинарный файл с оригинальным `file_name`.

### `GET /materials/{id}/file`

Встроенный просмотр файла материала без скачивания.

Назначение:

- используется для `iframe`-viewer на странице материала;
- не изменяет `downloads_count`;
- возвращает тот же файл, что и `download`, но с inline-disposition.

Правила доступа такие же, как у `GET /materials/{id}`.

Response `200 OK`:

- бинарный файл материала;
- `Content-Type` соответствует `material.mime_type`;
- `Content-Disposition` начинается с `inline`.

### `GET /materials/{id}/preview`

Предпросмотр содержимого материала на странице детали.

Назначение:

- используется для отображения обобщённого содержимого без скачивания файла;
- для импортированных учебных PDF возвращает структурированный preview sidecar;
- для обычных материалов может вернуть `null`.

Правила доступа такие же, как у `GET /materials/{id}`.

Response `200 OK`:

```json
{
  "material_id": 12,
  "title": "Конспект по базам данных",
  "summary": "Краткое описание содержания материала.",
  "sections": [
    {
      "heading": "Ключевые темы",
      "bullets": [
        "Нормализация и формы хранения данных",
        "Индексы и производительность запросов"
      ]
    }
  ],
  "note": "Содержимое на странице показано в обобщённом и обезличенном виде."
}
```

Возможные ошибки:

- `403 Forbidden` — нет доступа к скрытому материалу
- `404 Not Found` — материал или файл не найдены

## Комментарии

### `GET /materials/{id}/comments`

Список неудалённых комментариев материала.

Response `200 OK`:

```json
[
  {
    "id": 5,
    "material_id": 12,
    "content": "Полезный материал, спасибо!",
    "created_at": "2026-05-18T11:00:00Z",
    "updated_at": "2026-05-18T11:00:00Z",
    "can_edit": true,
    "author": {
      "id": 7,
      "username": "student1",
      "full_name": "Иванов Иван"
    }
  }
]
```

### `POST /materials/{id}/comments`

Создание комментария.

- требует `Authorization: Bearer <token>`

Request:

```json
{
  "content": "Полезный материал, спасибо!"
}
```

Response `201 Created`:

- shape совпадает с элементом списка комментариев.

Дополнительная логика:

- при создании увеличивается `comments_count`.

### `PATCH /comments/{id}`

Редактирование комментария владельцем, `moderator` или `admin`.

Request:

```json
{
  "content": "Обновлённый текст комментария"
}
```

Response `200 OK`:

- shape совпадает с элементом списка комментариев.

### `DELETE /comments/{id}`

Мягкое удаление комментария владельцем, `moderator` или `admin`.

Response `204 No Content`

Дополнительная логика:

- при удалении уменьшается `comments_count`.

## Избранное

### `POST /materials/{id}/favorite`

Добавить материал в избранное текущего пользователя.

- требует `Authorization: Bearer <token>`

Response `200 OK`:

```json
{
  "material_id": 12,
  "is_favorite": true,
  "favorites_count": 4
}
```

### `DELETE /materials/{id}/favorite`

Убрать материал из избранного текущего пользователя.

- требует `Authorization: Bearer <token>`

Response `200 OK`:

```json
{
  "material_id": 12,
  "is_favorite": false,
  "favorites_count": 3
}
```

### `GET /users/me/favorites`

Список избранных материалов текущего пользователя.

- требует `Authorization: Bearer <token>`

Response `200 OK`:

- shape совпадает с `GET /materials`, но содержит только избранные материалы пользователя.

## Главная страница

### `GET /homepage`

Контент главной страницы с простой персонализацией.

Response `200 OK`:

```json
{
  "audience": "authenticated",
  "latest": [],
  "popular": [],
  "subjects": [
    { "id": 4, "name": "Базы данных", "materials_count": 6 }
  ],
  "course_materials": [],
  "program_materials": [],
  "related_materials": [],
  "popular_in_course": [],
  "rules": [
    "Гостю показываются последние и популярные опубликованные материалы, а также самые наполненные предметы.",
    "Авторизованному пользователю дополнительно показываются материалы его курса и направления."
  ]
}
```

Правила персонализации:

- гость получает `latest`, `popular`, `subjects`;
- авторизованный пользователь дополнительно получает `course_materials`, `program_materials`, `related_materials`, `popular_in_course`;
- `related_materials` строится по совпадению `course_id + program_id`;
- если у пользователя не заполнены `course_id` или `program_id`, соответствующие блоки приходят пустыми.

## Модерация

### `GET /moderation/materials`

Очередь материалов со статусом `pending`.

- требует `Authorization: Bearer <token>`
- доступ только `moderator` и `admin`

Response `200 OK`:

```json
{
  "items": [],
  "total": 0
}
```

`items[]` использует тот же shape, что и `GET /materials`.

### `PATCH /moderation/materials/{id}`

Изменить модерационный статус материала.

- требует `Authorization: Bearer <token>`
- доступ только `moderator` и `admin`

Request:

```json
{
  "status": "published"
}
```

Допустимые значения `status`:

- `published`
- `rejected`
- `archived`

Дополнительная логика:

- при переводе в `published` backend выставляет `published_at`;
- при переводе в `rejected` backend сбрасывает `published_at`.

Response `200 OK`:

- shape совпадает с `GET /materials/{id}`.
