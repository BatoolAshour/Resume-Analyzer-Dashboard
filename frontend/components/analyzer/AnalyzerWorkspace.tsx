"use client";

import { ArrowRight, Check, FileSearch, LoaderCircle, RefreshCw, ServerCrash } from "lucide-react";
import { useRef, useState } from "react";
import { AnalysisProgress } from "@/components/analyzer/AnalysisProgress";
import { JobDescriptionInput } from "@/components/analyzer/JobDescriptionInput";
import { ModeSelector } from "@/components/analyzer/ModeSelector";
import { UploadDropzone } from "@/components/analyzer/UploadDropzone";
import { useHealth } from "@/components/providers/HealthProvider";
import { FullReportView } from "@/components/report/FullReportView";
import { ResultsDashboard } from "@/components/results/ResultsDashboard";
import { ResultsSkeleton } from "@/components/results/ResultsSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAnalysis } from "@/hooks/useAnalysis";
import { API_URL, type ApiError } from "@/lib/api";
import {
  DEFAULT_ALLOWED_EXTENSIONS,
  DEFAULT_MAX_UPLOAD_MB,
  MIN_JOB_DESCRIPTION_CHARS,
} from "@/lib/constants";
import type { UploadLimits } from "@/lib/validation";
import type { AnalysisMode } from "@/types/analysis";

const modeCopy: Record<AnalysisMode, { action: string; hint: string }> = {
  ats: { action: "Run ATS check", hint: "One AI pass over your resume." },
  match: {
    action: "Run job match",
    hint: "Skills, scoring and recommendations are analyzed in separate AI passes.",
  },
  report: {
    action: "Run full audit",
    hint: "Four AI passes: content, bullets and writing, ATS and skills, then the action plan.",
  },
};

const atsChecks = [
  "An ATS readiness score out of 100",
  "Standard sections that are present or missing",
  "Formatting issues that break parsing",
  "Strengths, detected skills and prioritized fixes",
];

