"""add application applicant details and documents_sent flag

Revision ID: a1b2c3d4e5f6
Revises: f2a6b9c3d810
Create Date: 2026-10-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f2a6b9c3d810"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("applicant_institution", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("applicant_course", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("applicant_contact", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("host_company_name", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("host_company_address", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("documents_sent", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column("applications", "documents_sent", server_default=None)


def downgrade() -> None:
    op.drop_column("applications", "documents_sent")
    op.drop_column("applications", "host_company_address")
    op.drop_column("applications", "host_company_name")
    op.drop_column("applications", "applicant_contact")
    op.drop_column("applications", "applicant_course")
    op.drop_column("applications", "applicant_institution")
