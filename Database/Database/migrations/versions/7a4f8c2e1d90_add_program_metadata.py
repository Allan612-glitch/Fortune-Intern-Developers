"""add program metadata

Revision ID: 7a4f8c2e1d90
Revises: 6c2a4e1b7f90
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7a4f8c2e1d90"
down_revision: Union[str, Sequence[str], None] = "6c2a4e1b7f90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("programs", sa.Column("company", sa.String(), nullable=True))
    op.add_column("programs", sa.Column("category", sa.String(), nullable=True))
    op.add_column("programs", sa.Column("status", sa.String(), nullable=True))
    op.add_column("programs", sa.Column("location", sa.String(), nullable=True))
    op.add_column("programs", sa.Column("duration", sa.String(), nullable=True))
    op.add_column("programs", sa.Column("skills", sa.String(), nullable=True))
    op.add_column("programs", sa.Column("deadline", sa.DateTime(timezone=True), nullable=True))
    op.execute(sa.text("UPDATE programs SET company = 'Fortune Intern Network', category = 'Internship', status = 'open', location = 'Remote', duration = '3 months' WHERE company IS NULL"))
    op.alter_column("programs", "company", nullable=False)
    op.alter_column("programs", "category", nullable=False)
    op.alter_column("programs", "status", nullable=False)
    op.alter_column("programs", "location", nullable=False)
    op.alter_column("programs", "duration", nullable=False)


def downgrade() -> None:
    op.drop_column("programs", "deadline")
    op.drop_column("programs", "skills")
    op.drop_column("programs", "duration")
    op.drop_column("programs", "location")
    op.drop_column("programs", "status")
    op.drop_column("programs", "category")
    op.drop_column("programs", "company")