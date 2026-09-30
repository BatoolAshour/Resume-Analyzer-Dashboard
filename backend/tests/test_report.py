from contextlib import contextmanager

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_auditor
from app.errors import LLMInvalidOutput, LLMRateLimited
from app.main import app
from app.schemas.report import AtsSkillsResult, BulletsResult, ContentResult, SynthesisResult
from app.services.grounding import (
    has_email,
    has_phone,
    has_placeholder,
    is_quoted_from,
    mask_unsupported_figures,
    words,
)
from app.services.report import ResumeAuditor

from .conftest import JOB_TEXT, FakeLLM

RESUME = """Omar Khalil
omar.khalil@example.com

Experience
Data Analyst, Brightline Retail, 2021 - now
- Worked on a machine learning project.
- Built Power BI dashboards used by 12 store managers.

Education
Bachelor of Science in Statistics

Skills
Python, SQL, Power BI, Photoshop
"""

CONTENT = {
    "content_check": [
        {"item": "Skills", "status": "present", "priority": "low", "what": "", "why": "", "fix": ""},
        {"item": "Education", "status": "Present"},
        {"item": "Certifications", "status": "recommended", "priority": "low",
         "what": "No certifications.", "why": "They validate skills.", "fix": "Add any you hold."},
        {"item": "Professional summary", "status": "missing", "priority": "critical",
         "what": "No summary.", "why": "Recruiters skim.", "fix": "Add a 2-3 line summary."},
        {"status": "missing"},  # no item: dropped
        "junk",
    ],
    "section_reviews": [
        {"section": "Experience", "rating": "WEAK", "good": ["Clear titles"],
         "weak": ["Vague bullets"], "missing": ["Results"], "improvements": ["Quantify impact"]},
        # The resume has no such sections, so they cannot be reviewed.
        {"section": "Certifications", "rating": "adequate", "good": ["Relevant"]},
        {"section": "Summary", "rating": "weak", "weak": ["Too generic"]},
    ],
}
BULLETS = {
    "bullet_summary": "Bullets are vague.",
    "bullets": [
        {"source": "Data Analyst", "current": "- Worked on a machine learning project.",
         "issues": ["vague", "No Metric", "made_up_issue"], "problem": "Too vague.",
         "suggested": "Built [what you built], improving accuracy by 27% for 12 managers.",
         "priority": "high"},
        # Not a line from the resume: the model made it up.
        {"current": "Led a team of 40 engineers across three continents.",
         "problem": "x", "suggested": "y", "priority": "critical"},
    ],
    "writing": [
        # Same line as the weak bullet above: not reported twice.
        {"type": "weak_wording", "original": "Worked on a machine learning project.",
         "problem": "Weak verb.", "suggestion": "Developed a machine learning project."},
        {"type": "Long Sentence", "original": "Built Power BI dashboards used by 12 store managers.",
         "problem": "Could be tighter.", "suggestion": "Built Power BI dashboards for 12 managers.",
         "priority": "low"},
    ],
}
ATS_SKILLS = {
    "ats": {
        "score": "64",
        "summary": "Mostly parseable.",
        "areas": [
            {"area": "Contact Info", "status": "fail", "finding": "No phone number.",
             "fix": "Add a phone number.", "priority": "critical"},
            {"area": "readability", "status": "pass", "finding": "Reads cleanly.", "fix": ""},
            {"area": "keywords", "status": "warning", "finding": "Few keywords.",
             "fix": "Add role keywords.", "priority": "medium"},
        ],
    },
    "skills": {
        "field": "Data analytics",
        "basis": "job_description",  # the server decides this, not the model
        "strong": [
            {"name": "Power BI", "note": "Built dashboards."},
            {"name": "Python", "note": "Used in ML."},      # listed once only -> weak
            {"name": "Kubernetes", "note": "Deployed."},   # not on the resume -> dropped
        ],
        "weak": ["SQL"],
        "recommended": [{"name": "Tableau", "note": "Common in BI."}, {"name": "SQL", "note": "x"}],
        "irrelevant": [{"name": "Photoshop", "note": "Unrelated to analytics."}],
    },
}
SYNTHESIS = {
    "overall_score": 58,
    "overall_quality": "Relevant but thin.",
    "ats_readiness": "Parseable with gaps.",
    "top_strengths": ["a", "b", "c", "d"],
    "top_problems": ["No summary", "Vague bullets", "No phone"],
    "action_plan": {
        "fix_now": [{"task": "Add a professional summary", "detail": "2-3 lines."}],
        "improve_next": ["Quantify the dashboards bullet"],
        "optional": None,
    },
}


