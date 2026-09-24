"use client";

// The two controls every editable food row carries, in the builder and the
// day log alike: how much (an amount and its unit), and — once someone has
// asked to see them — the micronutrients.
import { Input } from "@/components/ui";
import { defsForDetail } from "@/components/NutrientPanel";
import { cn } from "@/lib/cn";
import type { AmountUnit } from "@/lib/food-amounts";
import { presetUnits } from "@/lib/food-presets";
import type { FoodRowFields } from "@/lib/food-rows";
import type { NutrientDetail } from "@/lib/constants";
import type { NutrientKey } from "@/lib/nutrients";

const UNIT_LABELS: Record<AmountUnit, string> = {
  serving: "serving",
  g: "g",
  oz: "oz",
  cup: "cup",
  tbsp: "tbsp",
  tsp: "tsp",
  ml: "ml",
};

// An amount and what it's measured in. A food picked from the list can be
// re-asked for in anything its serving converts to — "1 serving" of blueberries
// becomes "148 g" at the flip of the menu, and the numbers follow what's typed.
// A food typed by hand has no serving to scale from, so both stay inert, the
// way the servings box always did.
export function AmountControls({
  row,
  label,
  onAmount,
  onUnit,
  inputClassName,
}: {
  row: FoodRowFields;
  label: string;
  onAmount: (raw: string) => void;
  onUnit: (unit: AmountUnit) => void;
  inputClassName?: string;
}) {
  const units = row.base ? presetUnits(row.base) : (["serving"] as AmountUnit[]);
  const inert = row.base == null;
  const hint = inert ? "Pick a food from the list to scale it" : undefined;

  return (
    // Widths live on the wrappers: `inputBase` sets w-full and cn() is a plain
    // join, so a width class on the Input itself loses to it.
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="w-[4.75rem]">
        <Input
          type="number"
          min={0}
          // "any", not a step: 148.3 g is a real amount, and a step would make
          // the browser refuse to submit the form over it.
          step="any"
          inputMode="decimal"
          value={row.amount}
          disabled={inert}
          onChange={(e) => onAmount(e.target.value)}
          placeholder="1"
          aria-label={`${label} amount`}
          title={hint}
          className={cn("metric px-2 py-1.5 text-sm disabled:opacity-50", inputClassName)}
        />
      </div>
      <div className="relative w-[5.5rem]">
        <select
          value={row.unit}
          disabled={inert || units.length < 2}
          onChange={(e) => onUnit(e.target.value as AmountUnit)}
          aria-label={`${label} unit`}
          title={hint}
          className={cn(
            "min-h-12 w-full cursor-pointer appearance-none rounded-[var(--radius-sm)] border border-line py-1.5 pl-2.5 pr-6 text-sm text-ink focus-visible:border-jade focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-2",
            inputClassName,
          )}
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABELS[u]}
            </option>
          ))}
        </select>
        <svg
          width="8"
          height="5"
          viewBox="0 0 8 5"
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft"
        >
          <path d="M.75.75 4 4 7.25.75" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// A row's micronutrients as editable boxes, folded away until opened. Filled
// in already for anything picked from the list or scanned; typed in by hand
// for anything else. Not drawn at all while the viewer has micronutrients
// off — the values still travel with the row either way.
export function NutrientFields({
  row,
  label,
  detail,
  onChange,
  inputClassName,
}: {
  row: FoodRowFields;
  label: string;
  detail: NutrientDetail;
  onChange: (key: NutrientKey, value: string) => void;
  inputClassName?: string;
}) {
  const defs = defsForDetail(detail);
  if (!defs.length) return null;
  const filled = defs.filter((d) => (row.nutrients[d.key] ?? "").trim() !== "").length;

  return (
    <details className="group mt-2">
      <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-sm text-xs text-ink-soft transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden className="transition-transform group-open:rotate-90">
          <path d="M2.5 1.5 5.5 4l-3 2.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Micronutrients
        <span className="metric text-ink-soft/70">
          {filled ? `${filled} of ${defs.length}` : "none yet"}
        </span>
      </summary>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {defs.map((d) => (
          <label key={d.key} className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-[0.6875rem] text-ink-soft">
              {d.label} <span className="text-ink-soft/60">{d.unit}</span>
            </span>
            <Input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={row.nutrients[d.key] ?? ""}
              onChange={(e) => onChange(d.key, e.target.value)}
              aria-label={`${label} ${d.label} (${d.unit})`}
              className={cn("metric px-2 py-1.5 text-sm", inputClassName)}
            />
          </label>
        ))}
      </div>
    </details>
  );
}
