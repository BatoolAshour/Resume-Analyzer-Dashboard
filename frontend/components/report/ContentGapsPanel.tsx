import { CircleCheck } from "lucide-react";
import { NothingToFix, PanelIntro } from "@/components/report/shared";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { gapStatusStyles } from "@/lib/reportLabels";
import { toneStyles } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { ContentGap } from "@/types/analysis";

interface ContentGapsPanelProps {
  gaps: ContentGap[];
  /** Expected items that were found in the resume. */
  present: string[];
}

export function ContentGapsPanel({ gaps, present }: ContentGapsPanelProps) {
  return (
    <div>
      <PanelIntro title="Missing content">
        Sections and information a reader expects to find. <strong>Missing</strong> means it
        should be there and isn&apos;t; <strong>Recommended</strong> means it is optional but
        would strengthen the resume.
      </PanelIntro>

      {present.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <span className="font-medium text-ink">Already in your resume</span>
          {present.map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-ink-2">
              <CircleCheck className="size-4 text-good-ink" aria-hidden />
              {item}
            </span>
          ))}
        </div>
      )}

      {gaps.length === 0 ? (
        <NothingToFix title="Nothing important is missing">
          Your resume has the sections and details a reader expects.
        </NothingToFix>
      ) : (
        <ul className="space-y-3">
          {gaps.map((gap) => {
            const status = gapStatusStyles[gap.status];
            return (
              <li key={gap.item}>
                <Card className="relative overflow-hidden p-5 pl-6">
                  <span
                    className={cn("absolute inset-y-0 left-0 w-1", toneStyles[status.tone].fill)}
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="mr-1 text-[15px] font-semibold text-ink">{gap.item}</h4>
                    <span title={status.hint}>
                      <Badge tone={status.tone} icon={status.icon}>
                        {status.label}
                      </Badge>
                    </span>
                    <PriorityBadge priority={gap.priority} />
                  </div>
                  <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                    <Detail label="What is missing" value={gap.what} />
                    <Detail label="Why it matters" value={gap.why} />
                    <Detail label="How to fix it" value={gap.fix} emphasized />
                  </dl>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</dt>
      <dd className={cn("mt-1 leading-relaxed", emphasized ? "text-ink" : "text-ink-2")}>
        {value}
      </dd>
    </div>
  );
}
