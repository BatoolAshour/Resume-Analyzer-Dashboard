import type { CSSProperties } from "react";
import { InfoTooltip } from "@/components/ui/Tooltip";
import { rateScore, toneStyles } from "@/lib/tones";
import { cn } from "@/lib/utils";

const SIZE = 168;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const LENGTH = 2 * Math.PI * RADIUS;

interface ScoreRingProps {
  score: number;
  /** What the score measures, e.g. "ATS score". */
  label: string;
  /** How the score is calculated. */
  tooltip: string;
}

/** The headline figure of a report: a 0-100 score as a circular meter. */
export function ScoreRing({ score, label, tooltip }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const rating = rateScore(clamped);
  const styles = toneStyles[rating.tone];
  const RatingIcon = rating.icon;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: SIZE, height: SIZE }}
        role="img"
        aria-label={`${label}: ${clamped} out of 100, ${rating.label}`}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className={styles.track}
          />
          {clamped > 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={LENGTH}
              strokeDashoffset={LENGTH * (1 - clamped / 100)}
              className={cn("animate-ring", styles.stroke)}
              style={{ "--ring-length": LENGTH } as CSSProperties}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-semibold leading-none tracking-tight text-ink">
            {clamped}
          </span>
          <span className="mt-1 text-xs font-medium text-ink-3">out of 100</span>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-ink">
        {label}
        <InfoTooltip label={`About ${label.toLowerCase()}`}>{tooltip}</InfoTooltip>
      </p>
      <span
        className={cn(
          "mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
          styles.soft,
          styles.ink,
        )}
      >
        <RatingIcon className="size-3.5" aria-hidden />
        {rating.label}
      </span>
    </div>
  );
}
