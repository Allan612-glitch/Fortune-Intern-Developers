from datetime import date
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel


class Employer(SQLModel, table=True):
    __tablename__ = "placement_employers"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=160, index=True)
    contact_email: str = Field(default="", max_length=254)
    location: str = Field(default="", max_length=160)


class PlacementOpening(SQLModel, table=True):
    __tablename__ = "placement_openings"
    __table_args__ = (CheckConstraint("capacity > 0", name="placement_opening_positive_capacity"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    employer_id: UUID = Field(foreign_key="placement_employers.id", index=True)
    program_id: UUID = Field(foreign_key="programs.id", index=True)
    title: str = Field(max_length=160)
    capacity: int
    active: bool = True


class Placement(SQLModel, table=True):
    __tablename__ = "placements"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    application_id: UUID = Field(foreign_key="applications.id", ondelete="CASCADE", unique=True)
    opening_id: UUID = Field(foreign_key="placement_openings.id", index=True)
    status: str = Field(default="proposed", max_length=24)
    supervisor_name: str = Field(default="", max_length=160)
    start_date: date | None = None
    end_date: date | None = None
    feedback: str = Field(default="", max_length=2000)
