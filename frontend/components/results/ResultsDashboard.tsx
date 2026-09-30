import {
  Briefcase,
  ChevronsUp,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock,
  FileText,
  GraduationCap,
  KeyRound,
  Layers,
  RefreshCw,
  Target,
} from "lucide-react";
import { LearningPath } from "@/components/results/LearningPath";
import { FitMetric, PercentMetric } from "@/components/results/MetricCard";
import { QualityPanels } from "@/components/results/QualityPanels";
import { RecommendationsPanel } from "@/components/results/RecommendationsPanel";
import { ScoreRing } from "@/components/results/ScoreRing";
import { DetectedSkills, SkillsComparison } from "@/components/results/SkillsPanel";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDuration, formatYears } from "@/lib/utils";
import type {
  AtsAnalysis,
  EducationFit,
  ExperienceFit,
  MatchAnalysis,
} from "@/types/analysis";

interface ResultsDashboardProps {
  result: AtsAnalysis | MatchAnalysis;
  onReset: () => void;
}

export function ResultsDashboard({ result, onReset }: ResultsDashboardProps) {
  const notices = [
    ...result.warnings,
    ...(result.meta.truncated
      ? ["Your resume is very long, so only the first part of it was analyzed."]
      : []),
  ];

  return (
    <div className="space-y-4">
      {notices.map((notice) => (
        <Alert key={notice} tone="warn" className="animate-fade-in">
          {notice}
        </Alert>
      ))}

      <Overview result={result} onReset={onReset} />

      {result.mode === "match" ? <MatchSections result={result} /> : <AtsSections result={result} />}

      <p className="pt-2 text-center text-xs text-ink-3">
        Scores and recommendations are AI-generated estimates ({result.meta.models.join(", ")}) —
        use them as guidance, not as a guarantee of how any one employer&apos;s system will behave.
      </p>
    </div>
  );
}

