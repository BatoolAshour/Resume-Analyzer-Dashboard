import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { toneStyles, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface shadow-card",
        className,
      )}
      {...props}
    />
  );
}

interface CardHeaderProps {
  icon?: LucideIcon;
  tone?: Tone;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({
  icon: Icon,
  tone = "brand",
  title,
  description,
  action,
  className,
}: CardHeaderProps) {
  const styles = toneStyles[tone];
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {Icon && (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            styles.soft,
            styles.ink,
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold leading-6 text-ink">{title}</h3>
        {description && (
          <p className="text-sm leading-5 text-ink-3">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
