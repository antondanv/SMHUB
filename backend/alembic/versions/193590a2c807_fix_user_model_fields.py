"""fix user model fields

Revision ID: 193590a2c807
Revises: 3b7c3137d8aa
Create Date: 2026-04-29 22:15:32.226094

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "193590a2c807"
down_revision: Union[str, None] = "3b7c3137d8aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    The structural changes that were intended for this revision were already
    applied in revision 3b7c3137d8aa. Keeping this revision as a no-op preserves
    the migration chain for existing databases and unblocks fresh deployments.
    """


def downgrade() -> None:
    """Downgrade schema.

    This revision is intentionally a no-op.
    """
