import {
  atsAreaLabels,
  atsStatusStyles,
  bulletIssueLabels,
  gapStatusStyles,
  ratingStyles,
  writingTypeLabels,
} from "@/lib/reportLabels";
import { priorityStyles } from "@/lib/tones";
import type { ActionItem, FullReport, SkillItem } from "@/types/analysis";

const UNAVAILABLE = "_This part of the report could not be generated._";

function list(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function labelled(label: string, items: string[]): string[] {
  return items.length ? [`**${label}**`, list(items)] : [];
}

function skills(title: string, items: SkillItem[]): string[] {
  if (!items.length) return [];
  return [
    `**${title}**`,
    list(items.map((skill) => (skill.note ? `${skill.name} — ${skill.note}` : skill.name))),
  ];
}

function checklist(title: string, items: ActionItem[], done: ReadonlySet<string>): string[] {
  if (!items.length) return [];
  return [
    `### ${title}`,
    items
      .map((item) => {
        const box = done.has(item.id) ? "[x]" : "[ ]";
        return `- ${box} **${item.task}**${item.detail ? ` — ${item.detail}` : ""}`;
      })
      .join("\n"),
  ];
}

/** The whole report as a Markdown document, including which tasks are ticked off. */
export function reportToMarkdown(report: FullReport, done: ReadonlySet<string>): string {
  const { executive_summary: summary, stats, meta } = report;
  const blocks: string[] = [
    "# Resume Audit Report",
    [
      `**File:** ${meta.filename}`,
      `**Date:** ${new Date(meta.analyzed_at).toLocaleDateString()}`,
      `**Reviewed against:** ${report.has_job_description ? "the job description provided" : "the resume alone (no job description)"}`,
    ].join("  \n"),
  ];

  // 1. Executive summary
  blocks.push("## 1. Executive Summary");
  blocks.push(
    [
      `- **Overall score:** ${report.overall_score ?? "n/a"}${report.overall_score === null ? "" : " / 100"}`,
      `- **ATS score:** ${report.ats?.score ?? "n/a"}${report.ats?.score == null ? "" : " / 100"}`,
      `- **Critical issues:** ${stats.critical} · **Warnings:** ${stats.warnings} · **Improvements:** ${stats.improvements}`,
    ].join("\n"),
  );
  if (summary) {
    if (summary.overall_quality) blocks.push(`**Overall quality.** ${summary.overall_quality}`);
    if (summary.ats_readiness) blocks.push(`**ATS readiness.** ${summary.ats_readiness}`);
    blocks.push(...labelled("Top strengths", summary.top_strengths));
    blocks.push(...labelled("Fix these first", summary.top_problems));
  } else {
    blocks.push(UNAVAILABLE);
  }

  // 2. Missing content
  blocks.push("## 2. Missing Content");
  if (report.content_present.length) {
    blocks.push(`**Already in your resume:** ${report.content_present.join(", ")}`);
  }
  if (report.missing_content === null) {
    blocks.push(UNAVAILABLE);
  } else if (report.missing_content.length === 0) {
    blocks.push("Nothing important is missing.");
  } else {
    for (const gap of report.missing_content) {
      blocks.push(
        `### ${gap.item} — ${gapStatusStyles[gap.status].label}, ${priorityStyles[gap.priority].label} priority`,
        [
          gap.what && `- **What is missing:** ${gap.what}`,
          gap.why && `- **Why it matters:** ${gap.why}`,
          gap.fix && `- **How to fix it:** ${gap.fix}`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }

  // 3. Section-by-section review
  blocks.push("## 3. Section-by-Section Review");
  if (report.section_reviews === null) {
    blocks.push(UNAVAILABLE);
  } else {
    for (const review of report.section_reviews) {
      blocks.push(
        `### ${review.section} — ${ratingStyles[review.rating].label}`,
        ...labelled("What is good", review.good),
        ...labelled("What is weak", review.weak),
        ...labelled("What is missing", review.missing),
        ...labelled("Specific improvements", review.improvements),
      );
    }
  }

  // 4. Bullets
  blocks.push("## 4. Experience & Bullet Analysis");
  if (report.bullets === null) {
    blocks.push(UNAVAILABLE);
  } else {
    if (report.bullets.summary) blocks.push(report.bullets.summary);
    if (report.bullets.items.length === 0) blocks.push("No bullets need rewriting.");
    for (const bullet of report.bullets.items) {
      const issues = bullet.issues.map((issue) => bulletIssueLabels[issue]).join(", ");
      blocks.push(
        [
          `- **Current:** ${bullet.current}`,
          `  - **Problem:** ${bullet.problem}${issues ? ` (${issues})` : ""}`,
          `  - **Suggested:** ${bullet.suggested}`,
          bullet.needs_real_numbers &&
            "  - _Replace the [bracketed] placeholders with your real details._",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }

  // 5. ATS
  blocks.push("## 5. ATS Analysis");
  if (report.ats === null) {
    blocks.push(UNAVAILABLE);
  } else {
    if (report.ats.summary) blocks.push(report.ats.summary);
    blocks.push(
      report.ats.areas
        .map((area) => {
          const head = `- **${atsAreaLabels[area.area]}** — ${atsStatusStyles[area.status].label}: ${area.finding}`;
          return area.fix ? `${head}\n  - **Fix:** ${area.fix}` : head;
        })
        .join("\n"),
    );
  }

  // 6. Skills
  blocks.push("## 6. Skills Analysis");
  if (report.skills === null) {
    blocks.push(UNAVAILABLE);
  } else {
    const byJob = report.skills.basis === "job_description";
    blocks.push(
      byJob
        ? "_Compared against the job description provided._"
        : `_No job description was provided. Recommended skills are suggestions based on the resume's apparent field${report.skills.field ? ` (${report.skills.field})` : ""}, not requirements._`,
      ...skills("Strong / present", report.skills.strong),
      ...skills("Weakly demonstrated", report.skills.weak),
      ...skills(byJob ? "Missing for this job" : "Recommended to add", report.skills.recommended),
      ...skills("Possibly irrelevant", report.skills.irrelevant),
    );
  }

  // 7. Writing
  blocks.push("## 7. Language & Writing Quality");
  if (report.writing === null) {
    blocks.push(UNAVAILABLE);
  } else if (report.writing.length === 0) {
    blocks.push("No language problems were found.");
  } else {
    for (const issue of report.writing) {
      blocks.push(
        [
          `- **${writingTypeLabels[issue.type]}:** "${issue.original}"`,
          issue.problem && `  - **Problem:** ${issue.problem}`,
          issue.suggestion && `  - **Suggested:** ${issue.suggestion}`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }

  // 8. Action plan
  blocks.push("## 8. Action Plan");
  blocks.push(
    ...checklist("Fix Now", report.action_plan.fix_now, done),
    ...checklist("Improve Next", report.action_plan.improve_next, done),
    ...checklist("Optional Improvements", report.action_plan.optional, done),
  );

  blocks.push(
    "---",
    `_Generated by AI Resume Analyzer (${meta.models.join(", ")}). Scores and suggestions are AI estimates: check every suggestion against your real experience before using it._`,
  );
  return blocks.join("\n\n") + "\n";
}

/** Save text as a file from the browser. */
export function downloadText(filename: string, text: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