function Overview({ result, onReset }: ResultsDashboardProps) {
  const isMatch = result.mode === "match";
  return (
    <Card className="animate-fade-up p-6 sm:p-8">
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
        <ScoreRing
          score={result.ats_score}
          label="ATS score"
          tooltip={
            isMatch
              ? "How this resume is likely to score in an ATS for this job: overall fit 40%, experience 30%, education 30%."
              : "How easily an applicant tracking system can read this resume, based on its structure, sections and formatting."
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{isMatch ? "Job Match report" : "ATS Check report"}</Badge>
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-ink-3">
              <FileText className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{result.meta.filename}</span>
              <span aria-hidden>·</span>
              <span className="shrink-0">{result.meta.word_count.toLocaleString()} words</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-ink-3">
              <Clock className="size-3.5" aria-hidden />
              Analyzed in {formatDuration(result.meta.duration_ms)}
            </span>
          </div>

          <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">Summary</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            {result.summary || "The analysis did not include a written summary."}
          </p>

          {result.mode === "ats" && <AtsCounts result={result} />}

          <Button variant="secondary" size="sm" className="mt-5" onClick={onReset}>
            <RefreshCw className="size-3.5" aria-hidden />
            New analysis
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AtsCounts({ result }: { result: AtsAnalysis }) {
  const sections = result.detected_sections.length + result.missing_sections.length;
  const counts = [
    {
      label: "Sections found",
      value: sections ? `${result.detected_sections.length} of ${sections}` : "—",
    },
    { label: "Skills detected", value: String(result.detected_skills.length) },
    { label: "Formatting issues", value: String(result.formatting_issues.length) },
    { label: "Recommendations", value: String(result.recommendations.length) },
  ];
  return (
    <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
      {counts.map((count) => (
        <div key={count.label} className="bg-surface px-4 py-3">
          <dt className="text-xs text-ink-3">{count.label}</dt>
          <dd className="mt-0.5 text-lg font-semibold text-ink">{count.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AtsSections({ result }: { result: AtsAnalysis }) {
  return (
    <>
      <QualityPanels quality={result} delay={80} />
      <DetectedSkills
        skills={result.detected_skills}
        sections={result.detected_sections}
        style={{ animationDelay: "260ms" }}
      />
      <RecommendationsPanel
        recommendations={result.recommendations}
        style={{ animationDelay: "320ms" }}
      />
      <Alert tone="brand" className="animate-fade-up" title="Applying for a specific role?">
        Switch to Job Match and paste the job description to see your match score, missing
        skills and a learning path.
      </Alert>
    </>
  );
}

function experienceVerdict(experience: ExperienceFit) {
  switch (experience.verdict) {
    case "meets":
      return { tone: "good" as const, label: "Meets requirement", icon: CircleCheck };
    case "above":
      return { tone: "good" as const, label: "Exceeds requirement", icon: ChevronsUp };
    case "below":
      return { tone: "crit" as const, label: "Below requirement", icon: CircleX };
    default:
      return { tone: "neutral" as const, label: "Unclear", icon: CircleHelp };
  }
}

function educationVerdict(education: EducationFit) {
  if (education.match === true) {
    return { tone: "good" as const, label: "Meets requirement", icon: CircleCheck };
  }
  if (education.match === false) {
    return { tone: "crit" as const, label: "Does not meet", icon: CircleX };
  }
  return { tone: "neutral" as const, label: "No stated requirement", icon: CircleHelp };
}

function MatchSections({ result }: { result: MatchAnalysis }) {
  const skillTotal = result.matched_skills.length + result.missing_skills.length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="contents lg:[&>*]:col-span-2">
          <PercentMetric
            icon={Target}
            label="Job match"
            tooltip="Overall fit between your resume and the job description, combining skills and meaning."
            value={result.match_percent}
            caption="How closely your profile fits this role overall."
            style={{ animationDelay: "60ms" }}
          />
          <PercentMetric
            icon={Layers}
            label="Skills match"
            tooltip="Share of the job's listed skills found on your resume: matched ÷ (matched + missing)."
            value={result.skills_match_percent}
            caption={
              skillTotal
                ? `${result.matched_skills.length} of ${skillTotal} listed skills found.`
                : "The job description lists no specific skills."
            }
            style={{ animationDelay: "120ms" }}
          />
          <PercentMetric
            icon={KeyRound}
            label="Keyword coverage"
            tooltip="Rough share of the job description's keywords and phrases that appear anywhere in your resume."
            value={result.keyword_coverage_percent}
            caption="Job-posting terms that appear in your resume."
            style={{ animationDelay: "180ms" }}
          />
        </div>
        <div className="contents lg:[&>*]:col-span-3">
          <FitMetric
            icon={Briefcase}
            label="Experience fit"
            tooltip="Years of relevant experience found on your resume, compared with what the job asks for."
            verdict={experienceVerdict(result.experience)}
            rows={[
              { label: "On your resume", value: formatYears(result.experience.years_found) },
              { label: "Job requires", value: formatYears(result.experience.years_required) },
            ]}
            style={{ animationDelay: "240ms" }}
          />
          <FitMetric
            icon={GraduationCap}
            label="Education fit"
            tooltip="The highest degree found on your resume, compared with the degree the job asks for."
            verdict={educationVerdict(result.education)}
            rows={[
              { label: "On your resume", value: result.education.found ?? "Not found" },
              { label: "Job requires", value: result.education.required ?? "Not stated" },
            ]}
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>

      <SkillsComparison
        matched={result.matched_skills}
        missing={result.missing_skills}
        recommended={result.recommended_skills}
        style={{ animationDelay: "360ms" }}
      />

      {result.resume_quality && <QualityPanels quality={result.resume_quality} delay={420} />}

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecommendationsPanel
            recommendations={result.recommendations}
            style={{ animationDelay: "480ms" }}
          />
        </div>
        <div className="lg:sticky lg:top-20 lg:col-span-2">
          <LearningPath steps={result.learning_path} style={{ animationDelay: "540ms" }} />
        </div>
      </div>
    </>
  );
}
