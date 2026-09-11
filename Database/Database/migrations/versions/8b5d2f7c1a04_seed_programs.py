"""seed development programs

Revision ID: 8b5d2f7c1a04
Revises: 7a4f8c2e1d90
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8b5d2f7c1a04"
down_revision: Union[str, Sequence[str], None] = "7a4f8c2e1d90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    programs = [
        (
            "Software Engineering Intern",
            "Build practical web applications with an experienced product team.",
            "Fortune Intern Network",
            "Technology",
            "Remote",
            "3 months",
            "Python, JavaScript, Git",
        ),
        (
            "Data Analytics Fellow",
            "Turn real datasets into useful insights for Ghanaian organisations.",
            "Accra Analytics",
            "Data",
            "Accra, Ghana",
            "6 months",
            "Python, SQL, Excel",
        ),
        (
            "Digital Marketing Intern",
            "Plan campaigns and grow digital communities for emerging brands.",
            "Coastal Brands",
            "Marketing",
            "Hybrid",
            "4 months",
            "Content, Strategy, Social Media",
        ),
    ]
    for name, description, company, category, location, duration, skills in programs:
        op.execute(
            sa.text(
                """INSERT INTO programs (id, name, description, company, category, status, location, duration, skills, created_at, updated_at)
                SELECT gen_random_uuid(), :name, :description, :company, :category, 'open', :location, :duration, :skills, NOW(), NOW()
                WHERE NOT EXISTS (SELECT 1 FROM programs WHERE name = :name)"""
            ).bindparams(
                name=name,
                description=description,
                company=company,
                category=category,
                location=location,
                duration=duration,
                skills=skills,
            )
        )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DELETE FROM programs WHERE name IN (:software, :data, :marketing)"
        ).bindparams(
            software="Software Engineering Intern",
            data="Data Analytics Fellow",
            marketing="Digital Marketing Intern",
        )
    )