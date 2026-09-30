import { ArrowDown, CircleCheck, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PLACEHOLDER_PATTERN } from "@/lib/reportLabels";
import { cn } from "@/lib/utils";

/** Heading shown at the top of every report tab. */
export function PanelIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

/** Shown in place of a part of the report whose model call failed. */
export function PartUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="This part of the report couldn't be generated"
      variant="panel"
      action={
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden />
          Run the report again
        </Button>
      }
    >
      The AI service didn&apos;t return a usable answer for this section. The rest of the
      report is unaffected.
    </EmptyState>
  );
}

/** A positive empty state: there was nothing to flag. */
export function NothingToFix({ title, children }: { title: string; children: ReactNode }) {
  return (
    <EmptyState icon={CircleCheck} title={title} variant="panel">
      {children}
    </EmptyState>
  );
}

/** Renders text with [placeholders] highlighted so they are not overlooked. */
export function WithPlaceholders({ text }: { text: string }) {
  return (
    <>
      {text.split(PLACEHOLDER_PATTERN).map((part, index) =>
        PLACEHOLDER_PATTERN.test(part) ? (
          <mark
            key={index}
            className="rounded bg-warn-soft px-1 py-0.5 font-mono text-[0.85em] font-medium text-warn-ink"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

interface BeforeAfterProps {
  beforeLabel?: string;
  before: string;
  afterLabel?: string;
  after: string;
  action?: ReactNode;
}

/** Current text and its suggested replacement, one above the other. */
export function BeforeAfter({
  beforeLabel = "Current",
  before,
  afterLabel = "Suggested",
  after,
  action,
}: BeforeAfterProps) {
  return (
    <div>
      <div className="rounded-lg border border-line bg-muted/60 px-3.5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
          {beforeLabel}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{before}</p>
      </div>
      {after && (
        <>
          <div className="flex justify-center py-1 text-ink-3" aria-hidden>
            <ArrowDown className="size-4" />
          </div>
          <div className="rounded-lg border border-good/30 bg-good-soft/60 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-good-ink">
                {afterLabel}
              </p>
              {action}
            </div>
            <p className="mt-1 text-sm font-medium leading-relaxed text-ink">
              <WithPlaceholders text={after} />
            </p>
          </div>
        </>
      )}
    </div>
  );
}

interface LabelledListProps {
  icon: LucideIcon;
  iconClass: string;
  title?: string;
  items: string[];
  empty: string;
}

export function LabelledList({ icon: Icon, iconClass, title, items, empty }: LabelledListProps) {
  return (
    <div className="space-y-2">
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{title}</p>
      )}
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-ink-2">
              <Icon className={cn("mt-0.5 size-4 shrink-0", iconClass)} aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">{empty}</p>
      )}
    </div>
  );
}
