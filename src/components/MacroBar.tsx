import { cn } from "@/lib/cn";
import type { MacroTotals } from "@/lib/nutrition-form";

const ITEMS: { key: keyof MacroTotals; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

// Daily totals strip, with optional target underneath each figure. Pure markup,
// so it renders in the client builder (live totals) and server views alike.
export function MacroBar({
  totals,
  targets,
  className,
}: {
  totals: MacroTotals;
  targets?: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-4", className)}>
      {ITEMS.map((it) => {
        const value = totals[it.key];
        const target = targets?.[it.key] ?? null;
        return (
          <div
            key={it.key}
            className="rounded-[var(--radius-sm)] border border-line bg-card px-3.5 py-2.5"
          >
            <p className="eyebrow text-ink-soft/70">{it.label}</p>
            {/* The target goes on its own line rather than trailing the value.
                Inline, a four-digit figure against a four-digit target wraps
                wherever the column happens to end — "1475 /" above "2000 kcal",
                with the unit orphaned — and these cells sit in a two-column
                layout now, so narrow is the normal case rather than the edge. */}
            <p className="metric mt-1 text-lg font-semibold leading-none text-ink">
              {value}
              <span className="ml-1 text-xs font-normal text-ink-soft">
                {it.unit}
              </span>
            </p>
            {/* Bare number, no unit: the line above already carries it, and
                "/ 2000 kcal" is one token too wide for a quarter-column cell. */}
            {target != null ? (
              <p className="metric mt-1.5 whitespace-nowrap text-xs leading-none text-ink-soft">
                / {target}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
