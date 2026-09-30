"""
Resume analysis, split into small focused Groq calls (instead of one big call).
Each task can use its own model — see config.py.

ATS check (resume only):
    ats_check              -> ATS score, sections, formatting issues, strengths,
                              prioritized recommendations

Job match (resume + job description):
    1. extract_skills        -> matched/missing skills, keyword coverage
    2. score_match           -> match %, ATS score, experience/education fit
    3. build_recommendations -> prioritized recommendations, learning path, summary
    plus ats_check, run alongside step 1, for the resume-quality findings.
"""

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from app.config import Settings
from app.errors import AppError
from app.schemas.analysis import AnalysisMeta, AtsAnalysis, MatchAnalysis, ResumeQuality
from app.schemas.llm import AtsCheckResult, RecommendationsResult, ScoringResult, SkillsResult
from app.services import prompts
from app.services.llm import LLMClient
from app.services.resume_parser import ParsedDocument

logger = logging.getLogger(__name__)

MAX_DETECTED_SKILLS = 12
MAX_COMPARED_SKILLS = 10


def _join(items: list[str]) -> str:
    return ", ".join(items) or "none"


class ResumeAnalyzer:
    def __init__(self, llm: LLMClient, settings: Settings):
        self._llm = llm
        self._settings = settings

    # ---------- Individual tasks ----------
    def ats_check(self, resume_text: str) -> AtsCheckResult:
        prompt = prompts.ATS_CHECK_PROMPT.format(
            resume=resume_text,
            max_skills=MAX_DETECTED_SKILLS,
            recommendation_schema=prompts.RECOMMENDATION_SCHEMA,
            recommendation_rules=prompts.RECOMMENDATION_RULES,
        )
        return self._llm.complete(self._settings.model_ats_check, prompt, AtsCheckResult)

    def extract_skills(self, resume_text: str, jd_text: str) -> SkillsResult:
        prompt = prompts.SKILLS_PROMPT.format(
            resume=resume_text, jd=jd_text, max_skills=MAX_COMPARED_SKILLS
        )
        return self._llm.complete(self._settings.model_skills, prompt, SkillsResult)

    def score_match(self, resume_text: str, jd_text: str, skills: SkillsResult) -> ScoringResult:
        prompt = prompts.SCORING_PROMPT.format(
            resume=resume_text,
            jd=jd_text,
            matched_skills=_join(skills.matched_skills),
            missing_skills=_join(skills.missing_skills),
        )
        return self._llm.complete(self._settings.model_scoring, prompt, ScoringResult)

    def build_recommendations(
        self,
        skills: SkillsResult,
        scoring: ScoringResult,
        quality: ResumeQuality | None,
    ) -> RecommendationsResult:
        prompt = prompts.RECOMMEND_PROMPT.format(
            recommendation_schema=prompts.RECOMMENDATION_SCHEMA,
            recommendation_rules=prompts.RECOMMENDATION_RULES,
            matched_skills=_join(skills.matched_skills),
            missing_skills=_join(skills.missing_skills),
            match_percent=scoring.match_percent,
            ats_score=scoring.ats_score,
            keyword_coverage=skills.keyword_coverage_percent,
            years_found=scoring.experience.years_found,
            years_required=scoring.experience.years_required,
            experience_verdict=scoring.experience.verdict,
            education_found=scoring.education.found,
            education_required=scoring.education.required,
            education_match=scoring.education.match,
            missing_sections=_join(quality.missing_sections) if quality else "unknown",
            formatting_issues=_join(quality.formatting_issues) if quality else "unknown",
        )
        return self._llm.complete(
            self._settings.model_recommendations, prompt, RecommendationsResult
        )

    # ---------- Orchestration ----------
    def analyze_ats(self, resume: ParsedDocument) -> AtsAnalysis:
        """Standalone ATS-friendliness check on the resume alone."""
        started = time.perf_counter()
        result = self.ats_check(resume.text)
        return AtsAnalysis(
            **result.model_dump(),
            meta=self._meta(resume, started, [self._settings.model_ats_check]),
        )

    def analyze_match(self, resume: ParsedDocument, job_description: str) -> MatchAnalysis:
        """Full comparison of the resume against a job description."""
        started = time.perf_counter()
        warnings: list[str] = []

        # The resume-quality check does not depend on the job description, so it
        # runs alongside skill extraction rather than adding to the wait.
        with ThreadPoolExecutor(max_workers=1) as pool:
            quality_future = pool.submit(self.ats_check, resume.text)
            skills = self.extract_skills(resume.text, job_description)
            scoring = self.score_match(resume.text, job_description, skills)
            try:
                quality = ResumeQuality(**quality_future.result().model_dump(
                    include=set(ResumeQuality.model_fields)
                ))
            except AppError as exc:
                # The comparison is still useful without it; say so rather than fail.
                logger.warning("Resume-quality check failed: %s", exc.message)
                quality = None
                warnings.append(
                    "The resume-quality check (strengths, sections, formatting) "
                    "could not be completed for this run."
                )

        recs = self.build_recommendations(skills, scoring, quality)

        total = len(skills.matched_skills) + len(skills.missing_skills)
        return MatchAnalysis(
            match_percent=scoring.match_percent,
            ats_score=scoring.ats_score,
            keyword_coverage_percent=skills.keyword_coverage_percent,
            skills_match_percent=round(100 * len(skills.matched_skills) / total) if total else None,
            matched_skills=skills.matched_skills,
            missing_skills=skills.missing_skills,
            recommended_skills=[step.skill for step in recs.learning_path],
            experience=scoring.experience,
            education=scoring.education,
            learning_path=recs.learning_path,
            recommendations=recs.recommendations,
            summary=recs.summary,
            resume_quality=quality,
            warnings=warnings,
            meta=self._meta(
                resume,
                started,
                [
                    self._settings.model_skills,
                    self._settings.model_scoring,
                    self._settings.model_recommendations,
                    self._settings.model_ats_check,
                ],
            ),
        )

    def _meta(self, resume: ParsedDocument, started: float, models: list[str]) -> AnalysisMeta:
        return AnalysisMeta(
            filename=resume.filename,
            word_count=resume.word_count,
            truncated=resume.truncated,
            models=list(dict.fromkeys(models)),
            duration_ms=round((time.perf_counter() - started) * 1000),
            analyzed_at=datetime.now(timezone.utc),
        )
