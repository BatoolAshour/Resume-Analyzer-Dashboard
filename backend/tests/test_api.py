from contextlib import contextmanager

from fastapi.testclient import TestClient

from app.api.deps import get_analyzer
from app.config import Settings
from app.errors import LLMRateLimited
from app.main import app
from app.schemas.llm import AtsCheckResult, SkillsResult
from app.services.analyzer import ResumeAnalyzer
from app.services.llm import LLMClient

from .conftest import JOB_TEXT, FakeLLM


@contextmanager
def client_for(llm, settings):
    """A test client whose analyzer uses the given LLM stand-in."""
    app.dependency_overrides[get_analyzer] = lambda: ResumeAnalyzer(llm, settings)
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["limits"]["allowed_extensions"] == [".pdf", ".docx", ".txt"]
    assert "key" not in str(body).lower()


def test_ats_analysis(client, resume_file):
    response = client.post("/api/analyze/ats", files=resume_file)
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "ats"
    assert body["ats_score"] == 82  # "82%" is normalised
    assert body["detected_skills"] == ["Python", "SQL", "Docker"]  # de-duplicated
    assert [r["priority"] for r in body["recommendations"]] == ["critical", "low"]
    assert body["meta"]["filename"] == "resume.txt"
    assert body["meta"]["word_count"] > 10


def test_match_analysis(client, resume_file, fake_llm):
    response = client.post(
        "/api/analyze/match", files=resume_file, data={"job_description": JOB_TEXT}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "match"
    assert body["match_percent"] == 76
    assert body["skills_match_percent"] == 75  # 3 of 4 skills
    assert body["experience"] == {"years_found": 5.0, "years_required": 3.0, "verdict": "above"}
    assert body["education"]["match"] is True
    assert body["learning_path"][0]["skill"] == "Kubernetes"
    assert body["recommended_skills"] == ["Kubernetes"]
    assert body["resume_quality"]["missing_sections"] == ["Summary"]
    assert body["warnings"] == []
    # The resume and the job description both reach the model.
    skills_prompt = next(p for schema, p in fake_llm.prompts if schema is SkillsResult)
    assert "Jane Doe" in skills_prompt and "Kubernetes" in skills_prompt


def test_match_accepts_job_description_file(client, resume_file):
    files = {**resume_file, "job_description_file": ("jd.txt", JOB_TEXT.encode(), "text/plain")}
    response = client.post("/api/analyze/match", files=files)
    assert response.status_code == 200


def test_match_degrades_when_quality_check_fails(settings, resume_file):
    llm = FakeLLM(failures={AtsCheckResult: LLMRateLimited("slow down")})
    with client_for(llm, settings) as client:
        response = client.post(
            "/api/analyze/match", files=resume_file, data={"job_description": JOB_TEXT}
        )
    body = response.json()
    assert response.status_code == 200
    assert body["resume_quality"] is None
    assert len(body["warnings"]) == 1


def test_match_requires_job_description(client, resume_file):
    response = client.post("/api/analyze/match", files=resume_file)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "missing_job_description"


def test_missing_resume(client):
    response = client.post("/api/analyze/ats")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "missing_resume"


def test_rejects_unsupported_file_type(client):
    files = {"resume": ("resume.png", b"\x89PNG....", "image/png")}
    response = client.post("/api/analyze/ats", files=files)
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "invalid_file_type"


def test_rejects_corrupt_pdf(client):
    files = {"resume": ("resume.pdf", b"this is not a pdf", "application/pdf")}
    response = client.post("/api/analyze/ats", files=files)
    assert response.status_code == 422
    assert response.json()["error"]["code"] in {"unreadable_file", "empty_document"}


def test_rejects_empty_file(client):
    files = {"resume": ("resume.txt", b"", "text/plain")}
    response = client.post("/api/analyze/ats", files=files)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "empty_document"


def test_rejects_oversized_file(client):
    files = {"resume": ("resume.txt", b"a" * (5 * 1024 * 1024 + 1), "text/plain")}
    response = client.post("/api/analyze/ats", files=files)
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "file_too_large"


def test_llm_errors_surface_as_json(settings, resume_file):
    llm = FakeLLM(failures={AtsCheckResult: LLMRateLimited("Slow down.")})
    with client_for(llm, settings) as client:
        response = client.post("/api/analyze/ats", files=resume_file)
    assert response.status_code == 429
    assert response.json() == {"error": {"code": "llm_rate_limited", "message": "Slow down."}}


def test_missing_api_key_returns_503(resume_file):
    settings = Settings(_env_file=None, groq_api_key=None)
    with client_for(LLMClient(settings), settings) as client:
        response = client.post("/api/analyze/ats", files=resume_file)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "llm_not_configured"


def test_cors_allows_local_frontend(client):
    response = client.options(
        "/api/analyze/ats",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
