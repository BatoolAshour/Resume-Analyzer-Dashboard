import { CloudUpload, FileSearch, WandSparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";

const steps = [
  {
    icon: CloudUpload,
    title: "Upload your resume",
    text: "Drop in a PDF, DOCX or TXT file. The text is extracted on the server and never stored.",
  },
  {
    icon: FileSearch,
    title: "Pick an analysis",
    text: "Run a quick ATS check, match against a job description, or get a full audit that reviews every section and bullet.",
  },
  {
    icon: WandSparkles,
    title: "Act on the report",
    text: "Get scores, matched and missing skills, and recommendations ranked from critical to low so you know what to fix first.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-brand-ink">How it works</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          From upload to action plan in three steps
        </h2>
      </div>

      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <li key={title}>
            <Card className="h-full p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-mono text-sm text-ink-3">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{text}</p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
