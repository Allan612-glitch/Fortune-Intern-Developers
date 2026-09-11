"""store password hashes

Revision ID: e31735d762d8
Revises: 09e911199534
Create Date: 2026-09-10 21:34:41.934468

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e31735d762d8'
down_revision: Union[str, Sequence[str], None] = '09e911199534'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        'users',
        'password',
        new_column_name='password_hash',
        existing_type=sa.String(),
        existing_nullable=True,
    )
    op.alter_column('users', 'password_hash', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'users',
        'password_hash',
        new_column_name='password',
        existing_type=sa.String(),
        existing_nullable=False,
    )
    op.alter_column('users', 'password', nullable=True)
