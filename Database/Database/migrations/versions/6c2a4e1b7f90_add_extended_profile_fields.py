"""add extended profile fields

Revision ID: 6c2a4e1b7f90
Revises: 5fd2908e0c3a
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6c2a4e1b7f90"
down_revision: Union[str, Sequence[str], None] = "5fd2908e0c3a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("university", sa.String(), nullable=True))
    op.add_column("user_profiles", sa.Column("course", sa.String(), nullable=True))
    op.add_column("user_profiles", sa.Column("year_of_study", sa.Integer(), nullable=True))
    op.add_column("user_profiles", sa.Column("skills", sa.String(), nullable=True))
    op.add_column("user_profiles", sa.Column("phone_number", sa.String(), nullable=True))
    op.add_column("user_profiles", sa.Column("location", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("user_profiles", "location")
    op.drop_column("user_profiles", "phone_number")
    op.drop_column("user_profiles", "skills")
    op.drop_column("user_profiles", "year_of_study")
    op.drop_column("user_profiles", "course")
    op.drop_column("user_profiles", "university")