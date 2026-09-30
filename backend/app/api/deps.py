"""Shared FastAPI dependencies."""

from functools import lru_cache

from app.config import get_settings
from app.services.analyzer import ResumeAnalyzer
from app.services.llm import LLMClient
from app.services.report import ResumeAuditor


@lru_cache
def get_llm_client() -> LLMClient:
    return LLMClient(get_settings())


@lru_cache
def get_analyzer() -> ResumeAnalyzer:
    return ResumeAnalyzer(get_llm_client(), get_settings())


@lru_cache
def get_auditor() -> ResumeAuditor:
    return ResumeAuditor(get_llm_client(), get_settings())
