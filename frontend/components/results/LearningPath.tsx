import { CircleCheck, Route } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LearningStep } from "@/types/analysis";

interface LearningPathProps {
  steps: LearningStep[];
  style?: React.CSSProperties;
}

export function LearningPath({ steps, style }: LearningPathProps) {
  return (
    <Card className="animate-fade-up p-6" style={style}>
      <CardHeader
        icon={Route}
        title="Learning path"
        description="Missing skills in the order to learn them, foundational first."
      />

      {steps.length === 0 ? (
        <EmptyState icon={CircleCheck} title="No gaps to close" className="mt-5">
          Your resume already covers the skills this job asks for.
        </EmptyState>
      ) : (
        <ol className="mt-5">
          {steps.map((step, index) => {
            const last = index === steps.length - 1;
            return (
              <li key={step.skill} className="relative flex gap-4 pb-5 last:pb-0">
                {!last && (
                  <span
                    className="absolute bottom-0 left-[15px] top-8 w-px bg-line-strong"
                    aria-hidden
                  />
                )}
                <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand-soft text-[13px] font-semibold text-brand-ink">
                  {index + 1}
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm font-semibold text-ink">{step.skill}</p>
                  {step.reason && (
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{step.reason}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
