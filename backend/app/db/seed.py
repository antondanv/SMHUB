from sqlalchemy import select

from app.db.database import SessionLocal
from app.models import Course, Program, Subject, SubjectProgram


COURSES = [
    {"name": "1 курс", "number": 1},
    {"name": "2 курс", "number": 2},
    {"name": "3 курс", "number": 3},
    {"name": "4 курс", "number": 4},
]

PROGRAMS = [
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
]

SUBJECTS = [
    {
        "name": "Программирование",
        "description": "Базовые языки, алгоритмы и практика разработки.",
    },
    {
        "name": "Базы данных",
        "description": "Реляционное моделирование, SQL и проектирование БД.",
    },
    {
        "name": "Дискретная математика",
        "description": "Логика, множества, графы и комбинаторика.",
    },
]

SUBJECT_PROGRAM_LINKS = [
    {"subject_name": "Программирование", "program_code": "09.03.03", "course_number": 1},
    {"subject_name": "Базы данных", "program_code": "09.03.03", "course_number": 2},
    {"subject_name": "Дискретная математика", "program_code": "09.03.03", "course_number": 1},
    {"subject_name": "Программирование", "program_code": "09.03.02", "course_number": 1},
    {"subject_name": "Базы данных", "program_code": "09.03.02", "course_number": 2},
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
