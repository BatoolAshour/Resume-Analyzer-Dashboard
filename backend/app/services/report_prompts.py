"""Prompts for the Full Resume Audit Report.

The report is split into four focused tasks. Each prompt is assembled from
plain blocks (no str.format), so the JSON schemas need no brace escaping.
"""

GROUNDING_RULES = """Ground rules — follow every one:
- Judge ONLY what is actually written in the RESUME (and the JOB DESCRIPTION, if one is
  given). Never invent experience, skills, achievements, certifications, metrics,
  education or projects, and never assume something exists when it is not written.
- When a field asks for the candidate's current text, copy it from the resume word for word.
- Keep these three apart:
    "missing"     = expected information is absent;
    "weak"        = the information exists but should be improved;
    "recommended" = an optional addition that would strengthen the resume.
- When you write an improved example, NEVER make up numbers. If a figure is not in the
  resume, write a placeholder such as [X%] or [N] instead.
- Advice must stay honest. Only tell the candidate to add a skill, keyword, tool or
  certification if they actually have it — word it as "If you have used X, add it".
  Never suggest claiming something that may not be true.
- priority: critical = likely to get the resume rejected or mis-parsed; high = clearly
  hurts it; medium = worthwhile improvement; low = polish. Use "critical" sparingly.
- Be specific to THIS resume. NEVER repeat an item. Be concise.
- Return ONLY one valid JSON object — no markdown, no preamble."""

NO_JOB_DESCRIPTION = """No job description was provided. Do NOT assume a specific target job, and do
NOT claim that any skill or keyword is "required". Judge the resume on its own merits
and against general expectations for its apparent field."""


def _assemble(task: str, schema: str, rules: str, *inputs: str) -> str:
    return "\n\n".join(
        [
            task,
            f"Return JSON matching this schema:\n{schema}",
            f"Rules:\n{rules}",
            GROUNDING_RULES,
            *inputs,
        ]
    )


def _resume_inputs(resume: str, job_description: str | None) -> tuple[str, str]:
    if job_description:
        context = f"JOB DESCRIPTION (the role the candidate is targeting):\n{job_description}"
    else:
        context = NO_JOB_DESCRIPTION
    return f"RESUME:\n{resume}", context


# ---------- TASK 1: Missing content + section-by-section review ----------
CONTENT_SCHEMA = """{
  "content_check": [
    {
      "item": "<one of the nine items listed in the rules>",
      "status": "<present | missing | recommended>",
      "priority": "<critical | high | medium | low>",
      "what": "<what exactly is missing, 1 sentence>",
      "why": "<why it matters, 1 sentence>",
      "fix": "<how to fix it, 1-2 sentences>"
    }
  ],
  "section_reviews": [
    {
      "section": "<Summary | Experience | Education | Projects | Skills | Certifications>",
      "rating": "<strong | adequate | weak>",
      "good": [<string>, ...],
      "weak": [<string>, ...],
      "missing": [<string>, ...],
      "improvements": [<string>, ...]
    }
  ]
}"""

CONTENT_RULES = """- content_check: exactly one entry for EACH of these nine items, in this order. Check the
  resume for every one before answering:
    1. Professional summary
    2. Skills
    3. Work experience
    4. Education
    5. Projects
    6. Certifications
    7. Contact information (email, phone, location, LinkedIn or portfolio)
    8. Dates (on every experience and education entry)
    9. Achievements/results (measurable outcomes, not just duties)
  status: "present" = it is in the resume and complete; "missing" = absent or incomplete,
  and every resume needs it; "recommended" = absent, but optional for this candidate.
  When status is "present", set what, why and fix to "" and priority to "low".
- section_reviews: one entry for each section that EXISTS in the resume, in this order:
  Summary, Experience, Education, Projects, Skills, Certifications. Do NOT review a
  section that is not in the resume — an absent section belongs in content_check.
- good = what works; weak = content that is there but unconvincing; missing = details
  absent from this section; improvements = specific changes to make.
  At most 4 short items per list; use [] when nothing applies."""


