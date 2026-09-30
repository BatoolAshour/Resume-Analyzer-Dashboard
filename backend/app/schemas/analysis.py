"""Response schemas for the public API."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.fields import (
    PRIORITIES,
    Category,
    OptionalNumber,
    OptionalText,
    Priority,
    Score,
    StrList,
    Text,
    Verdict,
)


class Recommendation(BaseModel):
    priority: Priority = "medium"
    category: Category = "content"
    title: Text
    action: Text = ""
    reason: Text = ""


class LearningStep(BaseModel):
    skill: Text
    reason: Text = ""


def clean_recommendations(value: Any) -> list[Any]:
    """Drop malformed entries and order Critical -> High -> Medium -> Low."""
    if not isinstance(value, list):
        return []
    items = []
    for item in value:
        if isinstance(item, Recommendation):
            item = item.model_dump()
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        action = str(item.get("action") or "").strip()
        if not title and not action:
            continue
        items.append({**item, "title": title or action, "action": action})

    def rank(item: dict) -> int:
        priority = str(item.get("priority") or "").strip().casefold()
        return PRIORITIES.index(priority) if priority in PRIORITIES else PRIORITIES.index("medium")

    return sorted(items, key=rank)


def clean_learning_path(value: Any) -> list[Any]:
    """Accept either plain skill names or {skill, reason} objects."""
    if not isinstance(value, list):
        return []
    items, seen = [], set()
    for item in value:
        if isinstance(item, LearningStep):
            item = item.model_dump()
        if isinstance(item, str):
            item = {"skill": item}
        if not isinstance(item, dict):
            continue
        skill = str(item.get("skill") or "").strip()
        if skill and skill.casefold() not in seen:
            seen.add(skill.casefold())
            items.append({**item, "skill": skill})
    return items


class ExperienceFit(BaseModel):
    years_found: OptionalNumber = None
    years_required: OptionalNumber = None
    verdict: Verdict = "unclear"


class EducationFit(BaseModel):
    found: OptionalText = None
    required: OptionalText = None
    # None when the model could not tell (e.g. the job lists no requirement).
    match: bool | None = None


class ResumeQuality(BaseModel):
    """Resume-only findings: how well the document itself is put together."""

    strengths: StrList = []
    detected_sections: StrList = []
    missing_sections: StrList = []
    formatting_issues: StrList = []


class AnalysisMeta(BaseModel):
    filename: str
    word_count: int
    truncated: bool = Field(description="True when the resume was cut to the length limit.")
    models: list[str]
    duration_ms: int
    analyzed_at: datetime


class _AnalysisBase(BaseModel):
    summary: Text = ""
    recommendations: list[Recommendation] = []
    warnings: list[str] = []
    meta: AnalysisMeta

    @field_validator("recommendations", mode="before")
    @classmethod
    def _clean_recommendations(cls, value: Any) -> list[Any]:
        return clean_recommendations(value)


class AtsAnalysis(_AnalysisBase, ResumeQuality):
    """Result of POST /api/analyze/ats (resume only)."""

    mode: Literal["ats"] = "ats"
    ats_score: Score
    detected_skills: StrList = []


class MatchAnalysis(_AnalysisBase):
    """Result of POST /api/analyze/match (resume vs. job description)."""

    mode: Literal["match"] = "match"
    match_percent: Score
    ats_score: Score
    keyword_coverage_percent: Score
    # Share of the job's skills found in the resume; None if the job lists none.
    skills_match_percent: int | None = None
    matched_skills: StrList = []
    missing_skills: StrList = []
    recommended_skills: StrList = []
    experience: ExperienceFit
    education: EducationFit
    learning_path: list[LearningStep] = []
    # None when the resume-quality check could not be completed.
    resume_quality: ResumeQuality | None = None

    @field_validator("learning_path", mode="before")
    @classmethod
    def _clean_learning_path(cls, value: Any) -> list[Any]:
        return clean_learning_path(value)


class UploadLimits(BaseModel):
    max_upload_mb: int
    allowed_extensions: list[str]


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    version: str
    llm_configured: bool
    model: str
    limits: UploadLimits


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