def report_llm(**overrides):
    payloads = {
        ContentResult: CONTENT,
        BulletsResult: BULLETS,
        AtsSkillsResult: ATS_SKILLS,
        SynthesisResult: SYNTHESIS,
    }
    return FakeLLM(payloads=payloads, **overrides)


@contextmanager
def client_for(llm, settings):
    app.dependency_overrides[get_auditor] = lambda: ResumeAuditor(llm, settings)
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def post_report(client, **data):
    files = {"resume": ("resume.txt", RESUME.encode(), "text/plain")}
    return client.post("/api/analyze/full-report", files=files, data=data or None)


@pytest.fixture
def report(settings):
    with client_for(report_llm(), settings) as client:
        response = post_report(client)
    assert response.status_code == 200
    return response.json()


def test_report_structure(report):
    assert report["mode"] == "report"
    assert report["has_job_description"] is False
    assert report["overall_score"] == 58
    assert report["executive_summary"]["top_strengths"] == ["a", "b", "c"]  # capped at 3
    assert report["warnings"] == []
    assert report["meta"]["filename"] == "resume.txt"


def test_findings_are_cleaned_and_ordered(report):
    # Malformed entries dropped, most urgent first.
    assert [g["item"] for g in report["missing_content"]] == [
        "Professional summary", "Contact information", "Certifications",
    ]
    assert report["missing_content"][2]["status"] == "recommended"
    assert report["content_present"] == ["Skills", "Education"]
    assert report["ats"]["score"] == 64
    assert [a["area"] for a in report["ats"]["areas"]] == ["readability", "keywords", "contact_info"]


def test_missing_phone_number_is_detected_without_the_model(report):
    # The stubbed model never mentions contact details; the resume has no phone number.
    contact = next(g for g in report["missing_content"] if g["item"] == "Contact information")
    assert contact["status"] == "missing" and contact["priority"] == "high"
    assert "phone number" in contact["what"] and "email" not in contact["what"]


def test_sections_not_in_the_resume_are_not_reviewed(report):
    assert [r["section"] for r in report["section_reviews"]] == ["Experience"]
    assert report["section_reviews"][0]["rating"] == "weak"


def test_invented_bullets_are_dropped_and_invented_numbers_masked(report):
    bullets = report["bullets"]["items"]
    assert [b["current"] for b in bullets] == ["Worked on a machine learning project."]
    # 27% is not in the resume; 12 is.
    assert bullets[0]["suggested"] == "Built [what you built], improving accuracy by [X%] for 12 managers."
    assert bullets[0]["needs_real_numbers"] is True
    assert bullets[0]["issues"] == ["vague", "no_metric"]


def test_writing_issues_do_not_repeat_bullets(report):
    assert [w["type"] for w in report["writing"]] == ["long_sentence"]


def test_skill_categories_are_grounded_in_the_resume(report):
    skills = report["skills"]
    assert skills["basis"] == "resume_field"
    assert [s["name"] for s in skills["strong"]] == ["Power BI"]
    assert [s["name"] for s in skills["weak"]] == ["SQL", "Python"]
    assert [s["name"] for s in skills["recommended"]] == ["Tableau"]
    assert [s["name"] for s in skills["irrelevant"]] == ["Photoshop"]


def test_stats_count_findings_by_priority(report):
    # critical: summary gap + ATS contact info; high: the weak bullet + missing phone;
    # medium/low: certifications gap, keywords, the writing issue.
    assert report["stats"] == {"critical": 2, "warnings": 2, "improvements": 3}


def test_action_plan_has_stable_ids(report):
    plan = report["action_plan"]
    assert plan["fix_now"] == [
        {"id": "fix_now-1", "task": "Add a professional summary", "detail": "2-3 lines."}
    ]
    assert plan["improve_next"][0]["id"] == "improve_next-1"
    assert plan["optional"] == []


def test_job_description_is_used_when_given(settings):
    llm = report_llm()
    with client_for(llm, settings) as client:
        body = post_report(client, job_description=JOB_TEXT).json()
    assert body["has_job_description"] is True
    assert body["skills"]["basis"] == "job_description"
    prompts = {schema: prompt for schema, prompt in llm.prompts}
    assert "Kubernetes" in prompts[AtsSkillsResult]  # from the job description
    assert "Required:" in prompts[AtsSkillsResult]
    # The synthesis works from the findings, not from the resume again.
    assert "omar.khalil@example.com" not in prompts[SynthesisResult]


