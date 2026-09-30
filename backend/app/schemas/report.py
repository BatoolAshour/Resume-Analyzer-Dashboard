"""Schemas for the Full Resume Audit Report (POST /api/analyze/full-report).

Every list the model returns goes through a lenient cleaner, so one malformed
entry is dropped instead of failing the whole report.
"""

from typing import Annotated, Any, Literal

from pydantic import BaseModel, BeforeValidator, field_validator

from app.schemas.analysis import AnalysisMeta
from app.schemas.fields import (
    PRIORITIES,
    OptionalScore,
    OptionalText,
    Priority,
    StrList,
    Text,
    one_of,
)

GAP_STATUSES = ("missing", "weak", "recommended")
RATINGS = ("strong", "adequate", "weak")
ATS_STATUSES = ("pass", "warning", "fail")
ATS_AREAS = (
    "readability",
    "section_naming",
    "formatting",
    "keywords",
    "skills_visibility",
    "contact_info",
    "parsing",
)
BULLET_ISSUES = ("vague", "repetitive", "no_action_verb", "no_metric", "responsibility", "too_long")
WRITING_TYPES = (
    "grammar",
    "weak_wording",
    "repetition",
    "unprofessional",
    "buzzwords",
    "long_sentence",
    "tense",
    "other",
)


def _slug(value: Any) -> str:
    return str(value or "").strip().casefold().replace("-", "_").replace(" ", "_")


def _slug_one_of(options: tuple[str, ...], default: str):
    def coerce(value: Any) -> str:
        slug = _slug(value)
        return slug if slug in options else default

    return coerce


def _to_bullet_issues(value: Any) -> list[str]:
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    return list(dict.fromkeys(s for s in map(_slug, value) if s in BULLET_ISSUES))


def _objects(required: str, *, from_string: bool = False):
    """Keep only dict items whose `required` field is non-empty."""

    def clean(value: Any) -> list[Any]:
        if not isinstance(value, list):
            return []
        items = []
        for item in value:
            if isinstance(item, BaseModel):
                item = item.model_dump()
            if from_string and isinstance(item, str):
                item = {required: item}
            if isinstance(item, dict) and str(item.get(required) or "").strip():
                items.append(item)
        return items

    return clean


def _object_or_none(value: Any) -> Any:
    return value if isinstance(value, (dict, BaseModel)) else None


def by_priority(items: list[Any]) -> list[Any]:
    """Order Critical -> High -> Medium -> Low, keeping the model's order within each."""
    return sorted(items, key=lambda item: PRIORITIES.index(item.priority))


GapStatus = Annotated[
    Literal["missing", "weak", "recommended"], BeforeValidator(one_of(GAP_STATUSES, "missing"))
]
Rating = Annotated[
    Literal["strong", "adequate", "weak"], BeforeValidator(one_of(RATINGS, "adequate"))
]
AtsStatus = Annotated[
    Literal["pass", "warning", "fail"], BeforeValidator(one_of(ATS_STATUSES, "warning"))
]
AtsAreaName = Annotated[
    Literal[
        "readability", "section_naming", "formatting", "keywords",
        "skills_visibility", "contact_info", "parsing", "other",
    ],
    BeforeValidator(_slug_one_of(ATS_AREAS, "other")),
]
WritingType = Annotated[
    Literal[
        "grammar", "weak_wording", "repetition", "unprofessional",
        "buzzwords", "long_sentence", "tense", "other",
    ],
    BeforeValidator(_slug_one_of(WRITING_TYPES, "other")),
]
BulletIssue = Literal[
    "vague", "repetitive", "no_action_verb", "no_metric", "responsibility", "too_long"
]


# ---------- Findings ----------
class ContentGap(BaseModel):
    """Expected information that is absent (or an optional addition)."""

    item: Text
    status: GapStatus = "missing"
    priority: Priority = "medium"
    what: Text = ""
    why: Text = ""
    fix: Text = ""


class ContentCheck(ContentGap):
    """One line of the model's content checklist; "present" items are not gaps."""

    status: Annotated[
        Literal["present", "missing", "weak", "recommended"],
        BeforeValidator(one_of(("present", *GAP_STATUSES), "missing")),
    ] = "missing"


class SectionReview(BaseModel):
    section: Text
    rating: Rating = "adequate"
    good: StrList = []
    weak: StrList = []
    missing: StrList = []
    improvements: StrList = []


