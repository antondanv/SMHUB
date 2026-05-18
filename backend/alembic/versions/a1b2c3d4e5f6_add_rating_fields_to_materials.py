"""add rating fields to materials

Revision ID: a1b2c3d4e5f6
Revises: 193590a2c807
Create Date: 2026-05-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '193590a2c807'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('materials', sa.Column('avg_rating', sa.Float(), nullable=True))
    op.add_column('materials', sa.Column('ratings_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('materials', 'ratings_count')
    op.drop_column('materials', 'avg_rating')
