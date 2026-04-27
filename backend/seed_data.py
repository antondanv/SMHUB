import sys
from pathlib import Path

# Add the project root to sys.path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from backend.app.db.database import SessionLocal, engine
from backend.app.db.base import Base
from backend.app.models import MaterialType, Course, Program, Subject


def seed_data():
    db = SessionLocal()
    try:
        # 1. Material Types
        material_types = [
            "Лекция",
            "Конспект",
            "Лабораторная",
            "Презентация",
            "Тест",
            "Методичка"
        ]
        for name in material_types:
            if not db.query(MaterialType).filter(MaterialType.name == name).first():
                db.add(MaterialType(name=name))
        
        # 2. Courses
        for i in range(1, 7):
            if not db.query(Course).filter(Course.number == i).first():
                db.add(Course(name=f"{i} курс", number=i))
                
        # 3. Programs
        programs = [
            {"name": "Информатика и вычислительная техника", "code": "09.03.01"},
            {"name": "Прикладная информатика", "code": "09.03.03"},
            {"name": "Программная инженерия", "code": "09.03.04"},
        ]
        for p in programs:
            if not db.query(Program).filter(Program.code == p["code"]).first():
                db.add(Program(name=p["name"], code=p["code"]))
                
        # 4. Subjects
        subjects = [
            "Математический анализ",
            "Алгебра и геометрия",
            "Дискретная математика",
            "Программирование",
            "Базы данных",
            "Операционные системы"
        ]
        for name in subjects:
            if not db.query(Subject).filter(Subject.name == name).first():
                db.add(Subject(name=name))
        
        db.commit()
        print("Seed data created successfully.")
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    # Ensure tables exist
    # In a real scenario, we'd use Alembic
    # Base.metadata.create_all(bind=engine)
    seed_data()
