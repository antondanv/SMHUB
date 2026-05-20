"""create audit_log table

Revision ID: c0d1e2f3a4b5
Revises: a7b8c9d0e1f2
Create Date: 2026-05-20 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c0d1e2f3a4b5"
down_revision: Union[str, None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "actor_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("target_type", sa.String(40), nullable=True),
        sa.Column("target_id", sa.Integer(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_audit_log_actor_created", "audit_log", ["actor_id", "created_at"])
    op.create_index("ix_audit_log_action_created", "audit_log", ["action", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_log_action_created", "audit_log")
    op.drop_index("ix_audit_log_actor_created", "audit_log")
    op.drop_table("audit_log")
