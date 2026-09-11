"""add notification targets

Revision ID: d9e2f3a4b506
Revises: c8f1a2d3e405
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d9e2f3a4b506"
down_revision: Union[str, Sequence[str], None] = "c8f1a2d3e405"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("target_type", sa.String(), nullable=True))
    op.add_column("notifications", sa.Column("target_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "target_id")
    op.drop_column("notifications", "target_type")
