"""
Compares a resume against a job description in 3 focused Ollama calls
(instead of one big call). Each task can use its own local model — see config.py.

1. extract_skills        -> matched/missing skills, keyword coverage
2. score_match            -> match %, ATS score, experience/education fit
3. build_recommendations  -> learning path + plain-English summary

Uses Ollama's `format="json"` mode, which forces valid JSON output —
no repetition loops or truncation issues like with small hosted models.
"""

import json

import ollama

from config import MODEL_RECOMMENDATIONS, MODEL_SCORING, MODEL_SKILLS, OLLAMA_HOST

client = ollama.Client(host=OLLAMA_HOST)


def _call(model: str, prompt: str) -> dict:
    """Send a prompt, return parsed JSON via Ollama's structured output mode."""
    response = client.chat(
        model=model,
        format="json",
        options={"temperature": 0.2},
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(response["message"]["content"])


# ---------- TASK 1: Skill extraction ----------
SKILLS_PROMPT = """Compare the RESUME against the JOB DESCRIPTION and return ONLY
valid JSON (no markdown, no preamble) matching this schema:

{{
  "matched_skills": [<string>, ...],
  "missing_skills": [<string>, ...],
  "keyword_coverage_percent": <int 0-100>
}}

Rules:
- Focus on concrete technical/professional skills and tools, not soft skills.
- matched_skills: skills the JD wants AND the resume shows.
- missing_skills: skills the JD wants that the resume does NOT show.
- keyword_coverage_percent: rough % of JD keywords/phrases that appear anywhere in the resume.
- List AT MOST 8 items per array. NEVER repeat the same item twice. Be concise.

RESUME:
{resume}

JOB DESCRIPTION:
{jd}
"""


def extract_skills(resume_text: str, jd_text: str) -> dict:
    prompt = SKILLS_PROMPT.format(resume=resume_text, jd=jd_text)
    return _call(MODEL_SKILLS, prompt)


# ---------- TASK 2: Scoring ----------
SCORING_PROMPT = """You are an ATS (Applicant Tracking System) resume scorer.
Compare the RESUME against the JOB DESCRIPTION and return ONLY valid JSON
(no markdown, no preamble) matching this schema:

{{
  "match_percent": <int 0-100>,
  "ats_score": <int 0-100>,
  "experience": {{
    "years_found": <number>,
    "years_required": <number or null>,
    "verdict": "<meets / below / above / unclear>"
  }},
  "education": {{
    "found": "<highest degree found, or null>",
    "required": "<degree required by JD, or null>",
    "match": <true/false>
  }}
}}

Rules:
- match_percent: overall semantic + skill fit between resume and JD.
- ats_score should weigh: semantic fit 40%, experience match 30%, education match 30%.
- If information is missing/unclear, use null rather than guessing.

Known skill match context: {matched_skills} matched, {missing_skills} missing.

RESUME:
{resume}

JOB DESCRIPTION:
{jd}
"""


def score_match(resume_text: str, jd_text: str, skills: dict) -> dict:
    prompt = SCORING_PROMPT.format(
        resume=resume_text,
        jd=jd_text,
        matched_skills=", ".join(skills.get("matched_skills", [])) or "none",
        missing_skills=", ".join(skills.get("missing_skills", [])) or "none",
    )
    return _call(MODEL_SCORING, prompt)


# ---------- TASK 3: Recommendations + summary ----------
RECOMMEND_PROMPT = """Given a candidate's matched skills, missing skills, and their
overall match score against a job, return ONLY valid JSON (no markdown, no preamble)
matching this schema:

{{
  "recommended_skills_to_learn": [<string>, ...],
  "summary": "<2-3 sentence plain-English summary of fit and what to do next>"
}}

Rules:
- recommended_skills_to_learn: order missing skills by learning priority
  (foundational -> advanced), max 6 items. Empty list if nothing is missing.
  NEVER repeat the same item twice.
- summary should be encouraging but honest, referencing the match/ATS scores.

Matched skills: {matched_skills}
Missing skills: {missing_skills}
Match percent: {match_percent}
ATS score: {ats_score}
Experience verdict: {experience_verdict}
Education match: {education_match}
"""


def build_recommendations(skills: dict, scoring: dict) -> dict:
    prompt = RECOMMEND_PROMPT.format(
        matched_skills=", ".join(skills.get("matched_skills", [])) or "none",
        missing_skills=", ".join(skills.get("missing_skills", [])) or "none",
        match_percent=scoring.get("match_percent"),
        ats_score=scoring.get("ats_score"),
        experience_verdict=scoring.get("experience", {}).get("verdict"),
        education_match=scoring.get("education", {}).get("match"),
    )
    return _call(MODEL_RECOMMENDATIONS, prompt)


# ---------- Orchestration ----------
def analyze(resume_text: str, jd_text: str) -> dict:
    """Runs all 3 tasks and merges results into the schema the dashboard expects."""
    skills = extract_skills(resume_text, jd_text)
    scoring = score_match(resume_text, jd_text, skills)
    recs = build_recommendations(skills, scoring)

    return {
        "match_percent": scoring["match_percent"],
        "ats_score": scoring["ats_score"],
        "matched_skills": skills["matched_skills"],
        "missing_skills": skills["missing_skills"],
        "keyword_coverage_percent": skills["keyword_coverage_percent"],
        "experience": scoring["experience"],
        "education": scoring["education"],
        "recommended_skills_to_learn": recs["recommended_skills_to_learn"],
        "summary": recs["summary"],
    }