def content_prompt(resume: str, job_description: str | None) -> str:
    return _assemble(
        "You are a senior resume reviewer. Audit what this resume contains and what it lacks.",
        CONTENT_SCHEMA,
        CONTENT_RULES,
        *_resume_inputs(resume, job_description),
    )


# ---------- TASK 2: Bullet analysis + writing quality ----------
BULLETS_SCHEMA = """{
  "bullet_summary": "<1-2 sentences on the overall quality of the bullets>",
  "bullets": [
    {
      "source": "<the role or project the bullet belongs to>",
      "current": "<the bullet, copied word for word>",
      "issues": ["<vague | repetitive | no_action_verb | no_metric | responsibility | too_long>"],
      "problem": "<what is wrong with it, 1 sentence>",
      "suggested": "<the rewritten bullet>",
      "priority": "<critical | high | medium | low>"
    }
  ],
  "writing": [
    {
      "type": "<grammar | weak_wording | repetition | unprofessional | buzzwords | long_sentence | tense>",
      "original": "<the text, copied word for word>",
      "problem": "<what is wrong, 1 sentence>",
      "suggestion": "<the corrected text>",
      "priority": "<critical | high | medium | low>"
    }
  ]
}"""

BULLETS_RULES = """- bullets: read every bullet or description under experience and projects. Include ONLY
  the ones that need improvement, worst first, at most 8. Skip bullets that are already
  strong. Return [] if there are none to improve.
  issues: vague = unclear what was done; repetitive = repeats wording used elsewhere;
  no_action_verb = does not start with a strong verb; no_metric = no measurable impact;
  responsibility = describes a duty instead of an achievement; too_long = hard to scan.
- suggested: rewrite using only the facts in the current bullet — a stronger verb, a
  clearer structure. Do NOT guess what the work involved. Where the resume does not say
  what was done, which tool was used, or what resulted, put a bracketed placeholder that
  names what the candidate must fill in, e.g. "Built [what you built] using [tool],
  improving [metric] by [X%]". Never state a tool, result or number the resume does not.
  If a line states no real work (e.g. a personality claim), suggest removing it instead
  of inventing an achievement.
- writing: language problems anywhere in the resume, at most 8: grammar mistakes, weak
  wording, repeated words, unprofessional wording, excessive buzzwords, overly long
  sentences, inconsistent tense. Do not repeat a finding already listed under bullets.
  Return [] if there are none."""


def bullets_prompt(resume: str, job_description: str | None) -> str:
    return _assemble(
        "You are a senior resume editor. Review the wording of this resume, line by line.",
        BULLETS_SCHEMA,
        BULLETS_RULES,
        *_resume_inputs(resume, job_description),
    )


# ---------- TASK 3: ATS analysis + skills analysis ----------
ATS_SKILLS_SCHEMA = """{
  "ats": {
    "score": <int 0-100>,
    "summary": "<1-2 sentences on ATS readiness>",
    "areas": [
      {
        "area": "<readability | section_naming | formatting | keywords | skills_visibility | contact_info | parsing>",
        "status": "<pass | warning | fail>",
        "finding": "<what you observed, 1-2 sentences>",
        "fix": "<how to fix it; empty string when status is pass>",
        "priority": "<critical | high | medium | low>"
      }
    ]
  },
  "skills": {
    "field": "<the professional field this resume appears to target>",
    "strong": [{"name": "<skill>", "note": "<where the resume demonstrates it>"}],
    "weak": [{"name": "<skill>", "note": "<why it is weakly demonstrated>"}],
    "recommended": [{"name": "<skill>", "note": "<why it would help>"}],
    "irrelevant": [{"name": "<skill>", "note": "<why it adds little>"}]
  }
}"""