class BulletReview(BaseModel):
    source: Text = ""
    current: Text
    issues: Annotated[list[BulletIssue], BeforeValidator(_to_bullet_issues)] = []
    problem: Text = ""
    suggested: Text = ""
    priority: Priority = "medium"
    # True when `suggested` contains placeholders like [X%] the user must fill in.
    needs_real_numbers: bool = False


class WritingIssue(BaseModel):
    type: WritingType = "other"
    original: Text
    problem: Text = ""
    suggestion: Text = ""
    priority: Priority = "low"


class AtsArea(BaseModel):
    area: AtsAreaName = "other"
    status: AtsStatus = "warning"
    finding: Text
    fix: Text = ""
    priority: Priority = "medium"


class AtsAudit(BaseModel):
    score: OptionalScore = None
    summary: Text = ""
    areas: Annotated[list[AtsArea], BeforeValidator(_objects("finding"))] = []


class SkillItem(BaseModel):
    name: Text
    note: Text = ""


SkillList = Annotated[list[SkillItem], BeforeValidator(_objects("name", from_string=True))]


class SkillsAudit(BaseModel):
    # The field the resume appears to target, as judged from its content.
    field: OptionalText = None
    # What "recommended" and "irrelevant" were judged against. Set by the server.
    basis: Literal["job_description", "resume_field"] = "resume_field"
    strong: SkillList = []
    weak: SkillList = []
    recommended: SkillList = []
    irrelevant: SkillList = []


class BulletAnalysis(BaseModel):
    summary: Text = ""
    items: list[BulletReview] = []


# ---------- Summary and plan ----------
class ExecutiveSummary(BaseModel):
    overall_quality: Text = ""
    ats_readiness: Text = ""
    top_strengths: StrList = []
    top_problems: StrList = []


class ActionItem(BaseModel):
    id: str = ""
    task: Text
    detail: Text = ""


ActionList = Annotated[list[ActionItem], BeforeValidator(_objects("task", from_string=True))]


class ActionPlan(BaseModel):
    fix_now: ActionList = []
    improve_next: ActionList = []
    optional: ActionList = []

    @property
    def is_empty(self) -> bool:
        return not (self.fix_now or self.improve_next or self.optional)


class ReportStats(BaseModel):
    """Findings counted by severity: critical / high / medium + low priority."""

    critical: int = 0
    warnings: int = 0
    improvements: int = 0


class FullReport(BaseModel):
    """Result of POST /api/analyze/full-report.

    Each part comes from its own model call. A part that could not be generated
    is null and explained in `warnings`; the rest of the report is still returned.
    """

    mode: Literal["report"] = "report"
    has_job_description: bool
    overall_score: OptionalScore = None
    executive_summary: ExecutiveSummary | None = None
    stats: ReportStats
    missing_content: list[ContentGap] | None = None
    # Expected items that were checked and found in the resume.
    content_present: list[str] = []
    section_reviews: list[SectionReview] | None = None
    bullets: BulletAnalysis | None = None
    writing: list[WritingIssue] | None = None
    ats: AtsAudit | None = None
    skills: SkillsAudit | None = None
    action_plan: ActionPlan
    warnings: list[str] = []
    meta: AnalysisMeta


# ---------- Shapes of the JSON each report task returns ----------
class ContentResult(BaseModel):
    # The model gives a verdict on every expected item; the service splits that
    # into what is present and what is missing.
    content_check: Annotated[list[ContentCheck], BeforeValidator(_objects("item"))] = []
    missing_content: Annotated[list[ContentGap], BeforeValidator(_objects("item"))] = []
    content_present: StrList = []
    section_reviews: Annotated[list[SectionReview], BeforeValidator(_objects("section"))] = []


class BulletsResult(BaseModel):
    bullet_summary: Text = ""
    bullets: Annotated[list[BulletReview], BeforeValidator(_objects("current"))] = []
    writing: Annotated[list[WritingIssue], BeforeValidator(_objects("original"))] = []


class AtsSkillsResult(BaseModel):
    ats: AtsAudit | None = None
    skills: SkillsAudit | None = None

    @field_validator("ats", "skills", mode="before")
    @classmethod
    def _ignore_non_objects(cls, value: Any) -> Any:
        return _object_or_none(value)


class SynthesisResult(ExecutiveSummary):
    overall_score: OptionalScore = None
    action_plan: ActionPlan = ActionPlan()

    @field_validator("action_plan", mode="before")
    @classmethod
    def _null_to_empty(cls, value: Any) -> Any:
        return value if isinstance(value, (dict, BaseModel)) else {}
