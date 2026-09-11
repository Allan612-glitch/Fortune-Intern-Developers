"""add application resume metadata

Revision ID: 9c7e1a4b2d05
Revises: 8b5d2f7c1a04
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9c7e1a4b2d05"
down_revision: Union[str, Sequence[str], None] = "8b5d2f7c1a04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("resume_filename", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("resume_path", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("applications", "resume_path")
    op.drop_column("applications", "resume_filename")