def test_without_job_description_skills_are_only_suggestions(settings):
    llm = report_llm()
    with client_for(llm, settings) as client:
        post_report(client)
    prompt = next(p for schema, p in llm.prompts if schema is AtsSkillsResult)
    assert "No job description was provided" in prompt
    assert "suggestions, not requirements" in prompt


def test_one_failed_part_leaves_the_rest_of_the_report(settings):
    llm = report_llm(failures={BulletsResult: LLMRateLimited("Slow down.")})
    with client_for(llm, settings) as client:
        response = post_report(client)
    body = response.json()
    assert response.status_code == 200
    assert body["bullets"] is None and body["writing"] is None
    assert body["missing_content"] and body["ats"]
    assert body["warnings"] == [
        "The bullet and writing review is missing from this report. Slow down."
    ]


def test_failed_synthesis_falls_back_to_a_plan_from_the_findings(settings):
    llm = report_llm(failures={SynthesisResult: LLMInvalidOutput("Unreadable.")})
    with client_for(llm, settings) as client:
        body = post_report(client).json()
    assert body["overall_score"] is None
    assert body["executive_summary"] is None
    assert len(body["warnings"]) == 1
    plan = body["action_plan"]
    assert [t["task"] for t in plan["fix_now"]] == ["Add a 2-3 line summary.", "Add a phone number."]
    assert [t["task"] for t in plan["improve_next"]][0] == "Add your phone number at the top of the resume."
    assert plan["improve_next"][1]["task"].startswith('Rewrite the bullet "Worked on a machine')
    assert len(plan["optional"]) == 3


def test_incomplete_model_output_still_renders(settings):
    llm = FakeLLM(
        payloads={
            ContentResult: {"content_check": None},
            BulletsResult: {},
            AtsSkillsResult: {"ats": "n/a", "skills": {"strong": None}},
            SynthesisResult: {"overall_score": "unknown", "action_plan": None},
        }
    )
    with client_for(llm, settings) as client:
        response = post_report(client)
    body = response.json()
    assert response.status_code == 200
    assert body["overall_score"] is None
    assert body["executive_summary"] is None
    assert [g["item"] for g in body["missing_content"]] == ["Contact information"]
    assert body["bullets"]["items"] == []
    assert body["ats"] is None
    assert body["skills"]["strong"] == []
    assert body["stats"] == {"critical": 0, "warnings": 1, "improvements": 0}
    # No plan came back, so one is built from the single finding.
    assert [t["task"] for t in body["action_plan"]["improve_next"]] == [
        "Add your phone number at the top of the resume."
    ]


def test_report_fails_when_every_part_fails(settings):
    failure = LLMRateLimited("Slow down.")
    llm = report_llm(
        failures={ContentResult: failure, BulletsResult: failure, AtsSkillsResult: failure}
    )
    with client_for(llm, settings) as client:
        response = post_report(client)
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "llm_rate_limited"


def test_report_validates_the_upload(settings):
    with client_for(report_llm(), settings) as client:
        response = client.post(
            "/api/analyze/full-report", files={"resume": ("cv.png", b"\x89PNG", "image/png")}
        )
    assert response.status_code == 415


# ---------- grounding helpers ----------
def test_mask_keeps_figures_the_resume_states():
    source = "Cut p95 latency by 35% across 40k daily requests on S3."
    text = "Cut p95 latency by 35%, saving $20k and 3x faster for 40k requests on S3 [X%]."
    assert mask_unsupported_figures(text, source) == (
        "Cut p95 latency by 35%, saving [X] and [X] faster for 40k requests on S3 [X%]."
    )


def test_quote_matching_tolerates_small_differences():
    source = set(words("- Built REST APIs in Python (FastAPI), serving 40k requests"))
    assert is_quoted_from("Built REST APIs in Python, serving 40k requests.", source)
    assert not is_quoted_from("Managed a team of five engineers", source)
    assert not is_quoted_from("", source)


def test_contact_detection():
    assert has_email("reach me: jane.doe+cv@mail.example.org") and not has_email("jane at mail")
    assert has_phone("Tel +962 7 0000 0000") and has_phone("(555) 010-2030 x4")
    assert not has_phone("Engineer, 2020-2022 and 2023 - 2024")  # date ranges are not phones


def test_placeholder_detection():
    assert has_placeholder("Improved [metric] by [X%]")
    assert not has_placeholder("Improved accuracy by 35%")
