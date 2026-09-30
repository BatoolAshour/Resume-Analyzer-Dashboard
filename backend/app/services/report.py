"""
Full Resume Audit Report, built from four focused Groq calls.

Run side by side:
    1. review_content         -> missing content, section-by-section review
    2. review_bullets         -> weak bullets with rewrites, writing issues
    3. review_ats_and_skills  -> ATS analysis, skills analysis
Then, from their findings:
    4. synthesize             -> overall score, executive summary, action plan

Each part is independent: if one call fails, that part of the report is left
empty with a warning and the rest is still returned.
"""

import json
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from app.config import Settings
from app.errors import AppError
from app.schemas.analysis import AnalysisMeta
from app.schemas.report import (
    ATS_AREAS,
    ActionItem,
    ActionPlan,
    AtsAudit,
    AtsSkillsResult,
    BulletAnalysis,
    BulletReview,
    BulletsResult,
    ContentGap,
    ContentResult,
    ExecutiveSummary,
    FullReport,
    ReportStats,
    SkillItem,
    SkillsAudit,
    SynthesisResult,
    WritingIssue,
    by_priority,
)
from app.services import report_prompts as prompts
from app.services.grounding import (
    has_email,
    has_phone,
    has_placeholder,
    is_quoted_from,
    mask_unsupported_figures,
    words,
)
from app.services.llm import LLMClient
from app.services.resume_parser import ParsedDocument

logger = logging.getLogger(__name__)

MAX_TOP_ITEMS = 3
MAX_TASKS_PER_GROUP = 8

PART_LABELS = {
    "content": "The missing-content and section review",
    "bullets": "The bullet and writing review",
    "ats_skills": "The ATS and skills analysis",
}
SYNTHESIS_WARNING = (
    "The executive summary and overall score are missing from this report, "
    "so the action plan was built directly from the findings."
)
# Words that indicate a section is really present in the resume text.
SECTION_MARKERS = {
    "experience": ("experience", "employment", "work history", "career"),
    "education": ("education", "academic", "university", "college", "degree", "school"),
    "projects": ("project",),
    "skills": ("skill", "technologies", "competenc", "tools"),
    "certifications": ("certif", "licen", "course"),
}
# Leading list markers copied along with a quoted line.
BULLET_MARKER = re.compile(r"^[\s\-–—•*·▪◦]+")
# Content that strengthens a resume but is not expected on every one.
OPTIONAL_CONTENT = ("projects", "certifications")
DEMOTED_SKILL_NOTE = "Appears only once in the resume — add evidence of where you used it."


def _shorten(text: str, limit: int = 70) -> str:
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


