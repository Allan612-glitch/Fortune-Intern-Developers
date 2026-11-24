from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, field_validator, model_validator

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)]
WorkMode = Literal["", "onsite", "hybrid", "remote"]
OpportunityKind = Literal["internship", "industrial_attachment", "national_service", "graduate_role", "other"]


class OpportunityDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: OpportunityKind = "internship"
    work_mode: WorkMode = ""
    compensation: Literal["unspecified", "paid", "unpaid"] = "unspecified"
    compensation_details: ShortText = ""
    eligible_courses: list[ShortText] = Field(default_factory=list, max_length=20)
    eligible_years: list[Annotated[int, Field(ge=1, le=6)]] = Field(default_factory=list, max_length=6)
    eligibility: str = Field("", max_length=1600)
    response_by: date | None = None
    employer_verified: bool = False
    accepts_ghana_remote: bool | None = None
    requires_institution_letter: bool | None = None


class CareerPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location: ShortText = ""
    work_mode: WorkMode = ""
    available_from: date | None = None
    portfolio_url: str = Field("", max_length=500)

    @field_validator("portfolio_url")
    @classmethod
    def validate_portfolio(cls, value: str):
        if not value.strip():
            return ""
        url = HttpUrl(value.strip())
        if url.username or url.password:
            raise ValueError("Enter a portfolio link without embedded credentials")
        return str(url)


class StudentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=800)]
    kind: Literal["update", "action", "interview"] = "update"
    due: date | None = None


class OpportunityDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    firstName: ShortText = ""
    lastName: ShortText = ""
    gender: ShortText = ""
    phone: ShortText = ""
    institution: ShortText = ""
    otherInstitution: ShortText = ""
    program: ShortText = ""
    year: ShortText = ""
    indexNumber: ShortText = ""
    companyName: ShortText = ""
    companyAddress: str = Field("", max_length=400)
    suggestedCompany: ShortText = ""


class StudentOpportunityUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    saved: bool | None = None
    remind: bool | None = None
    draft: OpportunityDraft | None = None

    @model_validator(mode="after")
    def check_update(self):
        if not self.model_fields_set:
            raise ValueError("Choose at least one change")
        return self
