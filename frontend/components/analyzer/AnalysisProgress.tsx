"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { AnalysisMode } from "@/types/analysis";

// The stages the backend works through, in order. The API answers once at the
// end, so the active stage is an estimate based on typical timings; the last
// stage stays active until the response actually arrives.
const stages: Record<AnalysisMode, string[]> = {
  ats: [
    "Reading your resume",
    "Checking sections and formatting",
    "Scoring ATS readiness",
    "Writing recommendations",
  ],
  match: [
    "Reading your resume and the job description",
    "Comparing skills and keywords",
    "Scoring experience and education fit",
    "Building recommendations and a learning path",
  ],
  report: [
    "Reading your resume",
    "Reviewing content, bullets and writing",
    "Checking ATS readiness and skills",
    "Writing the summary and action plan",
  ],
};

const titles: Record<AnalysisMode, string> = {
  ats: "Running ATS check",
  match: "Matching resume to the job",
  report: "Building your full audit report",
};

const STAGE_MS: Record<AnalysisMode, number> = { ats: 700, match: 900, report: 900 };

interface AnalysisProgressProps {
  mode: AnalysisMode;
  onCancel: () => void;
}

export function AnalysisProgress({ mode, onCancel }: AnalysisProgressProps) {
  const steps = stages[mode];
  const [active, setActive] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const stage = setInterval(
      () => setActive((index) => Math.min(index + 1, steps.length - 1)),
      STAGE_MS[mode],
    );
    const clock = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => {
      clearInterval(stage);
      clearInterval(clock);
    };
  }, [mode, steps.length]);

  return (
    <Card className="animate-fade-in p-6" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
          <LoaderCircle className="size-[18px] animate-spin" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">
            {titles[mode]}
          </p>
          <p className="text-sm text-ink-3">
            {seconds}s elapsed ·{" "}
            {mode === "report"
              ? "usually a few seconds, up to a minute if the AI provider's rate limit is hit"
              : "this usually takes a few seconds"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const done = index < active;
          const current = index === active;
          return (
            <li
              key={step}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors duration-300",
                current
                  ? "border-brand/30 bg-brand-soft/60 text-ink"
                  : done
                    ? "border-line bg-surface text-ink-2"
                    : "border-line bg-surface text-ink-3",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                  done && "bg-good text-white",
                  current && "text-brand-ink",
                  !done && !current && "border border-line-strong",
                )}
                aria-hidden
              >
                {done && <Check className="size-2.5" strokeWidth={3.5} />}
                {current && <LoaderCircle className="size-4 animate-spin" />}
              </span>
              {step}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
