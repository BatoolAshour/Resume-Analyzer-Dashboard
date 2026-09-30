import { toneStyles, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  tone: Tone;
  label: string;
  className?: string;
}

/** A 0-100 meter. The track is a lighter step of the fill's own hue. */
export function ProgressBar({ value, tone, label, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const styles = toneStyles[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("h-2 w-full overflow-hidden rounded-full", styles.soft, className)}
    >
      <div
        className={cn("h-full origin-left animate-grow-x rounded-full", styles.fill)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
