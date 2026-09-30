import {
  CircleCheck,
  FileWarning,
  LayoutList,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { toneStyles, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { ResumeQuality } from "@/types/analysis";

interface InsightListProps {
  title: string;
  description: string;
  icon: LucideIcon;
  bullet: LucideIcon;
  tone: Tone;
  items: string[];
  /** Shown when the list is empty — for issues, that is good news. */
  empty: { text: string; positive: boolean };
  style?: React.CSSProperties;
}

function InsightList({
  title,
  description,
  icon,
  bullet: Bullet,
  tone,
  items,
  empty,
  style,
}: InsightListProps) {
  const styles = toneStyles[tone];
  return (
    <Card className="animate-fade-up p-6" style={style}>
      <CardHeader
        icon={icon}
        tone={tone}
        title={title}
        description={description}
        action={
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-ink-2">
            {items.length}
          </span>
        }
      />
      {items.length > 0 ? (
        <ul className="mt-4 space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-2">
              <Bullet className={cn("mt-0.5 size-4 shrink-0", styles.ink)} aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-ink-2">
          {empty.positive && (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-good-ink" aria-hidden />
          )}
          {empty.text}
        </p>
      )}
    </Card>
  );
}

interface QualityPanelsProps {
  quality: ResumeQuality;
  /** Animation delay of the first card, in ms. */
  delay?: number;
}

/** Resume Strengths, Missing Sections and Formatting Issues. */
export function QualityPanels({ quality, delay = 0 }: QualityPanelsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <InsightList
        title="Resume strengths"
        description="What already works well."
        icon={ShieldCheck}
        bullet={CircleCheck}
        tone="good"
        items={quality.strengths}
        empty={{ text: "No specific strengths were identified.", positive: false }}
        style={{ animationDelay: `${delay}ms` }}
      />
      <InsightList
        title="Missing sections"
        description="Standard sections an ATS expects."
        icon={LayoutList}
        bullet={TriangleAlert}
        tone="warn"
        items={quality.missing_sections}
        empty={{ text: "All standard sections are present.", positive: true }}
        style={{ animationDelay: `${delay + 60}ms` }}
      />
      <InsightList
        title="Formatting issues"
        description="Things that hurt parsing or readability."
        icon={FileWarning}
        bullet={TriangleAlert}
        tone="serious"
        items={quality.formatting_issues}
        empty={{ text: "No formatting issues were detected.", positive: true }}
        style={{ animationDelay: `${delay + 120}ms` }}
      />
    </div>
  );
}
