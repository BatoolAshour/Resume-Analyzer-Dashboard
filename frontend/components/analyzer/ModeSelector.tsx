"use client";

import { Check, ClipboardList, ScanSearch, Target, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisMode } from "@/types/analysis";

const modes: {
  value: AnalysisMode;
  icon: LucideIcon;
  title: string;
  needs: string;
  text: string;
}[] = [
  {
    value: "ats",
    icon: ScanSearch,
    title: "ATS Check",
    needs: "Resume only",
    text: "Score how well your resume parses, and catch missing sections and formatting issues.",
  },
  {
    value: "match",
    icon: Target,
    title: "Job Match",
    needs: "Resume + job description",
    text: "Compare against a specific role: match score, skill gaps and a learning path.",
  },
  {
    value: "report",
    icon: ClipboardList,
    title: "Full Audit",
    needs: "Resume · job description optional",
    text: "A complete review: what's missing, weak bullets rewritten, ATS and skills analysis, and an action plan.",
  },
];

interface ModeSelectorProps {
  value: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
  disabled?: boolean;
}

export function ModeSelector({ value, onChange, disabled }: ModeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Analysis mode" className="grid gap-3 lg:grid-cols-3">
      {modes.map(({ value: mode, icon: Icon, title, needs, text }) => {
        const selected = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(mode)}
            className={cn(
              "relative rounded-xl border p-4 text-left transition-all duration-150",
              "disabled:cursor-not-allowed disabled:opacity-60",
              selected
                ? "border-brand bg-brand-soft/60 ring-1 ring-brand"
                : "border-line bg-surface hover:border-line-strong hover:bg-muted/50",
            )}
          >
            <span className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-colors",
                  selected ? "bg-brand text-white" : "bg-muted text-ink-2",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{title}</span>
                <span className="block text-xs text-ink-3">{needs}</span>
              </span>
              <span
                className={cn(
                  "ml-auto flex size-5 items-center justify-center rounded-full border transition-colors",
                  selected ? "border-brand bg-brand text-white" : "border-line-strong",
                )}
                aria-hidden
              >
                {selected && <Check className="size-3" strokeWidth={3} />}
              </span>
            </span>
            <span className="mt-3 block text-[13px] leading-relaxed text-ink-2">{text}</span>
          </button>
        );
      })}
    </div>
  );
}
