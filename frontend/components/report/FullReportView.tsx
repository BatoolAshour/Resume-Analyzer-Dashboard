"use client";

import {
  ArrowRight,
  CircleCheck,
  CircleX,
  Clock,
  Download,
  FileText,
  Flame,
  Lightbulb,
  RefreshCw,
  ScanSearch,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { ActionChecklist, planItems } from "@/components/report/ActionChecklist";
import { AtsPanel } from "@/components/report/AtsPanel";
import { BulletsPanel } from "@/components/report/BulletsPanel";
import { ContentGapsPanel } from "@/components/report/ContentGapsPanel";
import { SectionReviewsPanel } from "@/components/report/SectionReviewsPanel";
import { LabelledList, PartUnavailable } from "@/components/report/shared";
import { SkillsAuditPanel } from "@/components/report/SkillsAuditPanel";
import { WritingPanel } from "@/components/report/WritingPanel";
import { ScoreRing } from "@/components/results/ScoreRing";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { downloadText, reportToMarkdown } from "@/lib/reportMarkdown";
import { toneStyles, type Tone } from "@/lib/tones";
import { cn, formatDuration } from "@/lib/utils";
import type { FullReport } from "@/types/analysis";

type TabId =
  | "overview"
  | "content"
  | "sections"
  | "bullets"
  | "ats"
  | "skills"
  | "writing"
  | "plan";

interface FullReportViewProps {
  report: FullReport;
  onReset: () => void;
  /** Re-run the same request, e.g. after a part of the report failed. */
  onRetry: () => void;
}

export function FullReportView({ report, onReset, onRetry }: FullReportViewProps) {
  const [tab, setTab] = useState<TabId>("overview");
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());

  const tasks = planItems(report.action_plan);
  const tasksDone = tasks.filter((task) => done.has(task.id)).length;
  const atsIssues = report.ats?.areas.filter((area) => area.status !== "pass").length;

  const tabs: { id: TabId; label: string; count?: number | string }[] = [
    { id: "overview", label: "Overview" },
    { id: "content", label: "Missing content", count: report.missing_content?.length },
    { id: "sections", label: "Sections", count: report.section_reviews?.length },
    { id: "bullets", label: "Bullets", count: report.bullets?.items.length },
    { id: "ats", label: "ATS", count: atsIssues },
    { id: "skills", label: "Skills" },
    { id: "writing", label: "Writing", count: report.writing?.length },
    { id: "plan", label: "Action plan", count: `${tasksDone}/${tasks.length}` },
  ];

  function toggleTask(id: string) {
    setDone((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function download() {
    const name = report.meta.filename.replace(/\.[^.]+$/, "") || "resume";
    downloadText(`${name}-audit-report.md`, reportToMarkdown(report, done));
  }

  const notices = [
    ...report.warnings,
    ...(report.meta.truncated
      ? ["Your resume is very long, so only the first part of it was analyzed."]
      : []),
  ];

  const unavailable = <PartUnavailable onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      {notices.map((notice) => (
        <Alert key={notice} tone="warn" className="animate-fade-in">
          {notice}
        </Alert>
      ))}

      <ReportHeader report={report} onReset={onReset} onDownload={download} />

      <div
        role="tablist"
        aria-label="Report sections"
        className="sticky top-16 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-line bg-bg/90 px-4 py-2 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:bg-surface/90 sm:px-2"
      >
        {tabs.map(({ id, label, count }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`report-tab-${id}`}
              aria-selected={selected}
              aria-controls="report-panel"
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                selected ? "bg-ink text-surface" : "text-ink-2 hover:bg-muted hover:text-ink",
              )}
            >
              {label}
              {count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    selected ? "bg-surface/20 text-surface" : "bg-muted text-ink-3",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="report-panel"
        aria-labelledby={`report-tab-${tab}`}
        // Remount on tab change so the panel's entrance animation replays.
        key={tab}
        className="animate-fade-in"
      >
        {tab === "overview" && <Overview report={report} onOpen={setTab} />}
        {tab === "content" &&
          (report.missing_content ? (
            <ContentGapsPanel gaps={report.missing_content} present={report.content_present} />
          ) : (
            unavailable
          ))}
        {tab === "sections" &&
          (report.section_reviews ? (
            <SectionReviewsPanel reviews={report.section_reviews} />
          ) : (
            unavailable
          ))}
        {tab === "bullets" &&
          (report.bullets ? <BulletsPanel bullets={report.bullets} /> : unavailable)}
        {tab === "ats" && (report.ats ? <AtsPanel ats={report.ats} /> : unavailable)}
        {tab === "skills" &&
          (report.skills ? <SkillsAuditPanel skills={report.skills} /> : unavailable)}
        {tab === "writing" &&
          (report.writing ? <WritingPanel issues={report.writing} /> : unavailable)}
        {tab === "plan" && (
          <ActionChecklist plan={report.action_plan} done={done} onToggle={toggleTask} />
        )}
      </div>

      <p className="pt-2 text-center text-xs text-ink-3">
        This report is AI-generated ({report.meta.models.join(", ")}) from the text of your
        resume. Check each suggestion against your real experience before using it.
      </p>
    </div>
  );
}

interface ReportHeaderProps {
  report: FullReport;
  onReset: () => void;
  onDownload: () => void;
}

function ReportHeader({ report, onReset, onDownload }: ReportHeaderProps) {
  const { stats, executive_summary: summary, meta } = report;
  return (
    <Card className="animate-fade-up p-6 sm:p-8">
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
        {report.overall_score === null ? (
          <div className="flex size-[168px] shrink-0 flex-col items-center justify-center rounded-full border-2 border-dashed border-line-strong text-center">
            <span className="text-3xl font-semibold text-ink-3">—</span>
            <span className="mt-1 px-6 text-xs text-ink-3">Overall score unavailable</span>
          </div>
        ) : (
          <ScoreRing
            score={report.overall_score}
            label="Overall score"
            tooltip="Overall resume quality: content completeness, strength of the bullets, ATS readiness and writing quality."
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">Full Audit report</Badge>
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-ink-3">
              <FileText className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{meta.filename}</span>
              <span aria-hidden>·</span>
              <span className="shrink-0">{meta.word_count.toLocaleString()} words</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-ink-3">
              <Clock className="size-3.5" aria-hidden />
              Analyzed in {formatDuration(meta.duration_ms)}
            </span>
            <span className="text-xs text-ink-3">
              {report.has_job_description
                ? "· Reviewed against your job description"
                : "· Reviewed on its own (no job description)"}
            </span>
          </div>

          <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">Report summary</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            {summary?.overall_quality ||
              "The written summary could not be generated for this run. The detailed findings below are complete."}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Critical issues"
              value={stats.critical}
              tone="crit"
              icon={Flame}
              hint="Likely to get the resume rejected or mis-read."
            />
            <StatTile
              label="Warnings"
              value={stats.warnings}
              tone="serious"
              icon={TriangleAlert}
              hint="High-priority problems that clearly hurt the resume."
            />
            <StatTile
              label="Improvements"
              value={stats.improvements}
              tone="warn"
              icon={Lightbulb}
              hint="Medium and low priority changes worth making."
            />
            <StatTile
              label="ATS score"
              value={report.ats?.score ?? "—"}
              tone="brand"
              icon={ScanSearch}
              hint="How easily an applicant tracking system can read the resume, out of 100."
            />
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" onClick={onDownload}>
              <Download className="size-3.5" aria-hidden />
              Download full report
            </Button>
            <Button variant="secondary" size="sm" onClick={onReset}>
              <RefreshCw className="size-3.5" aria-hidden />
              New analysis
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface StatTileProps {
  label: string;
  value: number | string;
  tone: Tone;
  icon: LucideIcon;
  hint: string;
}

function StatTile({ label, value, tone, icon: Icon, hint }: StatTileProps) {
  const styles = toneStyles[tone];
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3" title={hint}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-md",
            styles.soft,
            styles.ink,
          )}
        >
          <Icon className="size-3" aria-hidden />
        </span>
        {label}
      </dt>
      <dd className="mt-1.5 text-2xl font-semibold leading-none tracking-tight text-ink">
        {value}
      </dd>
    </div>
  );
}

function Overview({ report, onOpen }: { report: FullReport; onOpen: (tab: TabId) => void }) {
  const summary = report.executive_summary;
  const fixNow = report.action_plan.fix_now;
  const firstTasks = fixNow.length ? fixNow : report.action_plan.improve_next;

  return (
    <div className="space-y-4">
      {summary?.ats_readiness && (
        <Card className="p-6">
          <CardHeader icon={ScanSearch} title="ATS readiness" />
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{summary.ats_readiness}</p>
          <OpenTab onClick={() => onOpen("ats")}>See the ATS analysis</OpenTab>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <CardHeader
            icon={CircleCheck}
            tone="good"
            title="Top strengths"
            description="What already works — keep these."
          />
          <div className="mt-4">
            <LabelledList
              icon={CircleCheck}
              iconClass="text-good-ink"
              items={summary?.top_strengths ?? []}
              empty="No strengths were summarized for this run. See the section reviews."
            />
          </div>
        </Card>
        <Card className="p-6">
          <CardHeader
            icon={CircleX}
            tone="crit"
            title="Fix these first"
            description="The problems holding the resume back the most."
          />
          <div className="mt-4">
            <LabelledList
              icon={CircleX}
              iconClass="text-crit-ink"
              items={summary?.top_problems ?? []}
              empty="No top problems were summarized for this run. See the action plan."
            />
          </div>
        </Card>
      </div>

      {firstTasks.length > 0 && (
        <Card className="p-6">
          <CardHeader
            icon={Flame}
            tone={fixNow.length ? "crit" : "serious"}
            title={fixNow.length ? "Start here: fix now" : "Start here: improve next"}
            description="The first tasks from your action plan."
          />
          <ol className="mt-4 space-y-3">
            {firstTasks.slice(0, 3).map((task, index) => (
              <li key={task.id} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-ink-2">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{task.task}</p>
                  {task.detail && (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{task.detail}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <OpenTab onClick={() => onOpen("plan")}>Open the full action plan</OpenTab>
        </Card>
      )}
    </div>
  );
}

function OpenTab({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-ink underline-offset-4 hover:underline"
    >
      {children}
      <ArrowRight className="size-3.5" aria-hidden />
    </button>
  );
}
