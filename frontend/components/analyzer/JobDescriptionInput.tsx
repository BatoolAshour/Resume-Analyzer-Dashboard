"use client";

import { CircleX, FileText, Paperclip, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn, countWords, formatBytes } from "@/lib/utils";
import { validateFile, type UploadLimits } from "@/lib/validation";

interface JobDescriptionInputProps {
  text: string;
  onTextChange: (text: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  limits: UploadLimits;
  disabled?: boolean;
  error?: string | null;
  /** When true the field may be left empty. */
  optional?: boolean;
}

export function JobDescriptionInput({
  text,
  onTextChange,
  file,
  onFileChange,
  limits,
  disabled,
  error,
  optional = false,
}: JobDescriptionInputProps) {
  const textareaId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const shownError = fileError ?? error ?? null;
  const words = countWords(text);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={textareaId} className="text-sm font-medium text-ink">
          Job description
          {optional && <span className="ml-1.5 font-normal text-ink-3">optional</span>}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept={limits.allowedExtensions.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const candidate = event.target.files?.[0];
            event.target.value = "";
            if (!candidate) return;
            const problem = validateFile(candidate, limits);
            setFileError(problem);
            if (!problem) onFileChange(candidate);
          }}
        />
        {!file && (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-3.5" aria-hidden />
            Attach a file instead
          </Button>
        )}
      </div>

      {file ? (
        <div className="mt-2 flex flex-1 animate-fade-in flex-col items-center justify-center rounded-xl border border-line bg-muted/40 px-6 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
            <FileText className="size-5" aria-hidden />
          </span>
          <p className="mt-3 max-w-full truncate text-sm font-medium text-ink" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-ink-3">{formatBytes(file.size)} · used as the job description</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            disabled={disabled}
            onClick={() => {
              setFileError(null);
              onFileChange(null);
            }}
          >
            <X className="size-3.5" aria-hidden />
            Remove and paste text
          </Button>
        </div>
      ) : (
        <>
          <textarea
            id={textareaId}
            value={text}
            disabled={disabled}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder={
              optional
                ? "Optional — paste a job posting to audit your resume against that role. Leave empty to review the resume on its own."
                : "Paste the full job posting here — responsibilities, requirements and qualifications. The more complete it is, the more accurate the match."
            }
            aria-invalid={Boolean(shownError)}
            className={cn(
              "mt-2 min-h-64 w-full flex-1 resize-y rounded-xl border bg-surface px-4 py-3 text-sm leading-relaxed text-ink",
              "placeholder:text-ink-3 transition-colors duration-150",
              "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
              "disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-3",
              shownError ? "border-crit/60" : "border-line-strong",
            )}
          />
          <p className="mt-1.5 text-right text-xs text-ink-3">
            {words === 0 ? "No text yet" : `${words.toLocaleString()} ${words === 1 ? "word" : "words"}`}
          </p>
        </>
      )}

      {shownError && (
        <p role="alert" className="mt-1 flex items-start gap-1.5 text-sm text-crit-ink">
          <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />
          {shownError}
        </p>
      )}
    </div>
  );
}
