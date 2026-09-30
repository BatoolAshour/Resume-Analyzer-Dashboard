import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toneStyles, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

interface BadgeProps {
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", icon: Icon, children, className }: BadgeProps) {
  const styles = toneStyles[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        styles.soft,
        styles.ink,
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}
