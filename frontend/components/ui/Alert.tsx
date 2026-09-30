import { CircleAlert, CircleX, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toneStyles, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

const icons: Partial<Record<Tone, LucideIcon>> = {
  crit: CircleX,
  warn: CircleAlert,
};

interface AlertProps {
  tone?: Extract<Tone, "crit" | "warn" | "brand" | "neutral">;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Alert({ tone = "warn", title, children, action, className }: AlertProps) {
  const styles = toneStyles[tone];
  const Icon = icons[tone] ?? Info;
  return (
    <div
      role={tone === "crit" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        styles.soft,
        styles.border,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", styles.ink)} aria-hidden />
      <div className="min-w-0 flex-1 text-ink-2">
        {title && <p className="font-medium text-ink">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {action}
    </div>
  );
}
