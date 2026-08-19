"use client";

// One day's food log as a form. The rows it edits live in LogRowsProvider
// (nutrition-log-state.tsx) rather than here, because the plan rendered beside
// this form writes to them too — see the note at the top of that file.
import { useActionState, useId } from "react";
import type { LogState } from "@/lib/nutrition-form";
import { FoodPicker } from "@/components/FoodPicker";
import { FoodScanner } from "@/components/FoodScanner";
import { MacroBar } from "@/components/MacroBar";
import {
  Card,
  Field,
  Input,
  Textarea,
  FormError,
  buttonClass,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { FoodPreset } from "@/lib/food-presets";
import { useLogRows, type MacroKey } from "@/components/nutrition-log-state";

// Re-exported from its new home so callers that only ever wanted the log's
// entry shape don't have to know the state moved.
export type { InitialEntry } from "@/components/nutrition-log-state";

const MACROS: { key: MacroKey; label: string; placeholder: string }[] = [
  { key: "calories", label: "Cal", placeholder: "320" },
  { key: "protein", label: "Protein", placeholder: "30" },
  { key: "carbs", label: "Carbs", placeholder: "40" },
  { key: "fat", label: "Fat", placeholder: "10" },
];

// Offered as a datalist rather than a fixed select: these cover most days, but
// "Pre-session" and "Second lunch" are real answers a dropdown would refuse.
const MEAL_SUGGESTIONS = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Pre-session",
  "Post-session",
];

export function NutritionLogForm({
  action,
  targets,
  recent,
  photoEnabled,
  self = false,
}: {
  action: (state: LogState, formData: FormData) => Promise<LogState>;
  targets?: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
  // What this person has logged before, shown above the catalog in the picker.
  recent?: FoodPreset[];
  // Whether GEMINI_API_KEY is set, read on the server and passed down.
  photoEnabled: boolean;
  // Set when a coach is logging their own day — see the notes field below,
  // which is the only thing it changes.
  self?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const mealListId = useId();

  const {
    rows,
    addRow,
    addScanned,
    removeRow,
    update,
    applyPreset,
    clearPreset,
    setServings,
    setName,
    setMacro,
    totals,
    payload,
    initialNotes,
  } = useLogRows();

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormError>{state.error}</FormError>

      {/* Every row travels as one JSON field, as the plan builder does. */}
      <input type="hidden" name="entries" value={JSON.stringify(payload)} />

      <datalist id={mealListId}>
        {MEAL_SUGGESTIONS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <FoodScanner onFoods={addScanned} photoEnabled={photoEnabled} />

      <div className="flex flex-col gap-2.5">
        {rows.map((row, i) => (
          <div
            key={row.id}
            className="rounded-[var(--radius-card)] border border-line bg-card p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={row.meal}
                onChange={(e) => update(row.id, (r) => ({ ...r, meal: e.target.value }))}
                list={mealListId}
                placeholder="Meal"
                aria-label={`Food ${i + 1} meal`}
                className="w-full bg-paper/40 px-2.5 py-2 text-sm sm:w-32"
              />
              <FoodPicker
                value={row.name}
                onChange={(v) => setName(row.id, v)}
                onPick={(p) => applyPreset(row.id, p)}
                onPickCustom={() => clearPreset(row.id)}
                custom={recent}
                customLabel="Foods you log"
                aria-label={`Food ${i + 1} name`}
                className="min-w-0 basis-full sm:flex-1 sm:basis-auto"
              />
              {/* Widths live on the wrappers: inputBase sets w-full and cn() is
                  a plain join, so a width class on the Input itself loses. */}
              <div className="relative w-[4.5rem] shrink-0">
                <Input
                  type="number"
                  min={0}
                  step="0.25"
                  inputMode="decimal"
                  value={row.servings}
                  disabled={row.base == null}
                  onChange={(e) => setServings(row.id, e.target.value)}
                  placeholder="1"
                  aria-label={`Food ${i + 1} servings`}
                  title={
                    row.base == null
                      ? "Pick a food from the list to scale a serving"
                      : undefined
                  }
                  className="metric bg-paper/40 px-2 py-1.5 pr-5 text-sm disabled:opacity-50"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-soft"
                >
                  ×
                </span>
              </div>
              <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
                <Input
                  value={row.quantity}
                  onChange={(e) =>
                    update(row.id, (r) => ({ ...r, quantity: e.target.value }))
                  }
                  placeholder="1 cup"
                  aria-label={`Food ${i + 1} quantity`}
                  className="bg-paper/40 px-2.5 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                aria-label={`Remove food ${i + 1}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-colors hover:bg-paper hover:text-flag"
              >
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-2 grid grid-cols-4 gap-2">
              {MACROS.map((mac) => (
                <label key={mac.key} className="flex flex-col gap-1">
                  <span className="eyebrow text-ink-soft/70">{mac.label}</span>
                  <Input
                    type="number"
                    min={0}
                    value={row[mac.key]}
                    onChange={(e) => setMacro(row.id, mac.key, e.target.value)}
                    placeholder={mac.placeholder}
                    className="metric bg-paper/40 px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className={cn(buttonClass("outline"), "w-full")}
      >
        + Add food
      </button>

      <Card className="p-4">
        <p className="eyebrow mb-2.5 text-ink-soft">
          {targets ? "Today vs your targets" : "Today's total"}
        </p>
        <MacroBar totals={totals} targets={targets} />
      </Card>

      {/* The label is the one place this form knows who reads the day. An
          athlete's notes go to somebody; a coach logging their own go to
          nobody, and promising a reader who doesn't exist is worse than a
          plainer label. */}
      <Field
        label={self ? "Notes" : "Notes for your coach"}
        htmlFor="log-notes"
      >
        <Textarea
          id="log-notes"
          name="notes"
          rows={3}
          placeholder="Travelling — ate out twice. Felt low on energy in the afternoon."
          defaultValue={initialNotes ?? ""}
        />
      </Field>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : "Save log"}
        </button>
        {state.ok ? (
          <span className="text-sm text-jade-strong">{state.ok}</span>
        ) : null}
      </div>
    </form>
  );
}
