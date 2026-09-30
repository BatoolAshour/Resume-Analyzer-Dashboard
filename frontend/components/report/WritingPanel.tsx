import { BeforeAfter, NothingToFix, PanelIntro } from "@/components/report/shared";
import { Card } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { writingTypeLabels } from "@/lib/reportLabels";
import type { WritingIssue } from "@/types/analysis";

export function WritingPanel({ issues }: { issues: WritingIssue[] }) {
  return (
    <div>
      <PanelIntro title="Language & writing quality">
        Grammar, wording, repetition and tone problems, each with a suggested correction.
        Lines already covered under Bullets are not repeated here.
      </PanelIntro>

      {issues.length === 0 ? (
        <NothingToFix title="No language problems found">
          The writing is clear and consistent.
        </NothingToFix>
      ) : (
        <ul className="space-y-3">
          {issues.map((issue) => (
            <li key={`${issue.type}-${issue.original}`}>
              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-ink-2">
                    {writingTypeLabels[issue.type]}
                  </span>
                  <PriorityBadge priority={issue.priority} />
                </div>
                {issue.problem && (
                  <p className="mt-3 text-sm leading-relaxed text-ink-2">
                    <span className="font-semibold text-ink">Problem: </span>
                    {issue.problem}
                  </p>
                )}
                <div className="mt-3">
                  <BeforeAfter
                    beforeLabel="Original"
                    before={issue.original}
                    afterLabel="Suggested correction"
                    after={issue.suggestion}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
