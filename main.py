"""
AI Resume Analyzer Dashboard — entry point.
Run: streamlit run main.py
"""

import streamlit as st

from analyzer import analyze
from config import GROQ_API_KEY
from dashboard import render_results, render_upload_ui
from parser import clean_text, extract_text

st.set_page_config(page_title="Resume Analyzer", layout="wide")
st.title("🧠 AI Resume Analyzer Dashboard")
st.caption("Check your resume's ATS-friendliness, or compare it against a job description.")

resume_file, jd_text_raw, jd_file = render_upload_ui()

if st.button("Analyze", type="primary", use_container_width=True):
    if not resume_file:
        st.error("Please upload a resume.")
        st.stop()

    if not GROQ_API_KEY:
        st.error("Set the GROQ_API_KEY environment variable before running.")
        st.stop()

    with st.spinner("Extracting text..."):
        resume_text = clean_text(extract_text(resume_file))
        jd_text = None
        if jd_text_raw:
            jd_text = clean_text(jd_text_raw)
        elif jd_file:
            jd_text = clean_text(extract_text(jd_file))

    with st.spinner("Analyzing..."):
        try:
            st.session_state["result"] = analyze(resume_text, jd_text)
        except Exception as e:
            st.error(f"Analysis failed: {e}")
            st.stop()

if "result" in st.session_state:
    render_results(st.session_state["result"])