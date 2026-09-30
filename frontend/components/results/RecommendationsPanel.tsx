"use client";

import { Lightbulb, ListChecks } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PRIORITY_ORDER, priorityStyles, toneStyles } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { Priority, Recommendation } from "@/types/analysis";

type Filter = Priority | "all";

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  style?: React.CSSProperties;
}

export function RecommendationsPanel({ recommendations, style }: RecommendationsPanelProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = Object.fromEntries(
    PRIORITY_ORDER.map((p) => [p, recommendations.filter((r) => r.priority === p).length]),
  ) as Record<Priority, number>;

  // The API already sorts Critical -> Low; sort again so the UI never depends on it.
  const visible = recommendations
    .filter((r) => filter === "all" || r.priority === filter)
    .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));

  return (
    <Card className="animate-fade-up p-6" style={style}>
      <CardHeader
        icon={ListChecks}
        title="Recommendations"
        description="What to change and why, most urgent first."
      />

      {recommendations.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No recommendations" className="mt-5">
          The analysis didn&apos;t produce any specific changes for this resume.
        </EmptyState>
      ) : (
        <>
          <div
            role="group"
            aria-label="Filter by priority"
            className="mt-5 flex flex-wrap gap-1.5"
          >
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              count={recommendations.length}
            >
              All
            </FilterChip>
            {PRIORITY_ORDER.map((priority) => {
              const { label, icon: Icon, tone, hint } = priorityStyles[priority];
              return (
                <FilterChip
                  key={priority}
                  active={filter === priority}
                  disabled={counts[priority] === 0}
                  onClick={() => setFilter(priority)}
                  count={counts[priority]}
                  title={hint}
                >
                  <Icon className={cn("size-3.5", toneStyles[tone].ink)} aria-hidden />
                  {label}
                </FilterChip>
              );
            })}
          </div>

          <ol className="mt-4 space-y-3">
            {visible.map((item, index) => (
              <RecommendationItem key={`${item.priority}-${item.title}-${index}`} item={item} />
            ))}
          </ol>
        </>
      )}
    </Card>
  );
}

interface FilterChipProps {
  active: boolean;
  disabled?: boolean;
  count: number;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}

function FilterChip({ active, disabled, count, title, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "border-ink bg-ink text-surface"
          : "border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-muted",
      )}
    >
      {children}
      <span className={cn("text-xs", active ? "text-surface/70" : "text-ink-3")}>{count}</span>
    </button>
  );
}

function RecommendationItem({ item }: { item: Recommendation }) {
  const priority = priorityStyles[item.priority];
  const styles = toneStyles[priority.tone];

  return (
    <li className="relative animate-fade-in overflow-hidden rounded-xl border border-line bg-surface p-4 pl-5">
      <span className={cn("absolute inset-y-0 left-0 w-1", styles.fill)} aria-hidden />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={priority.tone} icon={priority.icon}>
          {priority.label}
        </Badge>
        <span className="text-xs capitalize text-ink-3">{item.category}</span>
      </div>
      <h4 className="mt-2 text-[15px] font-semibold leading-snug text-ink">{item.title}</h4>

      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        {item.action && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-3">
              What to change
            </dt>
            <dd className="mt-1 leading-relaxed text-ink-2">{item.action}</dd>
          </div>
        )}
        {item.reason && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-3">
              Why it matters
            </dt>
            <dd className="mt-1 leading-relaxed text-ink-2">{item.reason}</dd>
          </div>
        )}
      </dl>
    </li>
  );
}
