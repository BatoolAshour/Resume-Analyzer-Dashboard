"""Application errors. Each one maps to an HTTP status and a stable error code
that the frontend can branch on."""


class AppError(Exception):
    status_code = 500
    code = "internal_error"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class InvalidFileType(AppError):
    status_code = 415
    code = "invalid_file_type"


class FileTooLarge(AppError):
    status_code = 413
    code = "file_too_large"


class UnreadableFile(AppError):
    status_code = 422
    code = "unreadable_file"


class EmptyDocument(AppError):
    status_code = 422
    code = "empty_document"


class MissingJobDescription(AppError):
    status_code = 422
    code = "missing_job_description"


class LLMNotConfigured(AppError):
    status_code = 503
    code = "llm_not_configured"


class LLMRateLimited(AppError):
    status_code = 429
    code = "llm_rate_limited"


class LLMUnavailable(AppError):
    status_code = 502
    code = "llm_unavailable"


class LLMInvalidOutput(AppError):
    status_code = 502
    code = "llm_invalid_output"
