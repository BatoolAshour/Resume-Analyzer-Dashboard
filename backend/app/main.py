"""
AI Resume Analyzer — API entry point.
Run (from backend/): uvicorn app.main:app --reload
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.routes import analyze, health
from app.config import APP_VERSION, get_settings
from app.errors import AppError

logger = logging.getLogger(__name__)


def _error(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="AI Resume Analyzer API",
        version=APP_VERSION,
        description="ATS checks and resume-to-job matching, powered by Groq.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return _error(exc.status_code, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        missing = [str(e["loc"][-1]) for e in exc.errors() if e.get("type") == "missing"]
        if "resume" in missing:
            return _error(422, "missing_resume", "Upload a resume file to analyze.")
        return _error(422, "invalid_request", "The request was not valid. Check the uploaded files.")

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error", exc_info=exc)
        return _error(500, "internal_error", "Something went wrong on the server. Please try again.")

    @app.get("/", include_in_schema=False)
    async def root() -> RedirectResponse:
        return RedirectResponse("/docs")

    app.include_router(health.router, prefix="/api")
    app.include_router(analyze.router, prefix="/api")

    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY is not set — analysis endpoints will return 503.")

    return app


app = create_app()
