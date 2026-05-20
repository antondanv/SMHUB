from sqlalchemy import select

from app.db.database import SessionLocal
from app.models import (
    Course,
    MaterialStatus,
    MaterialType,
    MimeType,
    Program,
    Role,
    Subject,
    SubjectProgram,
)


COURSES = [
    {"name": "1 курс", "number": 1},
    {"name": "2 курс", "number": 2},
    {"name": "3 курс", "number": 3},
    {"name": "4 курс", "number": 4},
    {"name": "5 курс", "number": 5},
    {"name": "6 курс", "number": 6},
]

PROGRAMS = [
    {
        "name": "Информатика и вычислительная техника",
        "code": "09.03.01",
        "description": "Подготовка по вычислительным системам, сетям и программным решениям.",
    },
    {
        "name": "Прикладная информатика",
        "code": "09.03.03",
        "description": "Подготовка специалистов по разработке и сопровождению ИТ-систем.",
    },
    {
        "name": "Информационные системы и технологии",
        "code": "09.03.02",
        "description": "Направление по проектированию, внедрению и эксплуатации информационных систем.",
    },
    {
        "name": "Программная инженерия",
        "code": "09.03.04",
        "description": "Разработка программных продуктов, архитектур и процессов сопровождения.",
    },
]

SUBJECTS = [
    {
        "name": "Информатика",
        "description": "Информация, кодирование, алгоритмы и базовые цифровые модели.",
    },
    {
        "name": "Математический анализ",
        "description": "Основы анализа, пределов, производных и интегралов.",
    },
    {
        "name": "Алгебра и геометрия",
        "description": "Линейная алгебра, матрицы, векторы и аналитическая геометрия.",
    },
    {
        "name": "Программирование",
        "description": "Базовые языки, алгоритмы и практика разработки.",
    },
    {
        "name": "Алгоритмы и структуры данных",
        "description": "Базовые алгоритмы, деревья, графы и методы анализа задач.",
    },
    {
        "name": "ООП",
        "description": "Принципы объектно-ориентированного программирования и проектирования.",
    },
    {
        "name": "Базы данных",
        "description": "Реляционное моделирование, SQL и проектирование БД.",
    },
    {
        "name": "Дискретная математика",
        "description": "Логика, множества, графы и комбинаторика.",
    },
    {
        "name": "Компьютерные сети",
        "description": "Сетевые модели, протоколы, оборудование и основы передачи данных.",
    },
    {
        "name": "Операционные системы",
        "description": "Процессы, память, файловые системы и базовые принципы ОС.",
    },
]

MATERIAL_TYPES = [
    "Лекция",
    "Конспект",
    "Лабораторная",
    "Презентация",
    "Тест",
    "Методичка",
]

ROLES = [
    {
        "name": "student",
        "description": "Базовая роль обучающегося с доступом к материалам.",
    },
    {
        "name": "moderator",
        "description": "Модератор, который проверяет и публикует материалы.",
    },
    {
        "name": "admin",
        "description": "Администратор системы с полным доступом.",
    },
]

MATERIAL_STATUSES = [
    {"name": "draft", "description": "Черновик материала."},
    {"name": "pending", "description": "Материал ожидает модерации."},
    {"name": "published", "description": "Материал опубликован."},
    {"name": "rejected", "description": "Материал отклонён."},
    {"name": "archived", "description": "Материал архивирован."},
]

MIME_TYPES = [
    {
        "name": "application/pdf",
        "extension": ".pdf",
        "description": "PDF-документ.",
    },
    {
        "name": "application/msword",
        "extension": ".doc",
        "description": "Документ Microsoft Word.",
    },
    {
        "name": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "extension": ".docx",
        "description": "Документ Microsoft Word Open XML.",
    },
    {
        "name": "application/vnd.ms-powerpoint",
        "extension": ".ppt",
        "description": "Презентация Microsoft PowerPoint.",
    },
    {
        "name": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "extension": ".pptx",
        "description": "Презентация Microsoft PowerPoint Open XML.",
    },
]