ATS_RULES = """- ats.areas: exactly one entry for each of the seven areas, in the order listed.
  You are reading the text an ATS would extract, not the original layout. Judge
  formatting and parsing from what the text reveals (reading order, headings, odd
  characters, merged lines). Do not claim to see fonts, colours, columns or graphics.
- skills.strong: on the resume AND backed by evidence in experience or projects.
- skills.weak: on the resume but only listed, or mentioned without supporting evidence.
- At most 8 items per skills list; use [] when nothing applies."""

SKILLS_RULES_WITH_JD = """- skills.recommended: skills the JOB DESCRIPTION asks for that the resume does not show.
  Start each note with "Required:" or "Preferred:" according to the job description.
- skills.irrelevant: skills on the resume that add little for this job."""

SKILLS_RULES_WITHOUT_JD = """- skills.recommended: skills NOT on the resume that are commonly valuable in its apparent
  field. These are suggestions, not requirements — word every note as a suggestion and
  never say a skill is required.
- skills.irrelevant: skills on the resume that add little for its apparent field. Use []
  unless it is clear-cut."""


def ats_skills_prompt(resume: str, job_description: str | None) -> str:
    skills_rules = SKILLS_RULES_WITH_JD if job_description else SKILLS_RULES_WITHOUT_JD
    return _assemble(
        "You are an ATS (Applicant Tracking System) specialist. Audit how well this resume "
        "will be parsed, and how well it presents the candidate's skills.",
        ATS_SKILLS_SCHEMA,
        f"{ATS_RULES}\n{skills_rules}",
        *_resume_inputs(resume, job_description),
    )


# ---------- TASK 4: Executive summary + action plan ----------
SYNTHESIS_SCHEMA = """{
  "overall_score": <int 0-100>,
  "overall_quality": "<2-3 sentences on the overall quality of the resume>",
  "ats_readiness": "<1-2 sentences on how ready it is for ATS screening>",
  "top_strengths": [<exactly 3 strings, or fewer if the resume has fewer>],
  "top_problems": [<the 3 problems to fix first, most urgent first>],
  "action_plan": {
    "fix_now": [{"task": "<one checkable action>", "detail": "<how to do it, 1 sentence>"}],
    "improve_next": [{"task": "...", "detail": "..."}],
    "optional": [{"task": "...", "detail": "..."}]
  }
}"""

SYNTHESIS_RULES = """- Base everything on the FINDINGS. Do not introduce strengths or problems that are not
  in them.
- overall_score: weigh content completeness, the quality of the bullets, ATS readiness
  and writing quality. Use this scale and be consistent with the findings:
    85-100 = only polish is left;
    70-84  = solid, with one or two high-priority issues;
    50-69  = several high-priority issues, weak bullets or a weak section;
    0-49   = critical gaps or most of the content is weak.
  It should not be far above the ATS score when that is low.
- top_strengths: what the findings show the resume does well ("good" points, passed ATS
  checks, well-demonstrated skills). Write each as a short sentence, not a single word.
- action_plan: order tasks by the priority of the findings they come from.
  fix_now = every critical finding, plus any high-priority finding that would stop the
  resume being taken seriously; improve_next = the remaining high-impact improvements;
  optional = medium and low priority, nice-to-have changes.
  At most 6 tasks per list. Merge duplicate findings into one task; a task appears in
  one list only.
- Each task is one concrete action that starts with a verb and can be ticked off when
  done (e.g. "Add a 2-3 line professional summary"), not a general goal."""


def synthesis_prompt(findings: str, has_job_description: bool) -> str:
    # The resume itself is not sent again: the findings already describe it, and
    # leaving it out keeps this call small and tied to what the reviewers found.
    target = (
        "The resume was reviewed against a specific job description."
        if has_job_description
        else "The resume was reviewed on its own; no job description was provided."
    )
    return _assemble(
        "You are a senior resume reviewer. Other reviewers have audited a resume; their "
        "findings are given below as JSON. Write the executive summary and the action plan.",
        SYNTHESIS_SCHEMA,
        SYNTHESIS_RULES,
        target,
        f"FINDINGS:\n{findings}",
    )
