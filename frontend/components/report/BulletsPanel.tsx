"use client";

import { Check, Copy, Info } from "lucide-react";
import { useState } from "react";
import { BeforeAfter, NothingToFix, PanelIntro } from "@/components/report/shared";
import { Card } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { bulletIssueLabels } from "@/lib/reportLabels";
import type { BulletAnalysis, BulletReview } from "@/types/analysis";

export function BulletsPanel({ bullets }: { bullets: BulletAnalysis }) {
  return (
    <div>
      <PanelIntro title="Experience & bullet analysis">
        {bullets.summary ||
          "Bullets from your experience and projects that would be stronger rewritten."}
      </PanelIntro>

      {bullets.items.length === 0 ? (
        <NothingToFix title="No bullets need rewriting">
          Your experience and project bullets are specific and achievement-focused.
        </NothingToFix>
      ) : (
        <ul className="space-y-3">
          {bullets.items.map((bullet) => (
            <li key={bullet.current}>
              <BulletCard bullet={bullet} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BulletCard({ bullet }: { bullet: BulletReview }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={bullet.priority} />
        {bullet.issues.map((issue) => (
          <span
            key={issue}
            className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-ink-2"
          >
            {bulletIssueLabels[issue]}
          </span>
        ))}
        {bullet.source && (
          <span className="ml-auto truncate text-xs text-ink-3" title={bullet.source}>
            {bullet.source}
          </span>
        )}
      </div>

      {bullet.problem && (
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">Problem: </span>
          {bullet.problem}
        </p>
      )}

      <div className="mt-3">
        <BeforeAfter
          before={bullet.current}
          after={bullet.suggested}
          action={bullet.suggested && <CopyButton text={bullet.suggested} />}
        />
      </div>

      {bullet.needs_real_numbers && (
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-ink-2">
          <Info className="mt-0.5 size-4 shrink-0 text-warn-ink" aria-hidden />
          Replace each highlighted placeholder with your real details. If you don&apos;t have a
          number, leave that part out rather than guessing.
        </p>
      )}
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked; the text is still selectable by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-good-ink transition-colors hover:bg-good-soft"
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
