// Defaults used until /api/health reports the server's real limits.
export const DEFAULT_MAX_UPLOAD_MB = 5;
export const DEFAULT_ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

// Matches MIN_TEXT_CHARS in backend/app/services/resume_parser.py.
export const MIN_JOB_DESCRIPTION_CHARS = 40;
