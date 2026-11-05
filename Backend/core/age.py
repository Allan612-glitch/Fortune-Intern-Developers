from datetime import date, datetime


def age_on(birth_date: date, today: date) -> int:
    return today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )


def requires_minor_review(birth_date: date | None, submitted_at: datetime) -> bool:
    return birth_date is not None and age_on(birth_date, submitted_at.date()) < 18
