from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.api.deps import get_analyzer, get_auditor
from app.config import Settings, get_settings
from app.errors import EmptyDocument, MissingJobDescription
from app.schemas.analysis import AtsAnalysis, ErrorResponse, MatchAnalysis
from app.schemas.report import FullReport
from app.services.analyzer import ResumeAnalyzer
from app.services.report import ResumeAuditor
from app.services.resume_parser import (
    MIN_TEXT_CHARS,
    ParsedDocument,
    parse_document,
    parse_text,
)

router = APIRouter(
    prefix="/analyze",
    tags=["analysis"],
    responses={
        code: {"model": ErrorResponse} for code in (413, 415, 422, 429, 502, 503)
    },
)

ResumeFile = File(..., description="Resume as PDF, DOCX or TXT")
JobDescriptionText = Form(None, description="Job description text")
JobDescriptionFile = File(
    None, description="Job description as PDF, DOCX or TXT (alternative to text)"
)


def _read(upload: UploadFile, max_bytes: int) -> bytes:
    # Read one byte past the limit so oversized files are detected without
    # loading the whole thing into memory.
    return upload.file.read(max_bytes + 1)


def _parse_resume(upload: UploadFile, settings: Settings) -> ParsedDocument:
    return parse_document(
        upload.filename or "",
        _read(upload, settings.max_upload_bytes),
        max_bytes=settings.max_upload_bytes,
        max_chars=settings.max_resume_chars,
    )


def _parse_job_description(
    text: str | None, upload: UploadFile | None, settings: Settings
) -> str | None:
    """The job description from pasted text or an attached file; None if neither was sent."""
    if text and text.strip():
        jd = parse_text(
            text, filename="job-description", max_chars=settings.max_job_description_chars
        )
        if len(jd.text) < MIN_TEXT_CHARS:
            raise EmptyDocument(
                "The job description is too short to compare against. Paste the full posting."
            )
        return jd.text
    if upload is not None and upload.filename:
        return parse_document(
            upload.filename,
            _read(upload, settings.max_upload_bytes),
            max_bytes=settings.max_upload_bytes,
            max_chars=settings.max_job_description_chars,
            label="job description",
        ).text
    return None


# Plain `def` endpoints: the Groq client is synchronous, so FastAPI runs these
# in its threadpool instead of blocking the event loop.
@router.post("/ats", response_model=AtsAnalysis)
def analyze_ats(
    resume: UploadFile = ResumeFile,
    settings: Settings = Depends(get_settings),
    analyzer: ResumeAnalyzer = Depends(get_analyzer),
) -> AtsAnalysis:
    """Check a resume's ATS-friendliness on its own (no job description)."""
    return analyzer.analyze_ats(_parse_resume(resume, settings))


@router.post("/match", response_model=MatchAnalysis)
def analyze_match(
    resume: UploadFile = ResumeFile,
    job_description: str | None = JobDescriptionText,
    job_description_file: UploadFile | None = JobDescriptionFile,
    settings: Settings = Depends(get_settings),
    analyzer: ResumeAnalyzer = Depends(get_analyzer),
) -> MatchAnalysis:
    """Compare a resume against a job description."""
    jd = _parse_job_description(job_description, job_description_file, settings)
    if jd is None:
        raise MissingJobDescription(
            "A job description is required for Job Match. Paste the text or attach a file."
        )
    return analyzer.analyze_match(_parse_resume(resume, settings), jd)


@router.post("/full-report", response_model=FullReport)
def analyze_full_report(
    resume: UploadFile = ResumeFile,
    job_description: str | None = JobDescriptionText,
    job_description_file: UploadFile | None = JobDescriptionFile,
    settings: Settings = Depends(get_settings),
    auditor: ResumeAuditor = Depends(get_auditor),
) -> FullReport:
    """Full Resume Audit Report. The job description is optional: with one, skills
    and keywords are compared against it; without one, the resume is judged on its own."""
    jd = _parse_job_description(job_description, job_description_file, settings)
    return auditor.audit(_parse_resume(resume, settings), jd)
