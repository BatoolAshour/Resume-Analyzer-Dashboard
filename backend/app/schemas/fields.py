"""Lenient field types for data that originates from an LLM.

Models occasionally return "85%" instead of 85, a bare string instead of a list,
or repeat the same item twice. These types normalise that instead of failing.
"""

import re
from typing import Annotated, Any, Literal

from pydantic import BeforeValidator

_NUMBER = re.compile(r"-?\d+(?:\.\d+)?")
_NULLISH = {"", "null", "none", "n/a", "na", "unknown", "not specified"}


def _to_number(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        found = _NUMBER.search(value)
        return float(found.group()) if found else None
    return None


def _to_score(value: Any) -> int:
    number = _to_number(value)
    if number is None:
        raise ValueError("expected a number between 0 and 100")
    return max(0, min(100, round(number)))


def _to_optional_score(value: Any) -> int | None:
    number = _to_number(value)
    return None if number is None else max(0, min(100, round(number)))


def _to_optional_number(value: Any) -> float | None:
    number = _to_number(value)
    return None if number is None else max(0.0, round(number, 1))


def _to_optional_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return None if text.casefold() in _NULLISH else text


def _to_text(value: Any) -> str:
    return "" if value is None else str(value).strip()


def _to_str_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, (list, tuple)):
        return []
    items, seen = [], set()
    for item in value:
        if not isinstance(item, (str, int, float)) or isinstance(item, bool):
            continue
        text = str(item).strip()
        key = text.casefold()
        if text and key not in seen:
            seen.add(key)
            items.append(text)
    return items


def one_of(options: tuple[str, ...], default: str):
    def coerce(value: Any) -> str:
        text = str(value or "").strip().casefold()
        return text if text in options else default

    return coerce


PRIORITIES = ("critical", "high", "medium", "low")
CATEGORIES = ("skills", "keywords", "experience", "education", "formatting", "content")
VERDICTS = ("meets", "above", "below", "unclear")

Score = Annotated[int, BeforeValidator(_to_score)]
OptionalScore = Annotated[int | None, BeforeValidator(_to_optional_score)]
OptionalNumber = Annotated[float | None, BeforeValidator(_to_optional_number)]
OptionalText = Annotated[str | None, BeforeValidator(_to_optional_text)]
Text = Annotated[str, BeforeValidator(_to_text)]
StrList = Annotated[list[str], BeforeValidator(_to_str_list)]

Priority = Annotated[
    Literal["critical", "high", "medium", "low"],
    BeforeValidator(one_of(PRIORITIES, "medium")),
]
Category = Annotated[
    Literal["skills", "keywords", "experience", "education", "formatting", "content"],
    BeforeValidator(one_of(CATEGORIES, "content")),
]
Verdict = Annotated[
    Literal["meets", "above", "below", "unclear"],
    BeforeValidator(one_of(VERDICTS, "unclear")),
]
