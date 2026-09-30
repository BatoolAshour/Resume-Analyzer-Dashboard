import { Info } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  /** Accessible name for the trigger, e.g. "About ATS score". */
  label: string;
  children: string;
  align?: "center" | "start" | "end";
}

/** An info icon that reveals an explanation on hover, focus or tap. */
export function InfoTooltip({ label, children, align = "center" }: InfoTooltipProps) {
  const id = useId();
  return (
    <span className="group/tip relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="rounded-full text-ink-3 transition-colors hover:text-ink"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full z-30 mb-2 w-56 rounded-lg bg-ink px-3 py-2",
          "text-left text-xs font-normal leading-relaxed text-surface shadow-lg",
          "translate-y-1 opacity-0 transition duration-150",
          "group-hover/tip:translate-y-0 group-hover/tip:opacity-100",
          "group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "start" && "-left-2",
          align === "end" && "-right-2",
        )}
      >
        {children}
      </span>
    </span>
  );
}
