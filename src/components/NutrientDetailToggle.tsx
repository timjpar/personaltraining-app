"use client";

import { useId, useOptimistic, useTransition } from "react";
import { cn } from "@/lib/cn";
import { saveNutrientDetail } from "@/app/nutrient-detail-actions";
import {
  NUTRIENT_DETAIL,
  NUTRIENT_DETAIL_LABELS,
  type NutrientDetail,
} from "@/lib/constants";

const ORDER: NutrientDetail[] = [
  NUTRIENT_DETAIL.OFF,
  NUTRIENT_DETAIL.KEY,
  NUTRIENT_DETAIL.ALL,
];

// How much micronutrient detail *this viewer* reads — the same kind of switch
// as UnitsToggle, and drawn the same way. It changes nothing stored: rows keep
// their micronutrients whichever cell is lit.
//
// Optimistic, unlike UnitsToggle, because this one sits beside the numbers it
// reveals: a panel that takes a server round-trip to appear under the click
// reads as a toggle that didn't work.
export function NutrientDetailToggle({ value }: { value: NutrientDetail }) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(value);
  // A day page draws two of these — one over the log, one over the plan.
  const labelId = useId();

  return (
    <div className="flex items-center gap-2">
      <span className="eyebrow text-ink-soft/70" id={labelId}>
        Micronutrients
      </span>
      <div
        className="inline-flex rounded-[var(--radius-sm)] border border-line bg-card p-0.5"
        role="group"
        aria-labelledby={labelId}
        aria-busy={pending}
      >
        {ORDER.map((d) => {
          const active = d === shown;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (active) return;
                startTransition(async () => {
                  setShown(d);
                  await saveNutrientDetail(d);
                });
              }}
              className={cn(
                "eyebrow min-h-9 rounded-[calc(var(--radius-sm)-2px)] px-2.5 transition-colors",
                active
                  ? "bg-jade-wash text-jade-strong"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {NUTRIENT_DETAIL_LABELS[d]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
