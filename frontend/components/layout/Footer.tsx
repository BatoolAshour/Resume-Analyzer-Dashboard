import { Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>AI Resume Analyzer · Next.js + FastAPI + Groq</p>
        <p className="flex items-center gap-2">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          Files are processed in memory and never stored. Resume text is sent to
          Groq for analysis.
        </p>
      </div>
    </footer>
  );
}
