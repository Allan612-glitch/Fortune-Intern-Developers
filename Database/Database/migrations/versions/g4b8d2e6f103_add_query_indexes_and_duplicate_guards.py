"""Add query indexes and a guard for duplicate profiles.

Revision ID: g4b8d2e6f103
Revises: f3a7c1d9e502
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "g4b8d2e6f103"
down_revision: Union[str, Sequence[str], None] = "f3a7c1d9e502"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _duplicate_exists(table: str, columns: tuple[str, ...], where: str = "") -> bool:
    column_list = ", ".join(columns)
    predicate = f" WHERE {where}" if where else ""
    result = op.get_bind().execute(
        sa.text(
            f"SELECT 1 FROM {table}{predicate} "
            f"GROUP BY {column_list} HAVING COUNT(*) > 1 LIMIT 1"
        )
    )
    return result.first() is not None


def upgrade() -> None:
    if _duplicate_exists("user_profiles", ("user_id",)):
        raise RuntimeError(
            "Cannot add unique user profile constraint: duplicate user_profiles.user_id values exist. "
            "Resolve the duplicate records manually, preserving required data, then rerun the migration."
        )
    op.create_index("ix_user_profiles_user_id", "user_profiles", ["user_id"], unique=True)
    op.create_index("ix_applications_user_id", "applications", ["user_id"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index(
        "ix_applications_active_user_program_applicant",
        "applications",
        ["user_id", "program_id", "applicant_name"],
        unique=False,
        postgresql_where=sa.text("status <> 'withdrawn' AND applicant_name IS NOT NULL"),
        sqlite_where=sa.text("status <> 'withdrawn' AND applicant_name IS NOT NULL"),
    )
    op.create_index(
        "ix_applications_active_user_program_student_index",
        "applications",
        ["user_id", "program_id", "student_index_number"],
        unique=False,
        postgresql_where=sa.text("status <> 'withdrawn' AND student_index_number IS NOT NULL"),
        sqlite_where=sa.text("status <> 'withdrawn' AND student_index_number IS NOT NULL"),
    )
    op.create_index(
        "ix_applications_active_user_program_without_identity",
        "applications",
        ["user_id", "program_id"],
        unique=False,
        postgresql_where=sa.text(
            "status <> 'withdrawn' AND applicant_name IS NULL AND student_index_number IS NULL"
        ),
        sqlite_where=sa.text(
            "status <> 'withdrawn' AND applicant_name IS NULL AND student_index_number IS NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index("ix_applications_active_user_program_without_identity", table_name="applications")
    op.drop_index("ix_applications_active_user_program_student_index", table_name="applications")
    op.drop_index("ix_applications_active_user_program_applicant", table_name="applications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_index("ix_applications_user_id", table_name="applications")
    op.drop_index("ix_user_profiles_user_id", table_name="user_profiles")
