"""Checks that keep model output tied to what the resume actually says.

Prompts ask the model not to invent anything; these checks enforce the two
cases that can be verified mechanically.
"""

import re

_WORD = re.compile(r"[a-z0-9]+")
# Figures the source states on their own, e.g. the 35 of "35%" but not the 3 of "S3".
_DIGITS = re.compile(r"(?<!\w)\d+(?:[.,]\d+)*")

# A standalone figure such as "35%", "$40k", "3x" or "12". Digits inside words
# (p95, S3, OAuth2) and inside existing placeholders ([X%]) are left alone.
_FIGURE = re.compile(r"(?<![\w\[])[$€£]?(\d+(?:[.,]\d+)*)(\s?%|\+|[kKmMxX](?![A-Za-z]))?")

# Share of a quote's words that must occur in the source. Below 1.0 so that
# small differences from text extraction do not reject a real quote.
QUOTE_MATCH_THRESHOLD = 0.8

PLACEHOLDER = re.compile(r"\[[^\[\]]{1,40}\]")


def words(text: str) -> list[str]:
    return _WORD.findall(text.casefold())


def is_quoted_from(quote: str, source_words: set[str]) -> bool:
    """True when `quote` plausibly comes from the text `source_words` was built from."""
    quote_words = words(quote)
    if not quote_words:
        return False
    found = sum(word in source_words for word in quote_words)
    return found / len(quote_words) >= QUOTE_MATCH_THRESHOLD


def mask_unsupported_figures(text: str, source: str) -> str:
    """Replace figures that do not appear in `source` with a placeholder.

    A rewritten bullet may only keep numbers the resume already states; any
    other figure was made up, so it becomes [X%] or [X] for the user to fill in.
    """
    known = set(_DIGITS.findall(source))

    def replace(match: re.Match) -> str:
        if match.group(1) in known:
            return match.group(0)
        return "[X%]" if (match.group(2) or "").strip() == "%" else "[X]"

    return _FIGURE.sub(replace, text)


_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE_CANDIDATE = re.compile(r"\+?\d[\d\s().-]{7,}\d")
MIN_PHONE_DIGITS = 9  # more than a date range such as "2020-2022"


def has_email(text: str) -> bool:
    return bool(_EMAIL.search(text))


def has_phone(text: str) -> bool:
    return any(
        sum(char.isdigit() for char in candidate) >= MIN_PHONE_DIGITS
        for candidate in _PHONE_CANDIDATE.findall(text)
    )


def has_placeholder(text: str) -> bool:
    return bool(PLACEHOLDER.search(text))
