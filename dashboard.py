"""Renders the analysis result as a Streamlit dashboard."""

import streamlit as st


def render_upload_ui():
    """Renders the upload/input widgets. Returns (resume_file, jd_text_raw, jd_file)."""
    col1, col2 = st.columns(2)
    with col1:
        resume_file = st.file_uploader("Resume (PDF / DOCX / TXT)", type=["pdf", "docx", "txt"])
    with col2:
        jd_input_mode = st.radio("Job description input", ["Paste text", "Upload file"], horizontal=True)
        if jd_input_mode == "Paste text":
            jd_text_raw = st.text_area("Paste job description here", height=200)
            jd_file = None
        else:
            jd_file = st.file_uploader("Job Description (PDF / DOCX / TXT)", type=["pdf", "docx", "txt"], key="jd")
            jd_text_raw = None

    return resume_file, jd_text_raw, jd_file


def render_results(r: dict):
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