SUBJECT_PROGRAM_LINKS = [
    {"subject_name": "Информатика", "program_code": "09.03.03", "course_number": 1},
    {"subject_name": "Программирование", "program_code": "09.03.03", "course_number": 1},
    {"subject_name": "Алгоритмы и структуры данных", "program_code": "09.03.04", "course_number": 2},
    {"subject_name": "ООП", "program_code": "09.03.04", "course_number": 2},
    {"subject_name": "Базы данных", "program_code": "09.03.03", "course_number": 2},
    {"subject_name": "Дискретная математика", "program_code": "09.03.03", "course_number": 1},
    {"subject_name": "Программирование", "program_code": "09.03.02", "course_number": 1},
    {"subject_name": "Базы данных", "program_code": "09.03.02", "course_number": 2},
    {"subject_name": "Компьютерные сети", "program_code": "09.03.01", "course_number": 2},
    {"subject_name": "Операционные системы", "program_code": "09.03.01", "course_number": 2},
]


def seed_reference_data() -> None:
    with SessionLocal() as session:
        existing_courses = {
            course.number: course
            for course in session.scalars(select(Course)).all()
        }
        existing_programs = {
            program.code: program
            for program in session.scalars(select(Program)).all()
        }
        existing_subjects = {
            subject.name: subject
            for subject in session.scalars(select(Subject)).all()
        }
        existing_material_types = {
            material_type.name: material_type
            for material_type in session.scalars(select(MaterialType)).all()
        }
        existing_roles = {
            role.name: role
            for role in session.scalars(select(Role)).all()
        }
        existing_material_statuses = {
            status.name: status
            for status in session.scalars(select(MaterialStatus)).all()
        }
        existing_mime_types = {
            mime_type.name: mime_type
            for mime_type in session.scalars(select(MimeType)).all()
        }

        for course_data in COURSES:
            if course_data["number"] not in existing_courses:
                course = Course(**course_data)
                session.add(course)
                existing_courses[course.number] = course

        for program_data in PROGRAMS:
            if program_data["code"] not in existing_programs:
                program = Program(**program_data)
                session.add(program)
                existing_programs[program.code] = program

        for subject_data in SUBJECTS:
            if subject_data["name"] not in existing_subjects:
                subject = Subject(**subject_data)
                session.add(subject)
                existing_subjects[subject.name] = subject

        for material_type_name in MATERIAL_TYPES:
            if material_type_name not in existing_material_types:
                material_type = MaterialType(name=material_type_name)
                session.add(material_type)
                existing_material_types[material_type.name] = material_type

        for role_data in ROLES:
            if role_data["name"] not in existing_roles:
                role = Role(**role_data)
                session.add(role)
                existing_roles[role.name] = role

        for status_data in MATERIAL_STATUSES:
            if status_data["name"] not in existing_material_statuses:
                status = MaterialStatus(**status_data)
                session.add(status)
                existing_material_statuses[status.name] = status

        for mime_type_data in MIME_TYPES:
            if mime_type_data["name"] not in existing_mime_types:
                mime_type = MimeType(**mime_type_data)
                session.add(mime_type)
                existing_mime_types[mime_type.name] = mime_type

        session.flush()

        existing_links = {
            (link.subject_id, link.program_id, link.course_id)
            for link in session.scalars(select(SubjectProgram)).all()
        }

        for link_data in SUBJECT_PROGRAM_LINKS:
            subject = existing_subjects[link_data["subject_name"]]
            program = existing_programs[link_data["program_code"]]
            course = existing_courses[link_data["course_number"]]
            link_key = (subject.id, program.id, course.id)

            if link_key in existing_links:
                continue

            session.add(
                SubjectProgram(
                    subject_id=subject.id,
                    program_id=program.id,
                    course_id=course.id,
                )
            )
            existing_links.add(link_key)

        session.commit()


if __name__ == "__main__":
    seed_reference_data()
