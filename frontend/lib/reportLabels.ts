import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/lib/tones";
import type {
  AtsAreaName,
  AtsStatus,
  BulletIssue,
  GapStatus,
  SectionRating,
  WritingType,
} from "@/types/analysis";

interface StatusStyle {
  tone: Tone;
  label: string;
  icon: LucideIcon;
}

/** Missing vs. weak vs. recommended is the report's core distinction. */
export const gapStatusStyles: Record<GapStatus, StatusStyle & { hint: string }> = {
  missing: {
    tone: "crit",
    label: "Missing",
    icon: CircleX,
    hint: "Expected on a resume, but not there.",
  },
  weak: {
    tone: "warn",
    label: "Weak",
    icon: TriangleAlert,
    hint: "It is there, but should be improved.",
  },
  recommended: {
    tone: "brand",
    label: "Recommended",
    icon: Sparkles,
    hint: "Optional — adding it would strengthen the resume.",
  },
};

export const ratingStyles: Record<SectionRating, StatusStyle> = {
  strong: { tone: "good", label: "Strong", icon: CircleCheck },
  adequate: { tone: "neutral", label: "Adequate", icon: CircleDashed },
  weak: { tone: "crit", label: "Weak", icon: CircleX },
};

export const atsStatusStyles: Record<AtsStatus, StatusStyle> = {
  pass: { tone: "good", label: "Pass", icon: CircleCheck },
  warning: { tone: "warn", label: "Warning", icon: TriangleAlert },
  fail: { tone: "crit", label: "Fail", icon: CircleX },
};

export const atsAreaLabels: Record<AtsAreaName, string> = {
  readability: "ATS readability",
  section_naming: "Section naming",
  formatting: "Formatting risks",
  keywords: "Keyword usage",
  skills_visibility: "Skills visibility",
  contact_info: "Contact information",
  parsing: "Parsing problems",
  other: "Other",
};

export const bulletIssueLabels: Record<BulletIssue, string> = {
  vague: "Vague",
  repetitive: "Repetitive",
  no_action_verb: "No action verb",
  no_metric: "No measurable impact",
  responsibility: "Duty, not achievement",
  too_long: "Too long",
};

export const writingTypeLabels: Record<WritingType, string> = {
  grammar: "Grammar",
  weak_wording: "Weak wording",
  repetition: "Repetition",
  unprofessional: "Unprofessional",
  buzzwords: "Buzzwords",
  long_sentence: "Long sentence",
  tense: "Inconsistent tense",
  other: "Wording",
};

/** Matches the [X%]-style placeholders the backend leaves for unknown facts. */
export const PLACEHOLDER_PATTERN = /(\[[^\[\]]{1,40}\])/;
