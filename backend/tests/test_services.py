import pytest

from app.errors import InvalidFileType, LLMInvalidOutput
from app.schemas.llm import ScoringResult, SkillsResult
from app.services.llm import LLMClient, parse_json
from app.services.resume_parser import clean_text, extract_text, parse_text


def test_parse_json_strips_fences_and_preamble():
    assert parse_json('Here you go:\n```json\n{"a": 1}\n```') == {"a": 1}


def test_parse_json_rejects_non_json():
    with pytest.raises(ValueError):
        parse_json("I could not do that.")


def test_clean_text_tidies_whitespace_but_keeps_lines():
    assert clean_text("  SKILLS \n\n\n\n Python,\t  SQL \n") == "SKILLS\n\nPython, SQL"


def test_extract_docx_includes_tables(docx_bytes):
    text = extract_text("resume.docx", docx_bytes)
    assert "Jane Doe" in text
    assert "PostgreSQL" in text


def test_extract_rejects_unknown_extension():
    with pytest.raises(InvalidFileType):
        extract_text("resume.doc", b"data")


def test_parse_text_truncates():
    doc = parse_text("word " * 100, filename="x", max_chars=50)
    assert doc.truncated and len(doc.text) <= 50


def test_scoring_tolerates_nulls():
    result = ScoringResult.model_validate(
        {"match_percent": 140, "ats_score": 55.6, "experience": None,
         "education": {"found": "null", "required": None, "match": None}}
    )
    assert result.match_percent == 100
    assert result.ats_score == 56
    assert result.experience.verdict == "unclear"
    assert result.education.found is None and result.education.match is None


class _ScriptedLLM(LLMClient):
    def __init__(self, settings, outputs):
        super().__init__(settings)
        self.outputs = list(outputs)

    def _complete(self, model, prompt, max_tokens=None, json_mode=False):
        return self.outputs.pop(0)


def test_complete_retries_on_empty_response(settings):
    llm = _ScriptedLLM(settings, ["", '{"keyword_coverage_percent": 40}'])
    assert llm.complete("m", "p", SkillsResult).keyword_coverage_percent == 40


def test_complete_gives_up_after_retries(settings):
    llm = _ScriptedLLM(settings, ["nope", '{"keyword_coverage_percent": null}'])
    with pytest.raises(LLMInvalidOutput):
        llm.complete("m", "p", SkillsResult)
