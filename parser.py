"""Extract and clean text from uploaded resume / job description files."""

import re

import pymupdf  # PyMuPDF
from docx import Document


def extract_text(uploaded_file) -> str:
    """Pull raw text out of a PDF, DOCX, or TXT upload."""
    name = uploaded_file.name.lower()

    if name.endswith(".pdf"):
        text = []
        with pymupdf.open(stream=uploaded_file.read(), filetype="pdf") as pdf:
            for page in pdf:
                text.append(page.get_text())
        return "\n".join(text)

    if name.endswith(".docx"):
        doc = Document(uploaded_file)
        return "\n".join(p.text for p in doc.paragraphs)

    # .txt or fallback
    return uploaded_file.read().decode("utf-8", errors="ignore")


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()