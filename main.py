"""
AI Resume Analyzer Dashboard — entry point.
Run: streamlit run main.py
"""

import streamlit as st

from analyzer import analyze
from config import MODEL_RECOMMENDATIONS, MODEL_SCORING, MODEL_SKILLS, OLLAMA_HOST
from dashboard import render_results, render_upload_ui
from parser import clean_text, extract_text

st.set_page_config(page_title="Resume Analyzer", layout="wide")
st.title("🧠 AI Resume Analyzer Dashboard")
st.caption("Upload a resume + job description to get an ATS-style match report.")

with st.expander("🔧 Debug: models currently loaded"):
    st.code(
        f"OLLAMA_HOST = {OLLAMA_HOST}\n"
        f"MODEL_SKILLS = {MODEL_SKILLS}\n"
        f"MODEL_SCORING = {MODEL_SCORING}\n"
        f"MODEL_RECOMMENDATIONS = {MODEL_RECOMMENDATIONS}"
    )

resume_file, jd_text_raw, jd_file = render_upload_ui()

if st.button("Analyze", type="primary", use_container_width=True):
    if not resume_file or (not jd_text_raw and not jd_file):
        st.error("Please provide both a resume and a job description.")
        st.stop()

    with st.spinner("Extracting text..."):
        resume_text = clean_text(extract_text(resume_file))
        jd_text = clean_text(jd_text_raw) if jd_text_raw else clean_text(extract_text(jd_file))

    with st.spinner("Analyzing match..."):
        try:
            st.session_state["result"] = analyze(resume_text, jd_text)
        except Exception as e:
            st.error(f"Analysis failed: {e}")
            st.stop()

if "result" in st.session_state:
    render_results(st.session_state["result"])