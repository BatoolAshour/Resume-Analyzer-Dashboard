"use client";

import { CircleX, CloudUpload, FileText, LoaderCircle, Replace, Trash2 } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn, fileExtension, formatBytes } from "@/lib/utils";
import { validateFile, type UploadLimits } from "@/lib/validation";

interface UploadDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  limits: UploadLimits;
  /** True while the file is being uploaded and analyzed. */
  busy?: boolean;
  /** An error from outside the component, e.g. the server rejecting the file. */
  externalError?: string | null;
}

export function UploadDropzone({
  file,
  onFileChange,
  limits,
  busy = false,
  externalError,
}: UploadDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = localError ?? externalError ?? null;
  const formats = limits.allowedExtensions.map((e) => e.slice(1).toUpperCase());

  function accept(candidate: File | undefined) {
    if (!candidate) return;
    const problem = validateFile(candidate, limits);
    setLocalError(problem);
    // A rejected file never replaces a valid one that is already selected.
    if (!problem) onFileChange(candidate);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    if (event.dataTransfer.files.length > 1) {
      setLocalError("Drop a single file — only one resume can be analyzed at a time.");
      return;
    }
    accept(event.dataTransfer.files[0]);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  const input = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept={limits.allowedExtensions.join(",")}
      className="peer sr-only"
      disabled={busy}
      onChange={(event) => {
        accept(event.target.files?.[0]);
        event.target.value = ""; // allow re-selecting the same file
      }}
    />
  );

  return (
    <div>
      {input}

      {file ? (
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="relative animate-fade-in overflow-hidden rounded-xl border border-line bg-surface p-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
              <FileText className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink" title={file.name}>
                {file.name}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase text-ink-2">
                  {fileExtension(file.name).slice(1)}
                </span>
                {formatBytes(file.size)}
                {busy && (
                  <span className="flex items-center gap-1 text-brand-ink">
                    <LoaderCircle className="size-3 animate-spin" aria-hidden />
                    Uploading and analyzing…
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="sm" onClick={openPicker} disabled={busy}>
                <Replace className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">Change</span>
                <span className="sr-only sm:hidden">Change file</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setLocalError(null);
                  onFileChange(null);
                }}
              >
                <Trash2 className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">Remove</span>
                <span className="sr-only sm:hidden">Remove file</span>
              </Button>
            </div>
          </div>
          {busy && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-brand-soft">
              <div className="h-full w-1/2 animate-shimmer bg-brand" />
            </div>
          )}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-150",
            "peer-focus-visible:border-brand peer-focus-visible:bg-brand-soft/40",
            dragging
              ? "scale-[1.01] border-brand bg-brand-soft/60"
              : error
                ? "border-crit/50 bg-crit-soft/40 hover:border-crit"
                : "border-line-strong bg-muted/40 hover:border-brand hover:bg-brand-soft/30",
          )}
        >
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-full transition-colors",
              dragging ? "bg-brand text-white" : "bg-surface text-brand-ink shadow-card",
            )}
          >
            <CloudUpload className="size-6" aria-hidden />
          </span>
          <span className="mt-4 text-sm font-medium text-ink">
            {dragging ? "Drop your resume here" : "Drag and drop your resume"}
          </span>
          <span className="mt-1 text-sm text-ink-3">
            or <span className="font-medium text-brand-ink underline-offset-2 hover:underline">browse files</span>
          </span>
          <span className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs text-ink-3">
            {formats.map((format) => (
              <span
                key={format}
                className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-2"
              >
                {format}
              </span>
            ))}
            <span className="ml-1">up to {limits.maxUploadMb} MB</span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-crit-ink">
          <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