class ResumeAuditor:
    def __init__(self, llm: LLMClient, settings: Settings):
        self._llm = llm
        self._settings = settings

    def _complete(self, prompt: str, schema):
        return self._llm.complete(
            self._settings.model_report,
            prompt,
            schema,
            max_tokens=self._settings.groq_report_max_tokens,
            json_mode=True,
        )

    # ---------- Individual tasks ----------
    def review_content(self, resume_text: str, job_description: str | None) -> ContentResult:
        result = self._complete(prompts.content_prompt(resume_text, job_description), ContentResult)
        # Asking for a verdict on every item (rather than "list what is missing")
        # stops the model from skipping the checklist when it answers quickly.
        for check in result.content_check:
            # "Dates (on every experience and education entry)" -> "Dates"
            check.item = re.sub(r"\s*\(.*\)\s*$", "", check.item) or check.item
            if check.status != "present" and check.item.casefold() in OPTIONAL_CONTENT:
                check.status = "recommended"
        gaps = [
            ContentGap(**check.model_dump())
            for check in result.content_check
            if check.status != "present"
        ]
        listed = {gap.item.casefold() for gap in gaps}
        gaps += [gap for gap in result.missing_content if gap.item.casefold() not in listed]
        result.content_present = [
            check.item for check in result.content_check if check.status == "present"
        ]
        self._verify_contact_details(gaps, result.content_present, resume_text)
        result.missing_content = by_priority(gaps)
        lowered = resume_text.casefold()
        # A summary has no telltale keyword, so rely on the checklist verdict for it.
        has_summary = not any(gap.item.casefold().endswith("summary") for gap in gaps)
        result.section_reviews = [
            review
            for review in result.section_reviews
            if self._section_exists(review.section, lowered)
            and (has_summary or not review.section.casefold().endswith("summary"))
        ]
        return result

    def review_bullets(self, resume_text: str, job_description: str | None) -> BulletsResult:
        result = self._complete(prompts.bullets_prompt(resume_text, job_description), BulletsResult)
        resume_words = set(words(resume_text))
        for quoted in (*result.bullets, *result.writing):
            # "- Built dashboards" -> "Built dashboards"
            field = "current" if isinstance(quoted, BulletReview) else "original"
            setattr(quoted, field, BULLET_MARKER.sub("", getattr(quoted, field)))
        result.bullets = by_priority(
            [self._ground_bullet(b, resume_text) for b in result.bullets
             if self._is_quote(b.current, resume_words, "bullet")]
        )
        # A line already covered as a weak bullet is not reported a second time.
        bullet_lines = {tuple(words(b.current)) for b in result.bullets}
        writing = [
            issue
            for issue in result.writing
            if self._is_quote(issue.original, resume_words, "writing issue")
            and tuple(words(issue.original)) not in bullet_lines
        ]
        for issue in writing:
            issue.suggestion = mask_unsupported_figures(issue.suggestion, resume_text)
        result.writing = by_priority(writing)
        return result

    def review_ats_and_skills(
        self, resume_text: str, job_description: str | None
    ) -> AtsSkillsResult:
        result = self._complete(
            prompts.ats_skills_prompt(resume_text, job_description), AtsSkillsResult
        )
        if result.ats:
            order = {name: index for index, name in enumerate(ATS_AREAS)}
            result.ats.areas.sort(key=lambda area: order.get(area.area, len(order)))
        if result.skills:
            self._ground_skills(result.skills, resume_text)
            # Decided by whether a job description was sent, never by the model.
            result.skills.basis = "job_description" if job_description else "resume_field"
        return result

    def synthesize(self, findings: dict, has_job_description: bool) -> SynthesisResult:
        prompt = prompts.synthesis_prompt(
            json.dumps(findings, ensure_ascii=False), has_job_description
        )
        return self._complete(prompt, SynthesisResult)

    # ---------- Grounding ----------
    @staticmethod
    def _is_quote(text: str, resume_words: set[str], kind: str) -> bool:
        """Drop findings about text that is not actually in the resume."""
        if is_quoted_from(text, resume_words):
            return True
        logger.warning("Dropped a %s that does not quote the resume: %r", kind, _shorten(text))
        return False

    @staticmethod
    def _verify_contact_details(gaps: list[ContentGap], present: list[str], resume_text: str) -> None:
        """An email address and a phone number can be checked for directly, so do
        not rely on the model having noticed that one is absent."""
        if any(gap.item.casefold().startswith("contact") for gap in gaps):
            return
        absent = [
            label
            for label, found in (("email address", has_email), ("phone number", has_phone))
            if not found(resume_text)
        ]
        if not absent:
            return
        present[:] = [item for item in present if not item.casefold().startswith("contact")]
        missing = " or ".join(absent)
        gaps.append(
            ContentGap(
                item="Contact information",
                status="missing",
                priority="critical" if "email address" in absent else "high",
                what=f"No {missing} was found in the resume.",
                why="Recruiters and ATS application forms need a direct way to reach you.",
                fix=f"Add your {' and '.join(absent)} at the top of the resume.",
            )
        )

    @staticmethod
    def _section_exists(section: str, resume_lowered: str) -> bool:
        """A section can only be reviewed if the resume shows some sign of it."""
        markers = SECTION_MARKERS.get(section.casefold())
        if markers is None:  # e.g. Summary, which has no reliable keyword
            return True
        if any(marker in resume_lowered for marker in markers):
            return True
        logger.warning("Dropped the review of a section the resume does not have: %s", section)
        return False

    @staticmethod
    def _ground_bullet(bullet: BulletReview, resume_text: str) -> BulletReview:
        """A rewrite may only keep figures the resume states; the rest become placeholders."""
        bullet.suggested = mask_unsupported_figures(bullet.suggested, resume_text)
        bullet.needs_real_numbers = has_placeholder(bullet.suggested)
        return bullet

    @staticmethod
    def _ground_skills(skills: SkillsAudit, resume_text: str) -> None:
        """Make the skill categories consistent with the resume text.

        A skill can only be "strong", "weak" or "irrelevant" if it is on the
        resume, only "strong" if it appears more than once (listed and used),
        and only "recommended" if it is not there already. Each skill ends up
        in one category.
        """
        resume_words = set(words(resume_text))
        lowered = resume_text.casefold()
        seen: set[str] = set()

        def claim(items: list[SkillItem], *, on_resume: bool) -> list[SkillItem]:
            kept = []
            for skill in items:
                key = skill.name.casefold()
                if key in seen or is_quoted_from(skill.name, resume_words) != on_resume:
                    continue
                seen.add(key)
                kept.append(skill)
            return kept

        strong, demoted = [], []
        for skill in claim(skills.strong, on_resume=True):
            if lowered.count(skill.name.casefold()) == 1:
                demoted.append(SkillItem(name=skill.name, note=DEMOTED_SKILL_NOTE))
            else:
                strong.append(skill)
        skills.strong = strong
        skills.irrelevant = claim(skills.irrelevant, on_resume=True)
        skills.weak = claim(skills.weak, on_resume=True) + demoted
        skills.recommended = claim(skills.recommended, on_resume=False)

    # ---------- Orchestration ----------
    def audit(self, resume: ParsedDocument, job_description: str | None = None) -> FullReport:
        started = time.perf_counter()
        job_description = job_description or None
        warnings: list[str] = []

        tasks = {
            "content": self.review_content,
            "bullets": self.review_bullets,
            "ats_skills": self.review_ats_and_skills,
        }
        with ThreadPoolExecutor(max_workers=len(tasks)) as pool:
            futures = {
                name: pool.submit(task, resume.text, job_description)
                for name, task in tasks.items()
            }

        parts: dict = {}
        errors: list[AppError] = []
        for name, future in futures.items():
            try:
                parts[name] = future.result()
            except AppError as exc:
                logger.warning("Report part %r failed: %s", name, exc.message)
                errors.append(exc)
                warnings.append(f"{PART_LABELS[name]} is missing from this report. {exc.message}")
        if not parts:
            # Nothing to report on (e.g. no API key, provider down): surface the cause.
            raise errors[0]

        content: ContentResult | None = parts.get("content")
        bullets: BulletsResult | None = parts.get("bullets")
        ats_skills: AtsSkillsResult | None = parts.get("ats_skills")
        ats: AtsAudit | None = ats_skills.ats if ats_skills else None

        try:
            synthesis = self.synthesize(
                self._findings_digest(content, bullets, ats_skills), job_description is not None
            )
        except AppError as exc:
            logger.warning("Report synthesis failed: %s", exc.message)
            synthesis = None
            warnings.append(f"{SYNTHESIS_WARNING} {exc.message}")

        if synthesis and not synthesis.action_plan.is_empty:
            plan = synthesis.action_plan
        else:
            plan = self._plan_from_findings(content, bullets, ats)

        summary = None
        if synthesis and (synthesis.overall_quality or synthesis.top_problems):
            summary = ExecutiveSummary(
                overall_quality=synthesis.overall_quality,
                ats_readiness=synthesis.ats_readiness or (ats.summary if ats else ""),
                top_strengths=synthesis.top_strengths[:MAX_TOP_ITEMS],
                top_problems=synthesis.top_problems[:MAX_TOP_ITEMS],
            )

        return FullReport(
            has_job_description=job_description is not None,
            overall_score=synthesis.overall_score if synthesis else None,
            executive_summary=summary,
            stats=self._stats(content, bullets, ats),
            missing_content=content.missing_content if content else None,
            content_present=content.content_present if content else [],
            section_reviews=content.section_reviews if content else None,
            bullets=(
                BulletAnalysis(summary=bullets.bullet_summary, items=bullets.bullets)
                if bullets
                else None
            ),
            writing=bullets.writing if bullets else None,
            ats=ats,
            skills=ats_skills.skills if ats_skills else None,
            action_plan=self._with_ids(plan),
            warnings=warnings,
            meta=AnalysisMeta(
                filename=resume.filename,
                word_count=resume.word_count,
                truncated=resume.truncated,
                models=[self._settings.model_report],
                duration_ms=round((time.perf_counter() - started) * 1000),
                analyzed_at=datetime.now(timezone.utc),
            ),
        )

    # ---------- Derived data ----------
    @staticmethod
    def _prioritized(
        content: ContentResult | None, bullets: BulletsResult | None, ats: AtsAudit | None
    ) -> list:
        """Every finding that carries a priority, across all parts of the report."""
        findings: list = []
        if content:
            findings += content.missing_content
        if bullets:
            findings += bullets.bullets + bullets.writing
        if ats:
            findings += [area for area in ats.areas if area.status != "pass"]
        return findings

    def _stats(self, content, bullets, ats) -> ReportStats:
        priorities = [finding.priority for finding in self._prioritized(content, bullets, ats)]
        return ReportStats(
            critical=priorities.count("critical"),
            warnings=priorities.count("high"),
            improvements=priorities.count("medium") + priorities.count("low"),
        )

    @staticmethod
    def _findings_digest(
        content: ContentResult | None,
        bullets: BulletsResult | None,
        ats_skills: AtsSkillsResult | None,
    ) -> dict:
        """A compact view of the findings for the synthesis prompt."""
        digest: dict = {}
        if content:
            digest["missing_content"] = [
                gap.model_dump(include={"item", "status", "priority", "fix"})
                for gap in content.missing_content
            ]
            digest["sections"] = [
                review.model_dump(include={"section", "rating", "good", "weak", "missing"})
                for review in content.section_reviews
            ]
        if bullets:
            digest["weak_bullets"] = [
                bullet.model_dump(include={"current", "problem", "priority"})
                for bullet in bullets.bullets
            ]
            digest["writing_issues"] = [
                issue.model_dump(include={"type", "problem", "priority"})
                for issue in bullets.writing
            ]
        if ats_skills and ats_skills.ats:
            digest["ats"] = {
                "score": ats_skills.ats.score,
                "passed": [a.area for a in ats_skills.ats.areas if a.status == "pass"],
                "issues": [
                    area.model_dump(include={"area", "status", "finding", "priority"})
                    for area in ats_skills.ats.areas
                    if area.status != "pass"
                ],
            }
        if ats_skills and ats_skills.skills:
            digest["skills"] = {
                "well_demonstrated": [s.name for s in ats_skills.skills.strong],
                "weakly_demonstrated": [s.name for s in ats_skills.skills.weak],
                "recommended": [s.name for s in ats_skills.skills.recommended],
            }
        return digest

    def _plan_from_findings(self, content, bullets, ats) -> ActionPlan:
        """Fallback plan when the synthesis call fails: one task per finding."""
        groups: dict[str, list[ActionItem]] = {"fix_now": [], "improve_next": [], "optional": []}
        group_for = {"critical": "fix_now", "high": "improve_next"}

        for finding in by_priority(self._prioritized(content, bullets, ats)):
            if isinstance(finding, BulletReview):
                task = f'Rewrite the bullet "{_shorten(finding.current)}"'
                detail = finding.problem
            elif isinstance(finding, WritingIssue):
                task = f'Fix the wording of "{_shorten(finding.original)}"'
                detail = finding.problem
            else:  # ContentGap or AtsArea: both carry the fix itself
                task = finding.fix or getattr(finding, "item", "") or finding.finding
                detail = getattr(finding, "why", "") or getattr(finding, "finding", "")
            group = groups[group_for.get(finding.priority, "optional")]
            if task and len(group) < MAX_TASKS_PER_GROUP:
                group.append(ActionItem(task=task, detail="" if detail == task else detail))
        return ActionPlan(**groups)

    @staticmethod
    def _with_ids(plan: ActionPlan) -> ActionPlan:
        """Stable ids so the frontend can track which tasks are ticked off."""
        for group in ("fix_now", "improve_next", "optional"):
            items = getattr(plan, group)[:MAX_TASKS_PER_GROUP]
            for index, item in enumerate(items, start=1):
                item.id = f"{group}-{index}"
            setattr(plan, group, items)
        return plan
