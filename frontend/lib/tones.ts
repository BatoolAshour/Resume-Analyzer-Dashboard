import {
  ChevronsUp,
  CircleAlert,
  CircleCheck,
  CircleX,
  Equal,
  Flame,
  Minus,
  type LucideIcon,
} from "lucide-react";
import type { Priority } from "@/types/analysis";

export type Tone = "neutral" | "brand" | "good" | "warn" | "serious" | "crit";

// Full class names (not built from fragments) so Tailwind can see them.
export const toneStyles: Record<
  Tone,
  { fill: string; soft: string; ink: string; stroke: string; track: string; border: string }
> = {
  neutral: {
    fill: "bg-ink-3",
    soft: "bg-muted",
    ink: "text-ink-2",
    stroke: "stroke-ink-3",
    track: "stroke-muted",
    border: "border-line",
  },
  brand: {
    fill: "bg-brand",
    soft: "bg-brand-soft",
    ink: "text-brand-ink",
    stroke: "stroke-brand",
    track: "stroke-brand-soft",
    border: "border-brand/25",
  },
  good: {
    fill: "bg-good",
    soft: "bg-good-soft",
    ink: "text-good-ink",
    stroke: "stroke-good",
    track: "stroke-good-soft",
    border: "border-good/25",
  },
  warn: {
    fill: "bg-warn",
    soft: "bg-warn-soft",
    ink: "text-warn-ink",
    stroke: "stroke-warn",
    track: "stroke-warn-soft",
    border: "border-warn/30",
  },
  serious: {
    fill: "bg-serious",
    soft: "bg-serious-soft",
    ink: "text-serious-ink",
    stroke: "stroke-serious",
    track: "stroke-serious-soft",
    border: "border-serious/30",
  },
  crit: {
    fill: "bg-crit",
    soft: "bg-crit-soft",
    ink: "text-crit-ink",
    stroke: "stroke-crit",
    track: "stroke-crit-soft",
    border: "border-crit/25",
  },
};

export interface ScoreRating {
  tone: Tone;
  label: string;
  icon: LucideIcon;
}

/** Shared thresholds for every 0-100 score in the app. */
export function rateScore(score: number): ScoreRating {
  if (score >= 75) return { tone: "good", label: "Strong", icon: CircleCheck };
  if (score >= 50) return { tone: "warn", label: "Fair", icon: CircleAlert };
  return { tone: "crit", label: "Needs work", icon: CircleX };
}

export const PRIORITY_ORDER: Priority[] = ["critical", "high", "medium", "low"];

export const priorityStyles: Record<
  Priority,
  { tone: Tone; label: string; icon: LucideIcon; hint: string }
> = {
  critical: {
    tone: "crit",
    label: "Critical",
    icon: Flame,
    hint: "Likely to get the resume rejected or mis-read by an ATS.",
  },
  high: {
    tone: "serious",
    label: "High",
    icon: ChevronsUp,
    hint: "Clearly lowers your score.",
  },
  medium: {
    tone: "warn",
    label: "Medium",
    icon: Equal,
    hint: "A worthwhile improvement.",
  },
  low: {
    tone: "neutral",
    label: "Low",
    icon: Minus,
    hint: "Polish, once everything else is done.",
  },
};
