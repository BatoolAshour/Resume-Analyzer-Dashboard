# 🧠 AI Resume Analyzer Dashboard
 
Upload a resume to check its ATS-friendliness, or optionally compare it
against a job description for a full match report.
 
## Features
- **ATS-only mode** (no job description needed): ATS score, detected sections,
  missing sections, formatting issues, strengths, detected skills
- **Comparison mode** (resume + job description): match %, ATS score,
  matched/missing skills, keyword coverage, experience fit, education fit,
  and a prioritized learning path
## Setup
```bash
pip install -r requirements.txt
cp .env.example .env      # then edit .env and paste your GROQ_API_KEY
streamlit run main.py
```
 
## File structure
| File | Job |
|---|---|
| `main.py` | Entry point — wires everything together, run this |
| `config.py` | API key + model settings |
| `parser.py` | Extracts/cleans text from PDF/DOCX/TXT |
| `analyzer.py` | Prompts + Groq API calls, returns structured JSON |
| `dashboard.py` | Streamlit UI rendering (upload form + both results views) |
| `check_models.py` | Lists which model IDs your Groq key can access |
 
## How it works
1. `parser.py` extracts text from the uploaded resume (and job description, if given)
2. `analyzer.py` picks a flow:
   - No job description → `ats_check()`, a single call scoring the resume on its own
   - Job description provided → three focused calls: skill extraction, scoring, recommendations
3. `dashboard.py` renders the matching view based on which flow ran
## Swap the model
Edit `MODEL_*` in `config.py`. Run `python check_models.py` to see exactly which
model IDs your Groq key can access — availability varies per account.
 
**Note:** `gpt-oss-20b`/`gpt-oss-120b` are reasoning models — they spend part of
their token budget "thinking" before answering. `analyzer.py` sets
`reasoning_effort="low"` and keeps `MAX_TOKENS` generous (2500) so reasoning
doesn't crowd out the actual JSON response.
 
