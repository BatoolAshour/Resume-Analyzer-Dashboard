"use client";

import { ArrowRight, ChevronDown, CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { LabelledList, NothingToFix, PanelIntro } from "@/components/report/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ratingStyles } from "@/lib/reportLabels";
import { cn } from "@/lib/utils";
import type { SectionReview } from "@/types/analysis";

export function SectionReviewsPanel({ reviews }: { reviews: SectionReview[] }) {
  // Start with the first section open so the layout is obvious.
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set([0]));
  const allOpen = open.size === reviews.length;

  function toggle(index: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelIntro title="Section-by-section review">
          Each section that exists in your resume, reviewed on its own. Sections you
          don&apos;t have are listed under Missing content.
        </PanelIntro>
        {reviews.length > 1 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOpen(allOpen ? new Set() : new Set(reviews.map((_, i) => i)))}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        )}
      </div>

      {reviews.length === 0 ? (
        <NothingToFix title="No standard sections were recognized">
          Add clear headings such as Experience, Education and Skills so each part can be
          reviewed.
        </NothingToFix>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review, index) => {
            const rating = ratingStyles[review.rating];
            const expanded = open.has(index);
            const panelId = `section-review-${index}`;
            return (
              <li key={review.section}>
                <Card className="overflow-hidden">
                  <h4>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => toggle(index)}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="text-[15px] font-semibold text-ink">{review.section}</span>
                      <Badge tone={rating.tone} icon={rating.icon}>
                        {rating.label}
                      </Badge>
                      <span className="ml-auto hidden text-xs text-ink-3 sm:block">
                        {review.good.length} good · {review.weak.length} weak ·{" "}
                        {review.missing.length} missing
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-ink-3 transition-transform duration-200 max-sm:ml-auto",
                          expanded && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </button>
                  </h4>
                  {expanded && (
                    <div
                      id={panelId}
                      className="grid animate-fade-in gap-5 border-t border-line px-5 py-5 md:grid-cols-2"
                    >
                      <LabelledList
                        icon={CircleCheck}
                        iconClass="text-good-ink"
                        title="What is good"
                        items={review.good}
                        empty="Nothing stood out."
                      />
                      <LabelledList
                        icon={TriangleAlert}
                        iconClass="text-warn-ink"
                        title="What is weak"
                        items={review.weak}
                        empty="Nothing weak was found."
                      />
                      <LabelledList
                        icon={CircleX}
                        iconClass="text-crit-ink"
                        title="What is missing"
                        items={review.missing}
                        empty="Nothing is missing from this section."
                      />
                      <LabelledList
                        icon={ArrowRight}
                        iconClass="text-brand-ink"
                        title="Specific improvements"
                        items={review.improvements}
                        empty="No changes suggested."
                      />
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
