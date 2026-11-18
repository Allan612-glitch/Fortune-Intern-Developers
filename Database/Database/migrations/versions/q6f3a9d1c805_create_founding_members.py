"""create founding members

Revision ID: q6f3a9d1c805
Revises: p5c9e2a7f104
Create Date: 2026-11-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "q6f3a9d1c805"
down_revision: Union[str, Sequence[str], None] = "p5c9e2a7f104"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    founding_members = op.create_table(
        "founding_members",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("photo", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.bulk_insert(
        founding_members,
        [
            {
                "id": "f1",
                "name": "Emmanuel Amoasi",
                "title": "Founder & Managing Director",
                "bio": "Founded Fortune Intern Network and leads national strategy, corporate partnerships and the campus chapter ecosystem.",
                "email": "amoasie173@gmail.com",
                "phone": "+233 25 703 8948",
                "photo": None,
            },
            {
                "id": "f2",
                "name": "Prof. Prince Boakye Frimpong",
                "title": "Founding Patron",
                "bio": "Senior academic faculty member providing institutional guidance, academic backing and administrative oversight since ratification.",
                "email": "",
                "phone": "+233 26 235 8269",
                "photo": None,
            },
            {
                "id": "f3",
                "name": "Mawuli Diekpor",
                "title": "Founding General Secretary · KNUST",
                "bio": "Kept the founding records, minutes and official correspondence of the first chapter at KNUST.",
                "email": "",
                "phone": "",
                "photo": None,
            },
            {
                "id": "f4",
                "name": "",
                "title": "Founding Campus Ambassador · KNUST",
                "bio": "Open founding seat — first institutional envoy of the network.",
                "email": "",
                "phone": "",
                "photo": None,
            },
            {
                "id": "f5",
                "name": "",
                "title": "Founding Chapter President · KNUST",
                "bio": "Open founding seat — first president of the pioneer chapter.",
                "email": "",
                "phone": "",
                "photo": None,
            },
            {
                "id": "f6",
                "name": "",
                "title": "Founding Operations Lead",
                "bio": "Open founding seat — first national operations coordinator.",
                "email": "",
                "phone": "",
                "photo": None,
            },
        ],
    )


def downgrade() -> None:
    op.drop_table("founding_members")
