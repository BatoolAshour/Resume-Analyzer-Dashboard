"""Renders the analysis result as a Streamlit dashboard."""

import streamlit as st


def render_upload_ui():
    """Renders the upload/input widgets. Returns (resume_file, jd_text_raw, jd_file)."""
    col1, col2 = st.columns(2)
    with col1:
        resume_file = st.file_uploader("Resume (PDF / DOCX / TXT)", type=["pdf", "docx", "txt"])
    with col2:
        st.caption("Optional — leave empty to just check ATS-friendliness of your resume")
        jd_input_mode = st.radio(
            "Job description (optional)", ["None", "Paste text", "Upload file"], horizontal=True
        )
        if jd_input_mode == "Paste text":
            jd_text_raw = st.text_area("Paste job description here", height=200)
            jd_file = None
        elif jd_input_mode == "Upload file":
            jd_file = st.file_uploader("Job Description (PDF / DOCX / TXT)", type=["pdf", "docx", "txt"], key="jd")
            jd_text_raw = None
        else:
            jd_text_raw, jd_file = None, None

    return resume_file, jd_text_raw, jd_file


def render_results(r: dict):
    if r.get("mode") == "ats_only":
        render_ats_only_results(r)
    else:
        render_comparison_results(r)


def render_ats_only_results(r: dict):
    st.divider()
    st.metric("ATS Score", f"{r['ats_score']}/100")
    st.progress(r["ats_score"] / 100, text="ATS Readiness")
    st.info(r["summary"])

    c1, c2 = st.columns(2)
    with c1:
        st.subheader("✅ Detected Sections")
        st.write(", ".join(r.get("detected_sections", [])) or "None found")

        st.subheader("🛠️ Detected Skills")
        st.write(", ".join(r.get("detected_skills", [])) or "None found")

        st.subheader("💪 Strengths")
        for item in r.get("strengths", []):
            st.write(f"- {item}")

    with c2:
        st.subheader("⚠️ Missing Sections")
        st.write(", ".join(r.get("missing_sections", [])) or "None — all standard sections present")

        st.subheader("🚩 Formatting Issues")
        issues = r.get("formatting_issues", [])
        if issues:
            for item in issues:
                st.write(f"- {item}")
        else:
            st.write("No major issues detected.")


def render_comparison_results(r: dict):
    st.divider()
    m1, m2, m3 = st.columns(3)
    m1.metric("Resume–Job Match", f"{r['match_percent']}%")
    m2.metric("ATS Score", f"{r['ats_score']}/100")
    m3.metric("Keyword Coverage", f"{r['keyword_coverage_percent']}%")

    st.progress(r["match_percent"] / 100, text="Overall Match")
    st.info(r["summary"])

    c1, c2 = st.columns(2)
    with c1:
        st.subheader("✅ Detected Skills")
        st.write(", ".join(r["matched_skills"]) or "None found")

        st.subheader("🎓 Education")
        edu = r["education"]
        st.write(f"**Found:** {edu.get('found') or '—'}")
        st.write(f"**Required:** {edu.get('required') or '—'}")
        st.write("**Match:** " + ("✅ Yes" if edu.get("match") else "❌ No"))

    with c2:
        st.subheader("❌ Missing Skills")
        st.write(", ".join(r["missing_skills"]) or "None — great match!")

        st.subheader("💼 Experience Analysis")
        exp = r["experience"]
        st.write(f"**Years found:** {exp.get('years_found')}")
        st.write(f"**Years required:** {exp.get('years_required') or '—'}")
        st.write(f"**Verdict:** {exp.get('verdict')}")

    st.divider()
    st.subheader("📚 Recommended Learning Path")
    if r["recommended_skills_to_learn"]:
        st.write(" → ".join(r["recommended_skills_to_learn"]))
    else:
        st.write("No gaps detected.")