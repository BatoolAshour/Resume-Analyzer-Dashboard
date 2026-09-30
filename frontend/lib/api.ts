import type {
  ApiErrorBody,
  AtsAnalysis,
  FullReport,
  HealthResponse,
  MatchAnalysis,
} from "@/types/analysis";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

// A job match makes several model calls, so allow for a slow provider.
const ANALYSIS_TIMEOUT_MS = 120_000;
// The full report makes more calls and may have to wait out a provider rate limit.
const REPORT_TIMEOUT_MS = 180_000;
const HEALTH_TIMEOUT_MS = 5_000;

export class ApiError extends Error {
  constructor(
    /** Stable code from the backend, or "network_error" / "timeout". */
    readonly code: string,
    message: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Errors caused by the uploaded file, which retrying as-is will not fix. */
  get isFileError(): boolean {
    return [
      "invalid_file_type",
      "file_too_large",
      "unreadable_file",
      "empty_document",
    ].includes(this.code);
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, signal });
  } catch (cause) {
    if (init.signal?.aborted) throw cause; // cancelled by the caller
    if (timeout.aborted) {
      throw new ApiError(
        "timeout",
        "The analysis is taking longer than expected. Please try again.",
      );
    }
    throw new ApiError(
      "network_error",
      `Nothing is responding at ${API_URL}. Make sure the backend is running, then try again.`,
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.error?.code ?? "http_error",
      body?.error?.message ??
        `The server returned an unexpected error (${response.status}).`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request("/api/health", { signal, cache: "no-store" }, HEALTH_TIMEOUT_MS);
}

export function analyzeAts(
  resume: File,
  signal?: AbortSignal,
): Promise<AtsAnalysis> {
  const body = new FormData();
  body.append("resume", resume);
  return request(
    "/api/analyze/ats",
    { method: "POST", body, signal },
    ANALYSIS_TIMEOUT_MS,
  );
}

export interface JobDescriptionInput {
  text: string;
  file: File | null;
}

export function analyzeMatch(
  resume: File,
  jobDescription: JobDescriptionInput,
  signal?: AbortSignal,
): Promise<MatchAnalysis> {
  const body = new FormData();
  body.append("resume", resume);
  appendJobDescription(body, jobDescription);
  return request(
    "/api/analyze/match",
    { method: "POST", body, signal },
    ANALYSIS_TIMEOUT_MS,
  );
}

/** The job description is optional here: leave it empty to audit the resume alone. */
export function analyzeFullReport(
  resume: File,
  jobDescription: JobDescriptionInput,
  signal?: AbortSignal,
): Promise<FullReport> {
  const body = new FormData();
  body.append("resume", resume);
  appendJobDescription(body, jobDescription);
  return request(
    "/api/analyze/full-report",
    { method: "POST", body, signal },
    REPORT_TIMEOUT_MS,
  );
}

function appendJobDescription(body: FormData, jobDescription: JobDescriptionInput) {
  if (jobDescription.file) {
    body.append("job_description_file", jobDescription.file);
  } else if (jobDescription.text.trim()) {
    body.append("job_description", jobDescription.text);
  }
}
