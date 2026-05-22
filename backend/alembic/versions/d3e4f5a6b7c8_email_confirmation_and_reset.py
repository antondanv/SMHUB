"""email confirmation and password reset

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-05-22 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "email_confirmed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "email_confirmed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.execute(
        "UPDATE users SET email_confirmed = true, email_confirmed_at = now()"
    )

    op.create_table(
        "email_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("purpose", sa.String(16), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_email_tokens_user_id", "email_tokens", ["user_id"])
    op.create_index("ix_email_tokens_token_hash", "email_tokens", ["token_hash"], unique=True)
    op.create_index(
        "ix_email_tokens_user_purpose",
        "email_tokens",
        ["user_id", "purpose"],
    )


def downgrade() -> None:
    op.drop_index("ix_email_tokens_user_purpose", "email_tokens")
    op.drop_index("ix_email_tokens_token_hash", "email_tokens")
    op.drop_index("ix_email_tokens_user_id", "email_tokens")
    op.drop_table("email_tokens")
    op.drop_column("users", "email_confirmed_at")
    op.drop_column("users", "email_confirmed")
