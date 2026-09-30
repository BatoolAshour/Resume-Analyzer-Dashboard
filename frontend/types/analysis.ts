// Mirrors the Pydantic schemas in backend/app/schemas/analysis.py.

export type AnalysisMode = "ats" | "match" | "report";

export type Priority = "critical" | "high" | "medium" | "low";

export type RecommendationCategory =
  | "skills"
  | "keywords"
  | "experience"
  | "education"
  | "formatting"
  | "content";

export interface Recommendation {
  priority: Priority;
  category: RecommendationCategory;
  title: string;
  action: string;
  reason: string;
}

export interface LearningStep {
  skill: string;
  reason: string;
}

export type ExperienceVerdict = "meets" | "above" | "below" | "unclear";

export interface ExperienceFit {
  years_found: number | null;
  years_required: number | null;
  verdict: ExperienceVerdict;
}

export interface EducationFit {
  found: string | null;
  required: string | null;
  match: boolean | null;
}

export interface ResumeQuality {
  strengths: string[];
  detected_sections: string[];
  missing_sections: string[];
  formatting_issues: string[];
}

export interface AnalysisMeta {
  filename: string;
  word_count: number;
  truncated: boolean;
  models: string[];
  duration_ms: number;
  analyzed_at: string;
}

interface AnalysisBase {
  summary: string;
  recommendations: Recommendation[];
  warnings: string[];
  meta: AnalysisMeta;
}

export interface AtsAnalysis extends AnalysisBase, ResumeQuality {
  mode: "ats";
  ats_score: number;
  detected_skills: string[];
}

export interface MatchAnalysis extends AnalysisBase {
  mode: "match";
  match_percent: number;
  ats_score: number;
  keyword_coverage_percent: number;
  skills_match_percent: number | null;
  matched_skills: string[];
  missing_skills: string[];
  recommended_skills: string[];
  experience: ExperienceFit;
  education: EducationFit;
  learning_path: LearningStep[];
  resume_quality: ResumeQuality | null;
}

// ---------- Full Resume Audit Report (backend/app/schemas/report.py) ----------

/** missing = expected but absent; weak = present but poor; recommended = optional. */
export type GapStatus = "missing" | "weak" | "recommended";

export interface ContentGap {
  item: string;
  status: GapStatus;
  priority: Priority;
  what: string;
  why: string;
  fix: string;
}

export type SectionRating = "strong" | "adequate" | "weak";

export interface SectionReview {
  section: string;
  rating: SectionRating;
  good: string[];
  weak: string[];
  missing: string[];
  improvements: string[];
}

export type BulletIssue =
  | "vague"
  | "repetitive"
  | "no_action_verb"
  | "no_metric"
  | "responsibility"
  | "too_long";

export interface BulletReview {
  source: string;
  current: string;
  issues: BulletIssue[];
  problem: string;
  suggested: string;
  priority: Priority;
  /** The suggestion contains [placeholders] the user must fill in. */
  needs_real_numbers: boolean;
}

export interface BulletAnalysis {
  summary: string;
  items: BulletReview[];
}

export type WritingType =
  | "grammar"
  | "weak_wording"
  | "repetition"
  | "unprofessional"
  | "buzzwords"
  | "long_sentence"
  | "tense"
  | "other";

export interface WritingIssue {
  type: WritingType;
  original: string;
  problem: string;
  suggestion: string;
  priority: Priority;
}

export type AtsAreaName =
  | "readability"
  | "section_naming"
  | "formatting"
  | "keywords"
  | "skills_visibility"
  | "contact_info"
  | "parsing"
  | "other";

export type AtsStatus = "pass" | "warning" | "fail";

export interface AtsArea {
  area: AtsAreaName;
  status: AtsStatus;
  finding: string;
  fix: string;
  priority: Priority;
}

export interface AtsAudit {
  score: number | null;
  summary: string;
  areas: AtsArea[];
}

export interface SkillItem {
  name: string;
  note: string;
}

export interface SkillsAudit {
  field: string | null;
  /** What "recommended" and "irrelevant" were judged against. */
  basis: "job_description" | "resume_field";
  strong: SkillItem[];
  weak: SkillItem[];
  recommended: SkillItem[];
  irrelevant: SkillItem[];
}

export interface ExecutiveSummary {
  overall_quality: string;
  ats_readiness: string;
  top_strengths: string[];
  top_problems: string[];
}

export interface ActionItem {
  id: string;
  task: string;
  detail: string;
}

export interface ActionPlan {
  fix_now: ActionItem[];
  improve_next: ActionItem[];
  optional: ActionItem[];
}

export interface ReportStats {
  critical: number;
  warnings: number;
  improvements: number;
}

/** A part that could not be generated is null and explained in `warnings`. */
export interface FullReport {
  mode: "report";
  has_job_description: boolean;
  overall_score: number | null;
  executive_summary: ExecutiveSummary | null;
  stats: ReportStats;
  missing_content: ContentGap[] | null;
  /** Expected items that were checked and found in the resume. */
  content_present: string[];
  section_reviews: SectionReview[] | null;
  bullets: BulletAnalysis | null;
  writing: WritingIssue[] | null;
  ats: AtsAudit | null;
  skills: SkillsAudit | null;
  action_plan: ActionPlan;
  warnings: string[];
  meta: AnalysisMeta;
}

export type AnalysisResult = AtsAnalysis | MatchAnalysis | FullReport;

export interface HealthResponse {
  status: "ok";
  version: string;
  llm_configured: boolean;
  model: string;
  limits: {
    max_upload_mb: number;
    allowed_extensions: string[];
  };
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
