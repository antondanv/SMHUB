"""remove moderator role

Revision ID: c1d2e3f4a5b6
Revises: b2c3d4e5f6a7
Create Date: 2026-05-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    admin_role = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'admin'")
    ).fetchone()

    moderator_role = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'moderator'")
    ).fetchone()

    if admin_role and moderator_role:
        conn.execute(
            sa.text("UPDATE users SET role_id = :admin_id WHERE role_id = :mod_id"),
            {"admin_id": admin_role[0], "mod_id": moderator_role[0]},
        )
        conn.execute(
            sa.text("DELETE FROM roles WHERE id = :mod_id"),
            {"mod_id": moderator_role[0]},
        )


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(
        sa.text(
            "INSERT INTO roles (name, description) VALUES ('moderator', 'Модератор, который проверяет и публикует материалы.') ON CONFLICT (name) DO NOTHING"
        )
    )