export function AnalyzerWorkspace() {
  const { state: health, refresh: refreshHealth } = useHealth();
  const { state, run, retry, reset } = useAnalysis();

  const [mode, setMode] = useState<AnalysisMode>("ats");
  const [resume, setResume] = useState<File | null>(null);
  const [jobText, setJobText] = useState("");
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ resume?: string; job?: string }>({});

  const analyzerRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const loading = state.status === "loading";
  const limits: UploadLimits =
    health.status === "online"
      ? {
          maxUploadMb: health.health.limits.max_upload_mb,
          allowedExtensions: health.health.limits.allowed_extensions,
        }
      : { maxUploadMb: DEFAULT_MAX_UPLOAD_MB, allowedExtensions: DEFAULT_ALLOWED_EXTENSIONS };

  function submit() {
    const problems: typeof errors = {};
    if (!resume) problems.resume = "Upload your resume to continue.";
    if (mode !== "ats" && !jobFile) {
      const length = jobText.trim().length;
      if (length === 0) {
        // Only Job Match needs one; the full audit works on the resume alone.
        if (mode === "match") {
          problems.job = "Paste the job description, or attach it as a file.";
        }
      } else if (length < MIN_JOB_DESCRIPTION_CHARS) {
        problems.job = "That's too short to compare against — paste the full job posting.";
      }
    }
    setErrors(problems);
    if (!resume || problems.job) return;

    void run(
      mode === "ats"
        ? { mode, resume }
        : { mode, resume, jobDescription: { text: jobText, file: jobFile } },
    );
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function retryAndScroll() {
    retry();
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startOver() {
    reset();
    setResume(null);
    setJobText("");
    setJobFile(null);
    setErrors({});
    analyzerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <section
        id="analyzer"
        ref={analyzerRef}
        className="mx-auto w-full max-w-6xl px-4 sm:px-6"
        aria-labelledby="analyzer-heading"
      >
        <Card className="p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="analyzer-heading" className="text-xl font-semibold tracking-tight text-ink">
                Analyze your resume
              </h2>
              <p className="mt-1 text-sm text-ink-3">
                Choose what to check, add your resume, and run the analysis.
              </p>
            </div>
          </div>

          {health.status === "offline" && (
            <Alert
              tone="crit"
              className="mt-5"
              title="Can't reach the analysis server"
              action={
                <Button variant="secondary" size="sm" onClick={refreshHealth}>
                  <RefreshCw className="size-3.5" aria-hidden />
                  Retry
                </Button>
              }
            >
              Nothing is responding at <code className="font-mono text-[13px]">{API_URL}</code>.
              Start the backend and this message will clear by itself.
            </Alert>
          )}
          {health.status === "online" && !health.health.llm_configured && (
            <Alert tone="warn" className="mt-5" title="The server has no API key">
              Set <code className="font-mono text-[13px]">GROQ_API_KEY</code> in the backend{" "}
              <code className="font-mono text-[13px]">.env</code> file and restart it to run
              analyses.
            </Alert>
          )}

          <div className="mt-6">
            <StepLabel step={1}>Analysis mode</StepLabel>
            <ModeSelector value={mode} onChange={setMode} disabled={loading} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <StepLabel step={2}>Resume</StepLabel>
              <UploadDropzone
                file={resume}
                onFileChange={(file) => {
                  setResume(file);
                  setErrors((current) => ({ ...current, resume: undefined }));
                }}
                limits={limits}
                busy={loading}
                externalError={resume ? null : errors.resume}
              />
            </div>

            <div className="flex flex-col">
              {mode !== "ats" ? (
                <div key={mode} className="flex flex-1 animate-fade-in flex-col">
                  <StepLabel step={3}>
                    {mode === "match" ? "Job to match against" : "Target job"}
                  </StepLabel>
                  <JobDescriptionInput
                    text={jobText}
                    onTextChange={(text) => {
                      setJobText(text);
                      setErrors((current) => ({ ...current, job: undefined }));
                    }}
                    file={jobFile}
                    onFileChange={(file) => {
                      setJobFile(file);
                      setErrors((current) => ({ ...current, job: undefined }));
                    }}
                    limits={limits}
                    disabled={loading}
                    error={errors.job}
                    optional={mode === "report"}
                  />
                </div>
              ) : (
                <div
                  key="ats"
                  className="flex-1 animate-fade-in rounded-xl border border-line bg-muted/40 p-5"
                >
                  <p className="text-sm font-semibold text-ink">What the ATS check covers</p>
                  <ul className="mt-3 space-y-2.5">
                    {atsChecks.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-ink-2">
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                          <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[13px] leading-relaxed text-ink-3">
                    No job description needed. To measure fit for a specific role, switch to
                    Job Match.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-ink-3">
              {modeCopy[mode].hint}
            </p>
            <Button size="lg" onClick={submit} disabled={loading} className="sm:min-w-52">
              {loading ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Analyzing…
                </>
              ) : (
                <>
                  {modeCopy[mode].action}
                  <ArrowRight className="size-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </Card>
      </section>

      <section
        id="results"
        ref={resultsRef}
        className="mx-auto mt-12 w-full max-w-6xl px-4 sm:px-6"
        aria-labelledby="results-heading"
      >
        <h2 id="results-heading" className="text-xl font-semibold tracking-tight text-ink">
          Results
        </h2>
        <div className="mt-4">
          {state.status === "idle" && (
            <EmptyState icon={FileSearch} title="Your report will appear here" variant="panel">
              Upload a resume and run an analysis to see your scores, skill gaps and
              recommendations.
            </EmptyState>
          )}

          {state.status === "loading" && (
            <div className="space-y-4">
              <AnalysisProgress mode={state.mode} onCancel={reset} />
              <ResultsSkeleton mode={state.mode} />
            </div>
          )}

          {state.status === "error" && (
            <AnalysisError
              error={state.error}
              onRetry={retry}
              onChangeFile={() =>
                analyzerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            />
          )}

          {/* Keyed per run so entrance animations and tab state reset for a new report. */}
          {state.status === "success" &&
            (state.result.mode === "report" ? (
              <FullReportView
                key={state.result.meta.analyzed_at}
                report={state.result}
                onReset={startOver}
                onRetry={retryAndScroll}
              />
            ) : (
              <ResultsDashboard
                key={state.result.meta.analyzed_at}
                result={state.result}
                onReset={startOver}
              />
            ))}
        </div>
      </section>
    </>
  );
}

function StepLabel({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <p className="mb-2.5 flex items-center gap-2 text-sm font-medium text-ink">
      <span className="flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-surface">
        {step}
      </span>
      {children}
    </p>
  );
}

const errorTitles: Record<string, string> = {
  network_error: "Can't reach the analysis server",
  timeout: "The analysis timed out",
  invalid_file_type: "Unsupported file type",
  file_too_large: "File is too large",
  unreadable_file: "The file couldn't be read",
  empty_document: "No readable text found",
  missing_job_description: "Job description needed",
  llm_not_configured: "The AI service isn't configured",
  llm_rate_limited: "Too many requests right now",
  llm_unavailable: "The AI service is unavailable",
  llm_invalid_output: "The AI returned an unusable answer",
};

interface AnalysisErrorProps {
  error: ApiError;
  onRetry: () => void;
  onChangeFile: () => void;
}

function AnalysisError({ error, onRetry, onChangeFile }: AnalysisErrorProps) {
  return (
    <Card className="animate-fade-in p-8 text-center" role="alert">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-crit-soft text-crit-ink">
        <ServerCrash className="size-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink">
        {errorTitles[error.code] ?? "The analysis failed"}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-2">{error.message}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {error.isFileError ? (
          <Button onClick={onChangeFile}>Choose a different file</Button>
        ) : (
          <Button onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        )}
        {error.isFileError && (
          <Button variant="secondary" onClick={onRetry}>
            Retry anyway
          </Button>
        )}
      </div>
    </Card>
  );
}
