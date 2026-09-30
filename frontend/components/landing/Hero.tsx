import { ArrowRight, Gauge, ListChecks, Target } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

const highlights = [
  { icon: Gauge, text: "ATS readiness score" },
  { icon: Target, text: "Job match and skill gaps" },
  { icon: ListChecks, text: "Prioritized fixes" },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div
        className="absolute left-1/2 top-[-12rem] size-[36rem] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2 shadow-card">
          <span className="size-1.5 rounded-full bg-brand" aria-hidden />
          Resume feedback in under a minute
        </p>

        <h1
          className="mt-6 animate-fade-up text-4xl font-semibold tracking-tight text-ink sm:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          AI Resume Analyzer
        </h1>

        <p
          className="mx-auto mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-ink-2 sm:text-lg"
          style={{ animationDelay: "120ms" }}
        >
          See how applicant tracking systems read your resume, or compare it
          against a job description to find the gaps — and what to fix first.
        </p>

        <div
          className="mt-8 flex animate-fade-up flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "180ms" }}
        >
          <a href="#analyzer" className={buttonClasses("primary", "lg")}>
            Analyze my resume
            <ArrowRight className="size-4" aria-hidden />
          </a>
          <a href="#how-it-works" className={buttonClasses("secondary", "lg")}>
            How it works
          </a>
        </div>

        <ul
          className="mt-10 flex animate-fade-up flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-2"
          style={{ animationDelay: "240ms" }}
        >
          {highlights.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <Icon className="size-4 text-brand" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
