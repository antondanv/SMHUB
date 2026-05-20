"""create featured_items table

Revision ID: b8c9d0e1f2a3
Revises: c0d1e2f3a4b5
Create Date: 2026-05-20 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, None] = "c0d1e2f3a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "featured_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("section", sa.String(30), nullable=False),
        sa.Column(
            "material_id",
            sa.Integer(),
            sa.ForeignKey("materials.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_by",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("section", "material_id", name="uq_featured_section_material"),
    )
    op.create_index("ix_featured_section", "featured_items", ["section", "position"])


def downgrade() -> None:
    op.drop_index("ix_featured_section", "featured_items")
    op.drop_table("featured_items")
