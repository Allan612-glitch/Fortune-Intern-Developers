"""add admin role

Revision ID: b7e3c1a9d204
Revises: a4d8f2c1e709
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b7e3c1a9d204"
down_revision: Union[str, Sequence[str], None] = "a4d8f2c1e709"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("users", "is_admin")
