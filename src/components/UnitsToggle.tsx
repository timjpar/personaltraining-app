"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { saveUnits } from "@/app/units-actions";
import { UNIT_SHORT_LABELS, UNITS, type Units } from "@/lib/constants";

// Imperial leads because it is the default (see User.units in schema.prisma),
// and a two-cell toggle whose selected cell is the second one reads as though
// someone already changed something.
const ORDER: Units[] = [UNITS.IMPERIAL, UNITS.METRIC];

// Which units *this viewer* reads. It changes nothing about the stored data —
// bodies are canonical metric — so it is safe to flip mid-form: the hidden
// `units` field every body form carries tells the parser how to read what was
// typed in whichever unit was on screen at submit.
export function UnitsToggle({ value }: { value: Units }) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className="inline-flex rounded-[var(--radius-sm)] border border-line bg-card p-0.5"
      role="group"
      aria-label="Units"
    >
      {ORDER.map((u) => {
        const active = u === value;
        return (
          <button
            key={u}
            type="button"
            disabled={pending}
            aria-pressed={active}
            onClick={() => {
              if (active) return;
              startTransition(() => {
                void saveUnits(u);
              });
            }}
            className={cn(
              "eyebrow min-h-9 rounded-[calc(var(--radius-sm)-2px)] px-3 transition-colors disabled:opacity-60",
              active
                ? "bg-jade-wash text-jade-strong"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {UNIT_SHORT_LABELS[u]}
          </button>
        );
      })}
    </div>
  );
}
