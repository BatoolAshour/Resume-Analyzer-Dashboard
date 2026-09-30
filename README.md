# AI Resume Analyzer

Upload a resume to check how applicant tracking systems read it, compare it
against a job description, or get a full audit that says exactly what to change.

**Stack:** Next.js + TypeScript + Tailwind (frontend) · FastAPI + Pydantic + Groq (backend).
The Groq API key stays in the backend and is never sent to the browser.

## Features

| Mode | Input | You get |
|---|---|---|
| **ATS Check** | Resume | ATS score, missing sections, formatting issues, strengths, prioritized fixes |
| **Job Match** | Resume + job description | Match %, skills and keyword coverage, experience and education fit, skill gaps, learning path |
| **Full Audit** | Resume (job description optional) | Missing content, section reviews, bullet rewrites, ATS, skills and writing analysis, action checklist, downloadable report |

Resumes can be PDF, DOCX or TXT, up to 5 MB.

## Setup

Requires Python 3.10+ and Node.js 20.9+.

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then set GROQ_API_KEY
uvicorn app.main:app --reload
```

API at http://localhost:8000, docs at http://localhost:8000/docs.

**Frontend** (second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `GROQ_API_KEY` | — | Required. Set in `backend/.env`. |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Model for every task. List yours with `python -m scripts.check_models`. |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Origins allowed to call the API. |
| `MAX_UPLOAD_MB` | `5` | Upload size limit. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend address. Set in `frontend/.env.local`. |

More options are in `backend/.env.example`.

## API

| Method | Path | Form fields |
|---|---|---|
| `GET` | `/api/health` | — |
| `POST` | `/api/analyze/ats` | `resume` |
| `POST` | `/api/analyze/match` | `resume`, plus `job_description` or `job_description_file` |
| `POST` | `/api/analyze/full-report` | `resume`, optionally `job_description` or `job_description_file` |

```bash
curl -X POST http://localhost:8000/api/analyze/ats -F resume=@resume.pdf
```

Errors are returned as `{ "error": { "code": "...", "message": "..." } }`.

## How it works

- `backend/app/services/resume_parser.py` extracts the text.
- `analyzer.py` runs ATS Check (one Groq call) and Job Match (four calls).
- `report.py` runs the Full Audit: three calls in parallel, then one that writes
  the summary and action plan. If one call fails, that part of the report is
  left out with a warning and the rest is still returned.
- Every model response is validated against a Pydantic schema.
- `grounding.py` keeps the audit tied to the resume: quoted lines must exist in
  it, numbers the resume doesn't state become `[X%]` placeholders, and skills
  are only rated if they are actually listed.

Scores are AI estimates and vary a little between runs.

**Rate limits:** a Full Audit uses roughly 6–10k tokens. On Groq's free tier
(about 8k tokens per minute) it usually takes a few seconds, but can take up to
a minute or return with one part missing if run right after another analysis.

## Development

```bash
cd backend && pip install -r requirements-dev.txt && pytest
```

```bash
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```
