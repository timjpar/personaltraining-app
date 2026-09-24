"use client";

import { displayAmounts, toDisplayUnit } from "@/lib/food-amounts";
import { normalizeFoodName } from "@/lib/food-presets";
import { useStoredValue } from "@/lib/use-stored-set";

// A saved amount, re-readable in whatever unit suits the reader: "1 cup dry
// (80 g)" can be read as 80 g, 2.8 oz or 1 cup. Display only — the plan says
// what it says, and nothing picked here is written back.
//
// The choice is per viewer and per food, kept in this browser (see
// use-stored-set.ts for how, and for the one frame of the default it costs).
// Per food because that is how people measure: oats in cups, chicken on the
// scale. It follows the food from plan to log to next week's plan.
//
// Drawn as text with a native <select> laid invisibly over it. The select
// keeps the platform picker, keyboard and screen-reader behaviour; the text
// keeps the row reading as a sentence instead of a form — and the invisible
// select can take the 16px phones insist on without the row having to.
export function AmountSelect({
  name,
  quantity,
  grams,
  gramsPerCup,
}: {
  name: string;
  quantity: string;
  grams: number | null;
  gramsPerCup: number | null;
}) {
  const [choice, setChoice] = useStoredValue(
    `chalkline.amount-unit.v1.${normalizeFoodName(name)}`,
    toDisplayUnit,
  );

  const options = displayAmounts(quantity, { grams, gramsPerCup });
  if (options.length < 2) return <>{quantity}</>;

  const current = options.find((o) => o.unit === choice) ?? options[0];

  return (
    <span className="relative inline-flex items-baseline gap-1 rounded-sm underline decoration-ink-soft/40 decoration-dotted underline-offset-[3px] transition-colors hover:text-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-jade">
      {current.label}
      <svg width="7" height="5" viewBox="0 0 7 5" aria-hidden className="shrink-0 self-center">
        <path d="M.75.75 3.5 3.75 6.25.75" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        value={current.unit}
        onChange={(e) => setChoice(toDisplayUnit(e.target.value))}
        // Inside PlanCheckoff this sits in the row's <label>; a click here
        // opens the menu and must not also tick the food.
        onClick={(e) => e.stopPropagation()}
        aria-label={`Show ${name} in`}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        {options.map((o) => (
          <option key={o.unit} value={o.unit}>
            {o.unit === "written" ? `${o.label} (as written)` : o.label}
          </option>
        ))}
      </select>
    </span>
  );
}
