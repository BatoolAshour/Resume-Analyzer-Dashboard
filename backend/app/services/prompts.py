"""Prompt templates for each Groq task. Every prompt asks for a single JSON object."""

# Shared by the ATS check and the recommendations task. Passed in as a format
# argument, so its braces are literal.
RECOMMENDATION_SCHEMA = """[
    {
      "priority": "<critical | high | medium | low>",
      "category": "<skills | keywords | experience | education | formatting | content>",
      "title": "<imperative headline, max 8 words>",
      "action": "<exactly what to change, 1-2 sentences>",
      "reason": "<why it matters, 1 sentence>"
    }
  ]"""

RECOMMENDATION_RULES = """- recommendations: 4 to 7 concrete changes, most urgent first. NEVER repeat an item.
  critical = likely to get the resume rejected or mis-parsed by an ATS;
  high = clearly lowers the score; medium = worthwhile improvement; low = polish.
  Use "critical" only when it truly applies. Be specific to THIS resume, and never
  tell the candidate to claim skills or experience they do not have."""


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
  "recommendations": {recommendation_schema},
  "summary": "<2-3 sentence plain-English summary of ATS readiness>"
}}

Rules:
- detected_sections / missing_sections: check for standard resume sections
  (Contact Info, Summary, Experience, Education, Skills, Certifications).
- formatting_issues: things that hurt ATS parsing or readability — e.g. missing
  contact info, no clear section headers, inconsistent dates, overly dense text.
- strengths: things the resume does well for ATS parsing and clarity.
- List AT MOST {max_skills} detected_skills and AT MOST 6 items in every other
  string array. NEVER repeat the same item twice. Be concise.
{recommendation_rules}

RESUME:
{resume}
"""


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
- List AT MOST {max_skills} items per array. NEVER repeat the same item twice. Be concise.

RESUME:
{resume}

JOB DESCRIPTION:
{jd}
"""


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
    "match": <true/false, or null if the JD states no requirement>
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


# ---------- TASK 3: Recommendations + learning path + summary ----------
RECOMMEND_PROMPT = """Given the findings from comparing a candidate's resume against
a job description, return ONLY valid JSON (no markdown, no preamble) matching
this schema:

{{
  "recommendations": {recommendation_schema},
  "learning_path": [
    {{"skill": "<a missing skill>", "reason": "<why learn it at this point, 1 short sentence>"}}
  ],
  "summary": "<2-3 sentence plain-English summary of fit and what to do next>"
}}

Rules:
{recommendation_rules}
- learning_path: order the missing skills by learning priority
  (foundational -> advanced), max 6 items. Empty list if nothing is missing.
  NEVER repeat the same item twice.
- summary should be encouraging but honest, referencing the match/ATS scores.

Matched skills: {matched_skills}
Missing skills: {missing_skills}
Match percent: {match_percent}
ATS score: {ats_score}
Keyword coverage percent: {keyword_coverage}
Experience: {years_found} years found, {years_required} required, verdict: {experience_verdict}
Education: found {education_found}, required {education_required}, match: {education_match}
Resume sections missing: {missing_sections}
Resume formatting issues: {formatting_issues}
"""
