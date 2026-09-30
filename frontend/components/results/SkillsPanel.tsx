import { Check, Layers, Sparkles, X, type LucideIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { toneStyles, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

interface SkillGroupProps {
  title: string;
  description: string;
  skills: string[];
  tone: Tone;
  icon: LucideIcon;
  empty: string;
}

function SkillGroup({ title, description, skills, tone, icon: Icon, empty }: SkillGroupProps) {
  const styles = toneStyles[tone];
  return (
    <div className="flex flex-col rounded-xl border border-line p-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full",
            styles.soft,
            styles.ink,
          )}
        >
          <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
        </span>
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-ink-2">
          {skills.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-3">{description}</p>

      {skills.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <li
              key={skill}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[13px] font-medium text-ink",
                styles.soft,
                styles.border,
              )}
            >
              <Icon className={cn("size-3", styles.ink)} strokeWidth={2.5} aria-hidden />
              {skill}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-ink-3">{empty}</p>
      )}
    </div>
  );
}

interface SkillsComparisonProps {
  matched: string[];
  missing: string[];
  recommended: string[];
  style?: React.CSSProperties;
}

/** Job Match: matched vs. missing vs. recommended skills. */
export function SkillsComparison({ matched, missing, recommended, style }: SkillsComparisonProps) {
  const total = matched.length + missing.length;
  const share = total ? (matched.length / total) * 100 : 0;

  return (
    <Card className="animate-fade-up p-6" style={style}>
      <CardHeader
        icon={Layers}
        title="Skills"
        description="What the job asks for, against what your resume shows."
      />

      {total === 0 ? (
        <EmptyState icon={Layers} title="No specific skills found" className="mt-5">
          The job description doesn&apos;t list concrete skills or tools to compare against.
        </EmptyState>
      ) : (
        <>
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-sm">
              <p className="font-medium text-ink">
                {matched.length} of {total} skills from the job found on your resume
              </p>
              <p className="text-ink-3">{missing.length} missing</p>
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${matched.length} of ${total} skills from the job matched`}
            >
              <div
                className="h-full origin-left animate-grow-x rounded-full bg-good"
                style={{ width: `${share}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <SkillGroup
              title="Matched"
              description="Asked for by the job and shown on your resume."
              skills={matched}
              tone="good"
              icon={Check}
              empty="None of the job's skills were found on your resume."
            />
            <SkillGroup
              title="Missing"
              description="Asked for by the job but not found on your resume."
              skills={missing}
              tone="crit"
              icon={X}
              empty="Nothing missing — your resume covers every listed skill."
            />
            <SkillGroup
              title="Recommended to learn"
              description="Gaps worth closing, in the suggested order."
              skills={recommended}
              tone="brand"
              icon={Sparkles}
              empty="No skills to learn for this role."
            />
          </div>
        </>
      )}
    </Card>
  );
}

interface DetectedSkillsProps {
  skills: string[];
  sections: string[];
  style?: React.CSSProperties;
}

/** ATS Check: what a parser can pick up from the resume on its own. */
export function DetectedSkills({ skills, sections, style }: DetectedSkillsProps) {
  return (
    <Card className="animate-fade-up p-6" style={style}>
      <CardHeader
        icon={Layers}
        title="What an ATS picks up"
        description="Skills and sections that were detected in your resume."
      />
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <SkillGroup
          title="Detected skills"
          description="Skills and tools that can be read from the document."
          skills={skills}
          tone="good"
          icon={Check}
          empty="No skills could be detected. Add a clearly labelled Skills section."
        />
        <SkillGroup
          title="Detected sections"
          description="Standard resume sections that were recognized."
          skills={sections}
          tone="brand"
          icon={Check}
          empty="No standard sections were recognized. Use clear section headings."
        />
      </div>
    </Card>
  );
}
