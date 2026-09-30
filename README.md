# AI Resume Analyzer

Upload a resume to check how applicant tracking systems read it, compare it
against a job description, or get a full audit report that says exactly what to
change.

- **Frontend** — Next.js (App Router), TypeScript, Tailwind CSS
- **Backend** — FastAPI, Pydantic, Groq

The browser only ever talks to the FastAPI backend. The Groq API key lives in
the backend's `.env` and is never sent to the frontend.

## Features

**ATS Check** (resume only)
- ATS score, detected and missing sections, formatting issues, strengths,
  detected skills
- Recommendations ranked Critical → High → Medium → Low, each with what to
  change and why

**Job Match** (resume + job description)
- ATS score, job match %, skills match %, keyword coverage %
- Experience fit and education fit
- Matched, missing and recommended skills
- Resume strengths, missing sections, formatting issues
- Prioritized recommendations and an ordered learning path

**Full Audit** (resume, job description optional) — see
[Full Resume Audit Report](#full-resume-audit-report)
- Executive summary, overall score and counts of critical issues, warnings and
  improvements
- Missing content, section-by-section review, weak bullets with rewrites
- ATS analysis, skills analysis, language and writing quality
- A prioritized action checklist, and a downloadable report

Resumes can be PDF, DOCX or TXT (5 MB by default). The job description can be
pasted or attached as a file.

## Project structure

```
backend/
  app/
    main.py               FastAPI app, CORS, error handlers
    config.py             Settings loaded from .env
    errors.py             Typed errors -> HTTP status + error code
    api/
      deps.py             Shared dependencies
      routes/
        health.py         GET  /api/health
        analyze.py        POST /api/analyze/ats, /match, /full-report
    schemas/
      analysis.py         ATS Check and Job Match response models
      report.py           Full Audit response models and task shapes
      llm.py              Shape of each ATS / match task's JSON
      fields.py           Lenient field types for model output
    services/
      resume_parser.py    PDF / DOCX / TXT text extraction
      llm.py              Groq client: JSON parsing, validation, retry
      prompts.py          ATS Check and Job Match prompts
      analyzer.py         ATS Check and Job Match tasks and orchestration
      report_prompts.py   Full Audit prompts
      report.py           Full Audit tasks and orchestration
      grounding.py        Checks that tie model output to the resume text
  scripts/check_models.py Lists the models your Groq key can use
  tests/                  pytest suite (Groq is stubbed)
  requirements.txt
  .env.example

frontend/
  app/                    Layout, page, global styles and design tokens
  components/
    analyzer/             Upload, mode selector, job description, progress
    results/              Score ring, metrics, skills, recommendations, ...
    report/               Full Audit: tabs, panels, checklist
    layout/  landing/     Navbar, footer, hero, how-it-works
    providers/            API health context
    ui/                   Card, Badge, Button, Tooltip, ProgressBar, ...
  hooks/useAnalysis.ts    Request state: loading / success / error / retry
  lib/api.ts              Typed client for the backend
  lib/reportMarkdown.ts   Builds the downloadable report
  types/analysis.ts       Types mirroring the backend schemas
  .env.example
```

## Setup

Requirements: Python 3.10+ and Node.js 20.9+.

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then set GROQ_API_KEY in .env
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000 and interactive docs are at
http://localhost:8000/docs.

The `.env` file is read from `backend/.env` or from the repository root, so an
existing root-level `.env` keeps working.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

The frontend calls `http://localhost:8000` by default. To point it elsewhere,
copy `frontend/.env.example` to `frontend/.env.local` and change
`NEXT_PUBLIC_API_URL`.

## Configuration

Backend (`backend/.env`):

| Variable | Default | Purpose |
|---|---|---|
| `GROQ_API_KEY` | — | Required. Your Groq API key. |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Model used for every task. |
| `GROQ_MODEL_ATS_CHECK`, `GROQ_MODEL_SKILLS`, `GROQ_MODEL_SCORING`, `GROQ_MODEL_RECOMMENDATIONS`, `GROQ_MODEL_REPORT` | — | Optional per-task overrides. |
| `GROQ_MAX_TOKENS` | `3500` | Output budget per call. |
| `GROQ_REPORT_MAX_TOKENS` | `6000` | Output budget per Full Audit call. |
| `GROQ_MAX_RETRIES` | `4` | Retries when Groq rate-limits a call (it waits in between). |
| `GROQ_REASONING_EFFORT` | `low` | For reasoning models; set empty for models that don't support it. |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Origins allowed to call the API. |
| `MAX_UPLOAD_MB` | `5` | Upload size limit. |

Frontend (`frontend/.env.local`):

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Address of the backend. |

If you serve the frontend from another origin or port, add it to
`CORS_ORIGINS`.

## API

| Method | Path | Body (multipart form) | Returns |
|---|---|---|---|
| `GET` | `/api/health` | — | Status, model, upload limits, whether a key is set |
| `POST` | `/api/analyze/ats` | `resume` (file) | ATS report |
| `POST` | `/api/analyze/match` | `resume` (file) and `job_description` (text) or `job_description_file` (file) | Job match report |
| `POST` | `/api/analyze/full-report` | `resume` (file); optionally `job_description` or `job_description_file` | Full audit report |

```bash
curl -X POST http://localhost:8000/api/analyze/ats -F resume=@resume.pdf

curl -X POST http://localhost:8000/api/analyze/match \
  -F resume=@resume.pdf -F "job_description=<job.txt"

curl -X POST http://localhost:8000/api/analyze/full-report -F resume=@resume.pdf
```

Errors share one shape, with a stable `code` the frontend branches on:

```json
{ "error": { "code": "invalid_file_type", "message": "Unsupported file type '.png'. ..." } }
```

| Code | Status | Meaning |
|---|---|---|
| `invalid_file_type` | 415 | Not a PDF, DOCX or TXT |
| `file_too_large` | 413 | Over the upload limit |
| `unreadable_file`, `empty_document` | 422 | Corrupt file, or no extractable text (e.g. a scanned PDF) |
| `missing_resume`, `missing_job_description` | 422 | Required input missing |
| `llm_not_configured` | 503 | `GROQ_API_KEY` missing or rejected |
| `llm_rate_limited` | 429 | Groq is rate-limiting |
| `llm_unavailable`, `llm_invalid_output` | 502 | Groq error, or a response that couldn't be parsed |

## How the analysis works

1. `resume_parser.py` extracts and cleans the text of the upload.
2. `analyzer.py` runs the Groq tasks:
   - **ATS Check** — one call (`ats_check`) that scores the resume on its own.
   - **Job Match** — `extract_skills` → `score_match` → `build_recommendations`,
     with `ats_check` running in parallel for the resume-quality findings. If
     that side check fails, the report is still returned with a warning.
3. Every model response is parsed and validated against a Pydantic schema
   (`schemas/llm.py`); an empty or malformed answer is retried once.

Skills match % is computed from the matched and missing skill lists. All other
scores are the model's estimates and can vary a little between runs.

Extracted text keeps its line breaks, so headings, bullets and contact details
reach the model on their own lines, the way an ATS would read them.

## Full Resume Audit Report

Choose **Full Audit** in the app, or call `POST /api/analyze/full-report`. The
job description is optional: with one, skills and keywords are compared against
it; without one, the resume is judged on its own and recommended skills are
labelled as suggestions for its apparent field, never as requirements.

### What the report contains

| Tab | Content |
|---|---|
| Overview | Overall score, summary, ATS readiness, top 3 strengths, top 3 problems, counts of critical issues / warnings / improvements |
| Missing content | Each missing item with what is missing, why it matters, a priority and how to fix it — plus the expected items that are already there |
| Sections | Each existing section: what is good, weak, missing, and specific improvements (expandable) |
| Bullets | Weak experience/project bullets, the problem with each, and a suggested rewrite (before → after) |
| ATS | Readability, section naming, formatting, keywords, skills visibility, contact information, parsing — each pass / warning / fail |
| Skills | Strong, weakly demonstrated, missing/recommended, possibly irrelevant |
| Writing | Grammar, weak wording, repetition, buzzwords, long sentences, tense — with corrections |
| Action plan | A checklist in three groups: Fix now, Improve next, Optional improvements |

**Download full report** saves the whole report, including which tasks are
ticked, as a Markdown file.

Counts are by priority: *critical issues* are critical-priority findings,
*warnings* are high-priority, *improvements* are medium and low.

### How it is built

`services/report.py` makes four Groq calls, each returning JSON validated
against a schema in `schemas/report.py`:

1. `review_content` — missing content and the section reviews
2. `review_bullets` — weak bullets with rewrites, and writing issues
3. `review_ats_and_skills` — ATS analysis and skills analysis
4. `synthesize` — overall score, executive summary and action plan, written
   from the findings of the first three

Calls 1–3 run in parallel. Each part is independent: if one fails, that part of
the response is `null`, a message is added to `warnings`, and the rest of the
report is returned (the UI shows a retry in that tab). If the synthesis fails,
the action plan is built directly from the findings. The request only fails when
all of calls 1–3 fail.

### Keeping it grounded in the resume

The prompts tell the model to judge only what is written, to keep *missing*,
*weak* and *recommended* apart, and to use placeholders such as `[X%]` instead
of inventing numbers. On top of that, `services/grounding.py` and
`services/report.py` enforce what can be checked mechanically:

- A flagged bullet or sentence is dropped unless its text really is in the resume.
- In a rewritten bullet, any figure the resume does not state is replaced with
  `[X%]` / `[X]`, and the bullet is marked as needing the user's real numbers.
- A section is only reviewed if the resume shows signs of having it.
- A skill is only "strong", "weak" or "irrelevant" if it is on the resume, only
  "strong" if it appears more than once, and only "recommended" if it is absent.
- A missing email address or phone number is detected from the text directly.
- Whether skills were compared against a job description is set by the server
  from the request, not by the model.

These checks cannot catch everything — a rewrite can still over-state what a
bullet says — so the report tells users to check every suggestion against their
real experience.

### Rate limits

A full report uses roughly 6–10k tokens across its four calls. Groq's free tier
allows about 8k tokens per minute for `gpt-oss-20b`, so a report normally takes
a few seconds but can take up to a minute — or come back with one part missing —
when run right after another analysis or on a long resume. Calls are retried
automatically (`GROQ_MAX_RETRIES`); running the report again a minute later
fills in a missing part.

### Changing the model

Set `GROQ_MODEL` in `.env`. To see which models your key can use:

```bash
cd backend
python -m scripts.check_models
```

`gpt-oss-20b` / `gpt-oss-120b` are reasoning models: they spend part of the
token budget thinking before they answer, which is why `GROQ_REASONING_EFFORT`
is `low` and `GROQ_MAX_TOKENS` is generous.

## Development commands

Backend (from `backend/`):

```bash
pip install -r requirements-dev.txt
pytest                           # runs without a Groq key or network access
```

Frontend (from `frontend/`):

```bash
npm run lint                     # ESLint
npx tsc --noEmit                 # type check
npm run build                    # production build
npm run start                    # serve the production build
```
