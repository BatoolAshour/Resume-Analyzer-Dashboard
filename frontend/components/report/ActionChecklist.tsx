"use client";

import { Check, ChevronsUp, Flame, Sparkles, type LucideIcon } from "lucide-react";
import { NothingToFix, PanelIntro } from "@/components/report/shared";
import { Card } from "@/components/ui/Card";
import { toneStyles, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { ActionItem, ActionPlan } from "@/types/analysis";

export function planItems(plan: ActionPlan): ActionItem[] {
  return [...plan.fix_now, ...plan.improve_next, ...plan.optional];
}

interface ActionChecklistProps {
  plan: ActionPlan;
  done: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

export function ActionChecklist({ plan, done, onToggle }: ActionChecklistProps) {
  const total = planItems(plan).length;
  const completed = planItems(plan).filter((item) => done.has(item.id)).length;

  return (
    <div>
      <PanelIntro title="Action plan">
        Everything in this report, turned into a checklist. Work from the top: tick each task
        off as you update your resume.
      </PanelIntro>

      {total === 0 ? (
        <NothingToFix title="Nothing to do">
          The report found no changes worth making.
        </NothingToFix>
      ) : (
        <>
          <Card className="p-5">
            <div className="flex items-baseline justify-between text-sm">
              <p className="font-medium text-ink">
                {completed} of {total} tasks done
              </p>
              <p className="text-ink-3">{Math.round((completed / total) * 100)}%</p>
            </div>
            <div
              role="progressbar"
              aria-label="Tasks completed"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={completed}
              className="mt-2 h-2 overflow-hidden rounded-full bg-good-soft"
            >
              <div
                className="h-full rounded-full bg-good transition-[width] duration-300"
                style={{ width: `${(completed / total) * 100}%` }}
              />
            </div>
          </Card>

          <div className="mt-3 space-y-3">
            <TaskGroup
              title="Fix now"
              description="The most urgent fixes. Do these before sending the resume anywhere."
              tone="crit"
              icon={Flame}
              items={plan.fix_now}
              empty="Nothing urgent to fix."
              done={done}
              onToggle={onToggle}
            />
            <TaskGroup
              title="Improve next"
              description="High-impact improvements."
              tone="serious"
              icon={ChevronsUp}
              items={plan.improve_next}
              empty="No high-impact improvements left."
              done={done}
              onToggle={onToggle}
            />
            <TaskGroup
              title="Optional improvements"
              description="Nice to have, once everything above is done."
              tone="neutral"
              icon={Sparkles}
              items={plan.optional}
              empty="No optional improvements."
              done={done}
              onToggle={onToggle}
            />
          </div>
        </>
      )}
    </div>
  );
}

interface TaskGroupProps {
  title: string;
  description: string;
  tone: Tone;
  icon: LucideIcon;
  items: ActionItem[];
  empty: string;
  done: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

function TaskGroup({
  title,
  description,
  tone,
  icon: Icon,
  items,
  empty,
  done,
  onToggle,
}: TaskGroupProps) {
  const styles = toneStyles[tone];
  const completed = items.filter((item) => done.has(item.id)).length;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            styles.soft,
            styles.ink,
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[15px] font-semibold text-ink">{title}</h4>
          <p className="text-sm text-ink-3">{description}</p>
        </div>
        {items.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-ink-2">
            {completed}/{items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-ink-3">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-1">
          {items.map((item) => {
            const checked = done.has(item.id);
            return (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    onChange={() => onToggle(item.id)}
                  />
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                      "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                      checked ? "border-good bg-good text-white" : "border-line-strong bg-surface",
                    )}
                    aria-hidden
                  >
                    {checked && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm font-medium transition-colors",
                        checked ? "text-ink-3 line-through" : "text-ink",
                      )}
                    >
                      {item.task}
                    </span>
                    {item.detail && (
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-2">
                        {item.detail}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
