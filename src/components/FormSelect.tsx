"use client";

import { foodForms, normalizeFoodName, type StoredFood } from "@/lib/food-presets";
import { switchSavedForm } from "@/lib/food-rows";

// A saved food's name as a menu of the forms it comes in — the plan's
// blueberries picked as frozen or dried right where they're read. Each option
// says what the amount would become ("Dried · 20 g") before it's chosen; see
// switchSavedForm for how it converts, and `formGrams` for why it's passed.
//
// Drawn like AmountSelect beside it, which it sits next to in PlanCheckoff:
// the name as text with a native <select> laid invisibly over it, so the row
// still reads as a sentence and a phone opens its own picker. Plain text for a
// food that only comes one way.
export function FormSelect({
  food,
  formGrams,
  onPick,
}: {
  food: StoredFood;
  formGrams: number | null;
  onPick: (name: string) => void;
}) {
  const forms = foodForms(food.name);
  const current = forms?.find(
    (f) => normalizeFoodName(f.name) === normalizeFoodName(food.name),
  );
  if (!forms || !current) return <>{food.name}</>;

  return (
    <span className="relative inline-flex items-baseline gap-1 rounded-sm underline decoration-ink-soft/40 decoration-dotted underline-offset-[3px] transition-colors hover:text-jade-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-jade">
      {food.name}
      <svg width="7" height="5" viewBox="0 0 7 5" aria-hidden className="shrink-0 self-center">
        <path d="M.75.75 3.5 3.75 6.25.75" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        value={current.name}
        onChange={(e) => onPick(e.target.value)}
        // Inside PlanCheckoff's row <label>, like AmountSelect: opening the
        // menu must not also tick the food.
        onClick={(e) => e.stopPropagation()}
        aria-label={`Form of ${forms[0].name}`}
        title="Switch form; the amount converts to the same amount of food"
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        {forms.map((f) => {
          const quantity =
            f === current
              ? food.quantity?.trim()
              : switchSavedForm(food, f.name, formGrams)?.food.quantity;
          return (
            <option key={f.name} value={f.name}>
              {quantity ? `${f.label} · ${quantity}` : f.label}
            </option>
          );
        })}
      </select>
    </span>
  );
}
