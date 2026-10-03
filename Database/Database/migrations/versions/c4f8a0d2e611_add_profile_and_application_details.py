"""add profile and application details

Revision ID: c4f8a0d2e611
Revises: 9f08005dadb6
Create Date: 2026-10-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c4f8a0d2e611"
down_revision: Union[str, Sequence[str], None] = "9f08005dadb6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("experience", sa.JSON(), nullable=True))
    op.add_column("user_profiles", sa.Column("cgpa", sa.Float(), nullable=True))
    op.add_column("user_profiles", sa.Column("cgpa_scale", sa.Float(), nullable=True))

    op.add_column("applications", sa.Column("applicant_name", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("gender", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("student_index_number", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("year_of_study", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("suggested_company", sa.String(), nullable=True))

    op.create_table(
        "profile_documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_profile_documents_id", "profile_documents", ["id"], unique=False)
    op.create_index("ix_profile_documents_user_id", "profile_documents", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_profile_documents_user_id", table_name="profile_documents")
    op.drop_index("ix_profile_documents_id", table_name="profile_documents")
    op.drop_table("profile_documents")

    op.drop_column("applications", "suggested_company")
    op.drop_column("applications", "year_of_study")
    op.drop_column("applications", "student_index_number")
    op.drop_column("applications", "gender")
    op.drop_column("applications", "applicant_name")

    op.drop_column("user_profiles", "cgpa_scale")
    op.drop_column("user_profiles", "cgpa")
    op.drop_column("user_profiles", "experience")
