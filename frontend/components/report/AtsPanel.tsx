import { PanelIntro } from "@/components/report/shared";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { atsAreaLabels, atsStatusStyles } from "@/lib/reportLabels";
import { rateScore, toneStyles } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { AtsAudit } from "@/types/analysis";
import { ScanSearch } from "lucide-react";

export function AtsPanel({ ats }: { ats: AtsAudit }) {
  const passed = ats.areas.filter((area) => area.status === "pass").length;
  const rating = ats.score === null ? null : rateScore(ats.score);

  return (
    <div>
      <PanelIntro title="ATS analysis">
        {ats.summary || "How an applicant tracking system is likely to read this resume."} This
        is judged from the text that can be extracted from your file, which is what an ATS sees.
      </PanelIntro>

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-2">ATS score</p>
            <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-ink">
              {ats.score ?? "—"}
              {ats.score !== null && (
                <span className="ml-1 text-base font-medium text-ink-3">/ 100</span>
              )}
            </p>
          </div>
          {ats.areas.length > 0 && (
            <p className="text-sm text-ink-3">
              {passed} of {ats.areas.length} checks passed
            </p>
          )}
        </div>
        {ats.score !== null && rating && (
          <ProgressBar value={ats.score} tone={rating.tone} label="ATS score" className="mt-3" />
        )}
      </Card>

      {ats.areas.length === 0 ? (
        <EmptyState icon={ScanSearch} title="No detailed checks were returned" className="mt-3">
          Run the report again to get the area-by-area breakdown.
        </EmptyState>
      ) : (
        <ul className="mt-3 space-y-3">
          {ats.areas.map((area) => {
            const status = atsStatusStyles[area.status];
            const styles = toneStyles[status.tone];
            const StatusIcon = status.icon;
            return (
              <li key={`${area.area}-${area.finding}`}>
                <Card className="flex gap-4 p-5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      styles.soft,
                      styles.ink,
                    )}
                  >
                    <StatusIcon className="size-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[15px] font-semibold text-ink">
                        {atsAreaLabels[area.area]}
                      </h4>
                      <span className={cn("text-xs font-semibold", styles.ink)}>
                        {status.label}
                      </span>
                      {area.status !== "pass" && <PriorityBadge priority={area.priority} />}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{area.finding}</p>
                    {area.fix && area.status !== "pass" && (
                      <p className="mt-2 rounded-lg bg-muted/70 px-3 py-2 text-sm leading-relaxed text-ink">
                        <span className="font-semibold">Fix: </span>
                        {area.fix}
                      </p>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
