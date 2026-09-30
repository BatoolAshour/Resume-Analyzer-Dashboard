import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { InfoTooltip } from "@/components/ui/Tooltip";
import { rateScore, toneStyles, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

interface MetricShellProps {
  icon: LucideIcon;
  label: string;
  tooltip: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

function MetricShell({ icon: Icon, label, tooltip, children, style }: MetricShellProps) {
  return (
    <Card className="flex min-w-0 animate-fade-up flex-col p-5" style={style}>
      <div className="flex items-center gap-2 text-sm font-medium text-ink-2">
        <Icon className="size-4 text-ink-3" aria-hidden />
        {label}
        <span className="ml-auto">
          <InfoTooltip label={`About ${label.toLowerCase()}`} align="end">
            {tooltip}
          </InfoTooltip>
        </span>
      </div>
      {children}
    </Card>
  );
}

interface PercentMetricProps extends Omit<MetricShellProps, "children"> {
  /** null when the value could not be determined. */
  value: number | null;
  caption: string;
}

/** A percentage with a meter and a rated status. */
export function PercentMetric({ value, caption, ...shell }: PercentMetricProps) {
  if (value === null) {
    return (
      <MetricShell {...shell}>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-ink-3">—</p>
        <p className="mt-auto pt-3 text-xs leading-relaxed text-ink-3">{caption}</p>
      </MetricShell>
    );
  }

  const rating = rateScore(value);
  const RatingIcon = rating.icon;
  return (
    <MetricShell {...shell}>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-3xl font-semibold leading-none tracking-tight text-ink">
          {value}
          <span className="ml-0.5 text-lg font-medium text-ink-3">%</span>
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            toneStyles[rating.tone].ink,
          )}
        >
          <RatingIcon className="size-3.5" aria-hidden />
          {rating.label}
        </span>
      </div>
      <ProgressBar value={value} tone={rating.tone} label={shell.label} className="mt-3" />
      <p className="mt-auto pt-3 text-xs leading-relaxed text-ink-3">{caption}</p>
    </MetricShell>
  );
}

interface FitMetricProps extends Omit<MetricShellProps, "children"> {
  verdict: { tone: Tone; label: string; icon: LucideIcon };
  rows: { label: string; value: string }[];
}

/** A qualitative verdict (meets / below / …) with the evidence behind it. */
export function FitMetric({ verdict, rows, ...shell }: FitMetricProps) {
  const styles = toneStyles[verdict.tone];
  const VerdictIcon = verdict.icon;
  return (
    <MetricShell {...shell}>
      <p
        className={cn(
          "mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold",
          styles.soft,
          styles.ink,
        )}
      >
        <VerdictIcon className="size-4" aria-hidden />
        {verdict.label}
      </p>
      <dl className="mt-auto space-y-1 pt-3 text-xs">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <dt className="shrink-0 text-ink-3">{row.label}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-ink-2" title={row.value}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </MetricShell>
  );
}
