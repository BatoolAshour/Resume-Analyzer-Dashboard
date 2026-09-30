"""Shapes of the JSON each Groq task is asked to return (see services/prompts.py)."""

from typing import Any

from pydantic import BaseModel, field_validator

from app.schemas.analysis import (
    EducationFit,
    ExperienceFit,
    LearningStep,
    Recommendation,
    ResumeQuality,
    clean_learning_path,
    clean_recommendations,
)
from app.schemas.fields import Score, StrList, Text


class AtsCheckResult(ResumeQuality):
    ats_score: Score
    detected_skills: StrList = []
    summary: Text = ""
    recommendations: list[Recommendation] = []

    @field_validator("recommendations", mode="before")
    @classmethod
    def _clean_recommendations(cls, value: Any) -> list[Any]:
        return clean_recommendations(value)


class SkillsResult(BaseModel):
    matched_skills: StrList = []
    missing_skills: StrList = []
    keyword_coverage_percent: Score


class ScoringResult(BaseModel):
    match_percent: Score
    ats_score: Score
    experience: ExperienceFit = ExperienceFit()
    education: EducationFit = EducationFit()

    @field_validator("experience", "education", mode="before")
    @classmethod
    def _null_to_default(cls, value: Any) -> Any:
        return {} if value is None else value


class RecommendationsResult(BaseModel):
    recommendations: list[Recommendation] = []
    learning_path: list[LearningStep] = []
    summary: Text = ""

    @field_validator("recommendations", mode="before")
    @classmethod
    def _clean_recommendations(cls, value: Any) -> list[Any]:
        return clean_recommendations(value)

    @field_validator("learning_path", mode="before")
    @classmethod
    def _clean_learning_path(cls, value: Any) -> list[Any]:
        return clean_learning_path(value)
