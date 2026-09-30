import { Check, Minus, Sparkles, TriangleAlert, type LucideIcon } from "lucide-react";
import { PanelIntro } from "@/components/report/shared";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { toneStyles, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { SkillItem, SkillsAudit } from "@/types/analysis";

export function SkillsAuditPanel({ skills }: { skills: SkillsAudit }) {
  const byJob = skills.basis === "job_description";

  return (
    <div>
      <PanelIntro title="Skills analysis">
        How well each skill on your resume is backed up by your experience, and what could be
        added.
      </PanelIntro>

      {/* Never imply job requirements that nobody supplied. */}
      <Alert tone={byJob ? "brand" : "neutral"} className="mb-3">
        {byJob ? (
          <>
            Compared against the <strong>job description you provided</strong>. Missing skills
            are ones that posting asks for.
          </>
        ) : (
          <>
            <strong>No job description was provided.</strong> Recommended skills are general
            suggestions for the field this resume appears to target
            {skills.field ? ` (${skills.field})` : ""} — they are not requirements of any
            particular job. Add a job description to compare against a real role.
          </>
        )}
      </Alert>

      <div className="grid gap-3 md:grid-cols-2">
        <SkillGroup
          title="Strong / present"
          description="On your resume and backed by your experience or projects."
          tone="good"
          icon={Check}
          skills={skills.strong}
          empty="No skill is clearly demonstrated yet. Show where you used each one."
        />
        <SkillGroup
          title="Weakly demonstrated"
          description="Listed, but with little evidence of where you used it."
          tone="warn"
          icon={TriangleAlert}
          skills={skills.weak}
          empty="Every listed skill is backed by evidence."
        />
        <SkillGroup
          title={byJob ? "Missing for this job" : "Recommended to add"}
          description={
            byJob
              ? "Asked for by the job description, not found on your resume."
              : "Suggestions for your field. Only add skills you really have."
          }
          tone="brand"
          icon={Sparkles}
          skills={skills.recommended}
          empty={byJob ? "Your resume covers the skills this job asks for." : "No suggestions."}
        />
        <SkillGroup
          title="Possibly irrelevant"
          description={
            byJob ? "Adds little for this job." : "Adds little for the field you are targeting."
          }
          tone="neutral"
          icon={Minus}
          skills={skills.irrelevant}
          empty="Nothing on your resume looks out of place."
        />
      </div>
    </div>
  );
}

interface SkillGroupProps {
  title: string;
  description: string;
  tone: Tone;
  icon: LucideIcon;
  skills: SkillItem[];
  empty: string;
}

function SkillGroup({ title, description, tone, icon: Icon, skills, empty }: SkillGroupProps) {
  const styles = toneStyles[tone];
  return (
    <Card className="p-5">
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
        <h4 className="text-[15px] font-semibold text-ink">{title}</h4>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-ink-2">
          {skills.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-3">{description}</p>

      {skills.length ? (
        <ul className="mt-3 divide-y divide-line">
          {skills.map((skill) => (
            <li key={skill.name} className="py-2.5 first:pt-0 last:pb-0">
              <p className="text-sm font-medium text-ink">{skill.name}</p>
              {skill.note && (
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{skill.note}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-ink-3">{empty}</p>
      )}
    </Card>
  );
}
