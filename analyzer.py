"""
Compares a resume against a job description in 3 focused Groq calls
(instead of one big call). Each task can use its own model — see config.py.

1. extract_skills        -> matched/missing skills, keyword coverage
2. score_match            -> match %, ATS score, experience/education fit
3. build_recommendations  -> learning path + plain-English summary
"""

import json
import re

from groq import Groq

from config import (
    GROQ_API_KEY,
    MAX_TOKENS,
    MODEL_ATS_CHECK,
    MODEL_RECOMMENDATIONS,
    MODEL_SCORING,
    MODEL_SKILLS,
)

client = Groq(api_key=GROQ_API_KEY)


def _call(model: str, prompt: str) -> dict:
    """Send a prompt, return parsed JSON. Robust to stray text/fences around it."""
    response = client.chat.completions.create(
        model=model,
        max_tokens=MAX_TOKENS,
        temperature=0.2,
        frequency_penalty=0.6,  # discourages repetition loops on smaller models
        presence_penalty=0.3,
        reasoning_effort="low",  # gpt-oss models: cap reasoning so it leaves room for the actual answer
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.choices[0].message.content or ""
    raw = raw.strip()
    raw = re.sub(r"^```(json)?|```$", "", raw, flags=re.MULTILINE).strip()

    match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
    if not match:
        raise ValueError(f"Model did not return JSON. Raw output:\n{raw}")

    return json.loads(match.group(0))


# ---------- TASK 0: Standalone ATS check (no job description) ----------
ATS_CHECK_PROMPT = """You are an ATS (Applicant Tracking System) resume checker.
No job description is provided — evaluate the RESUME purely on ATS-friendliness
and general resume quality. Return ONLY valid JSON (no markdown, no preamble)
matching this schema:

{{
  "ats_score": <int 0-100>,
  "detected_skills": [<string>, ...],
  "detected_sections": [<string>, ...],
  "missing_sections": [<string>, ...],
  "formatting_issues": [<string>, ...],
  "strengths": [<string>, ...],
  "summary": "<2-3 sentence plain-English summary of ATS readiness>"
}}

Rules:
- detected_sections / missing_sections: check for standard resume sections
  (Contact Info, Summary, Experience, Education, Skills, Certifications).
- formatting_issues: things that hurt ATS parsing or readability — e.g. missing
  contact info, no clear section headers, inconsistent dates, overly dense text.
- strengths: things the resume does well for ATS parsing and clarity.
- List AT MOST 6 items per array. NEVER repeat the same item twice. Be concise.

RESUME:
{resume}
"""


def ats_check(resume_text: str) -> dict:
    prompt = ATS_CHECK_PROMPT.format(resume=resume_text)
    return _call(MODEL_ATS_CHECK, prompt)


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
def analyze(resume_text: str, jd_text: str | None = None) -> dict:
    """
    If jd_text is provided: full 3-call comparison against the job description.
    If jd_text is empty/None: standalone ATS-friendliness check on the resume alone.
    """
    if not jd_text or not jd_text.strip():
        result = ats_check(resume_text)
        result["mode"] = "ats_only"
        return result

    skills = extract_skills(resume_text, jd_text)
    scoring = score_match(resume_text, jd_text, skills)
    recs = build_recommendations(skills, scoring)

    return {
        "mode": "comparison",
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