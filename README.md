# SMHUB Backend

Backend для проекта SMHUB — системы обмена учебными материалами студентов.

## Запуск проекта

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload