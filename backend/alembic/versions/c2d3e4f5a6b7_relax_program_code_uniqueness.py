"""relax program code uniqueness

Реальные образовательные программы Сириуса делят один код направления
(например, 06.04.01 «Биология» закреплён сразу за несколькими программами).
Поэтому уникальность переносим на имя программы, а код оставляем как
повторяющийся группирующий атрибут направления.

Revision ID: c2d3e4f5a6b7
Revises: b8c9d0e1f2a3
Create Date: 2026-05-21
"""

from alembic import op


revision = "c2d3e4f5a6b7"
down_revision = "b8c9d0e1f2a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("programs_code_key", "programs", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint("programs_code_key", "programs", ["code"])
