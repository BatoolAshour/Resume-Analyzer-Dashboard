"use client";

import { useHealth } from "@/components/providers/HealthProvider";
import { cn } from "@/lib/utils";

export function ApiStatus() {
  const { state } = useHealth();

  const view =
    state.status === "checking"
      ? { dot: "bg-ink-3 animate-pulse", text: "Connecting", title: "Checking the API…" }
      : state.status === "offline"
        ? { dot: "bg-crit", text: "API offline", title: "The backend is not reachable." }
        : state.health.llm_configured
          ? {
              dot: "bg-good",
              text: "API online",
              title: `Connected · model ${state.health.model}`,
            }
          : {
              dot: "bg-warn",
              text: "API key missing",
              title: "The backend is running but GROQ_API_KEY is not set.",
            };

  return (
    <span
      title={view.title}
      className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 sm:inline-flex"
    >
      <span className={cn("size-2 rounded-full", view.dot)} aria-hidden />
      {view.text}
    </span>
  );
}
