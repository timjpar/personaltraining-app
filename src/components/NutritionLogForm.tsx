"use client";

import { useActionState, useId, useMemo, useState } from "react";
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
import { FOOD_SOURCE, type FoodSource } from "@/lib/constants";
import type { FoodMacros, FoodPreset } from "@/lib/food-presets";
import {
  normalizeFoodName,
  parseServings,
  scaleMacros,
  servingLabel,
} from "@/lib/food-presets";

type MacroKey = "calories" | "protein" | "carbs" | "fat";

// The same row shape NutritionBuilder uses, plus the two things a log carries
// that a plan doesn't: which meal it belongs to, and where its numbers came
// from. `base` and `servings` stay client-only, exactly as they do there.
type Row = {
  id: string;
  meal: string;
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  servings: string;
  base: FoodPreset | null;
  source: FoodSource;
};

export type InitialEntry = {
  meal: string;
  name: string;
  quantity: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  source: string;
};

const numStr = (n: number | null | undefined) => (n == null ? "" : String(n));
const num = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const macroStrings = (m: FoodMacros) => ({
  calories: String(m.calories),
  protein: String(m.protein),
  carbs: String(m.carbs),
  fat: String(m.fat),
});

const blankRow = (id: string, meal = ""): Row => ({
  id,
  meal,
  name: "",
  quantity: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  servings: "",
  base: null,
  source: FOOD_SOURCE.MANUAL,
});

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
  initial,
  targets,
  recent,
  photoEnabled,
  self = false,
}: {
  action: (state: LogState, formData: FormData) => Promise<LogState>;
  initial?: { notes: string | null; entries: InitialEntry[] };
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

  // Deterministic ids for server-rendered rows so hydration matches; rows added
  // later come from crypto.randomUUID(). Same contract as NutritionBuilder.
  //
  // No rehydrate() here, unlike the builder: a log row's preset link only
  // matters while you're editing the row you just added, and reattaching it on
  // load would let a later nudge of the servings box overwrite numbers the
  // athlete typed. Reopening a saved day gives you the numbers, not the formula.
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.entries.length
      ? initial.entries.map((e, i) => ({
          ...blankRow(`e${i}`, e.meal),
          name: e.name,
          quantity: e.quantity ?? "",
          calories: numStr(e.calories),
          protein: numStr(e.protein),
          carbs: numStr(e.carbs),
          fat: numStr(e.fat),
          source: e.source as FoodSource,
        }))
      : [blankRow("e0", "Breakfast")],
  );

  const addRow = () =>
    setRows((rs) => [
      ...rs,
      // Inherits the last row's meal label: foods arrive in clumps, so the
      // common case is another item in the meal you're already logging.
      blankRow(crypto.randomUUID(), rs[rs.length - 1]?.meal ?? ""),
    ]);

  // A scan lands as one or more filled rows, already linked to their preset so
  // the servings box scales them — the same state a catalog pick produces, so
  // nothing downstream has to know a camera was involved.
  const addScanned = (foods: FoodPreset[], source: FoodSource) =>
    setRows((rs) => {
      const meal = rs[rs.length - 1]?.meal ?? "";
      const scanned = foods.map((preset) => ({
        ...blankRow(crypto.randomUUID(), meal),
        name: preset.name,
        base: preset,
        servings: "1",
        quantity: servingLabel(preset, 1),
        source,
        ...macroStrings(scaleMacros(preset, 1)),
      }));
      // An untouched blank starter row is replaced rather than left above the
      // result — it's scaffolding, not something the athlete typed.
      const keep = rs.filter((r) => r.name.trim() !== "");
      return [...keep, ...scanned];
    });

  const removeRow = (id: string) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : [blankRow(crypto.randomUUID())]));

  const update = (id: string, fn: (row: Row) => Row) =>
    setRows((rs) => rs.map((r) => (r.id === id ? fn(r) : r)));

  // Picking from the catalog fills the row with one serving's macros.
  const applyPreset = (id: string, preset: FoodPreset) =>
    update(id, (r) => ({
      ...r,
      name: preset.name,
      base: preset,
      servings: "1",
      quantity: servingLabel(preset, 1),
      source: FOOD_SOURCE.PRESET,
      ...macroStrings(scaleMacros(preset, 1)),
    }));

  const clearPreset = (id: string) =>
    update(id, (r) => ({
      ...r,
      base: null,
      servings: "",
      source: FOOD_SOURCE.MANUAL,
    }));

  // Always scaled from the base, never from what's on screen, so 1 → 2 → 1
  // lands back on the exact original figures.
  const setServings = (id: string, raw: string) =>
    update(id, (r) => {
      const n = parseServings(raw);
      // Mid-keystroke ("1." or an empty box) must not rewrite the macros.
      if (!r.base || n == null) return { ...r, servings: raw };
      return {
        ...r,
        servings: raw,
        quantity: servingLabel(r.base, n),
        ...macroStrings(scaleMacros(r.base, n)),
      };
    });

  // Renaming past the preset drops the link but keeps the numbers — the
  // athlete's figures are never destroyed as a side effect of an edit.
  const setName = (id: string, name: string) =>
    update(id, (r) => {
      const stillPreset =
        r.base && normalizeFoodName(name) === normalizeFoodName(r.base.name);
      return stillPreset
        ? { ...r, name }
        : { ...r, name, base: null, servings: "", source: FOOD_SOURCE.MANUAL };
    });

  // Same rule for a hand-edited macro: once a number stops matching the scaled
  // serving, the row belongs to the athlete and the servings box goes inert.
  const setMacro = (id: string, key: MacroKey, value: string) =>
    update(id, (r) => {
      const next = { ...r, [key]: value };
      const n = parseServings(r.servings);
      if (!r.base || n == null) return next;
      const expected = String(scaleMacros(r.base, n)[key]);
      return value === expected
        ? next
        : { ...next, base: null, servings: "", source: FOOD_SOURCE.MANUAL };
    });

  const totals = rows.reduce(
    (acc, r) => {
      acc.calories += num(r.calories);
      acc.protein += num(r.protein);
      acc.carbs += num(r.carbs);
      acc.fat += num(r.fat);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  // Only the persisted fields travel. `base` is a whole preset object per row,
  // and `servings`/`id` mean nothing to the server.
  const payload = useMemo(
    () =>
      rows.map(({ meal, name, quantity, calories, protein, carbs, fat, source }) => ({
        meal,
        name,
        quantity,
        calories,
        protein,
        carbs,
        fat,
        source,
      })),
    [rows],
  );

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
          defaultValue={initial?.notes ?? ""}
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
