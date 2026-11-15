_KNUST_NAMES = (
    "KNUST",
    "Kwame Nkrumah University of Science and Technology",
)
_KNUST_NAMES_NORMALIZED = {name.casefold() for name in _KNUST_NAMES}


def _normalize_university_name(name: str) -> str:
    return " ".join(name.split()).casefold()


def canonical_university(name: str | None) -> str | None:
    if name is None:
        return None

    cleaned_name = " ".join(name.split())
    if _normalize_university_name(cleaned_name) in _KNUST_NAMES_NORMALIZED:
        return "KNUST"
    return cleaned_name or None


def university_match_values(name: str) -> tuple[str, ...]:
    normalized_name = _normalize_university_name(name)
    if normalized_name in _KNUST_NAMES_NORMALIZED:
        return tuple(alias.casefold() for alias in _KNUST_NAMES)
    return (normalized_name,)
