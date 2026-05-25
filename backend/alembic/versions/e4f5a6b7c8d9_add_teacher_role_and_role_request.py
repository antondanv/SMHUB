"""add teacher role and role request column

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-05-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    conn.execute(
        sa.text(
            "INSERT INTO roles (name, description) "
            "VALUES ('teacher', 'Преподаватель, материалы публикуются без очереди модерации.') "
            "ON CONFLICT (name) DO NOTHING"
        )
    )

    op.add_column(
        "users",
        sa.Column("requested_role_id", sa.SmallInteger(), nullable=True),
    )
    op.create_foreign_key(
        "users_requested_role_id_fkey",
        "users",
        "roles",
        ["requested_role_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    conn = op.get_bind()

    op.drop_constraint("users_requested_role_id_fkey", "users", type_="foreignkey")
    op.drop_column("users", "requested_role_id")

    teacher_role = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'teacher'")
    ).fetchone()
    student_role = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'student'")
    ).fetchone()

    if teacher_role and student_role:
        conn.execute(
            sa.text("UPDATE users SET role_id = :student_id WHERE role_id = :teacher_id"),
            {"student_id": student_role[0], "teacher_id": teacher_role[0]},
        )
        conn.execute(
            sa.text("DELETE FROM roles WHERE id = :teacher_id"),
            {"teacher_id": teacher_role[0]},
        )
