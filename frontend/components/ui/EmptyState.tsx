import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  /** "inline" sits inside a card; "panel" stands on its own. */
  variant?: "inline" | "panel";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  variant = "inline",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        variant === "panel"
          ? "rounded-2xl border border-dashed border-line-strong px-6 py-14"
          : "rounded-xl bg-muted/60 px-4 py-6",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-ink-3",
          variant === "panel" ? "size-12" : "size-9 bg-surface",
        )}
      >
        <Icon className={variant === "panel" ? "size-6" : "size-4"} aria-hidden />
      </span>
      <p
        className={cn(
          "mt-3 font-medium text-ink",
          variant === "panel" ? "text-base" : "text-sm",
        )}
      >
        {title}
      </p>
      {children && (
        <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-3">{children}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
