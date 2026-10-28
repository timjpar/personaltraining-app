"use client";

// One day's food log as a form. The rows it edits live in LogRowsProvider
// (nutrition-log-state.tsx) rather than here, because the plan rendered beside
// this form writes to them too — see the note at the top of that file.
import { useActionState, useId } from "react";
import type { LogState } from "@/lib/nutrition-form";
import { FoodPicker } from "@/components/FoodPicker";
import { FoodScanner } from "@/components/FoodScanner";
import { AmountControls, FormPicker, NutrientFields } from "@/components/FoodRowControls";
import { NutritionTotals } from "@/components/NutritionTotals";
import { FoodGroupHeading, GROUP_BOX } from "@/components/NutritionPlanView";
import {
  Card,
  Field,
  Input,
  Textarea,
  FormError,
  buttonClass,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { NutrientDetail } from "@/lib/constants";
import type { FoodPreset } from "@/lib/food-presets";
import { foodBlocks } from "@/lib/food-groups";
import { rowTotals } from "@/lib/food-rows";
import {
  useLogRows,
  type MacroKey,
  type Row,
} from "@/components/nutrition-log-state";

// Re-exported from its new home so callers that only ever wanted the log's
// entry shape don't have to know the state moved.
export type { InitialEntry } from "@/components/nutrition-log-state";

const MACROS: { key: MacroKey; label: string; placeholder: string }[] = [
  { key: "calories", label: "Cal", placeholder: "320" },
  { key: "protein", label: "Protein", placeholder: "30" },
  { key: "carbs", label: "Carbs", placeholder: "40" },
  { key: "fat", label: "Fat", placeholder: "10" },
];

function RemoveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const REMOVE_BUTTON =
  "grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-colors hover:bg-paper hover:text-flag";

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
  detail,
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
  // The viewer's micronutrient preference — see NutritionTotals.
  detail: NutrientDetail;
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
    removeGroup,
    setMeal,
    setGroupMeal,
    applyPreset,
    clearPreset,
    setAmount,
    setUnit,
    setName,
    setForm,
    setQuantity,
    setMacro,
    setNutrient,
    totals,
    nutrientTotals,
    payload,
    initialNotes,
  } = useLogRows();

  // Row numbers in the labels count the whole day, grouped or not.
  const position = new Map(rows.map((r, i) => [r.id, i]));

  const rowCard = (row: Row) => {
    const i = position.get(row.id) ?? 0;
    return (
      <div
        key={row.id}
        className="rounded-[var(--radius-card)] border border-line bg-card p-3"
      >
        {/* Two lines: what it was, then how much. The amount now carries
            a unit menu beside it, and on one line the food's name was
            the only thing left to give — the part you're scanning for. */}
        <div className="flex flex-wrap items-center gap-2">
          {/* A grouped food takes its meal from the group's own box. */}
          {row.groupId ? null : (
            <Input
              value={row.meal}
              onChange={(e) => setMeal(row.id, e.target.value)}
              list={mealListId}
              placeholder="Meal"
              aria-label={`Food ${i + 1} meal`}
              className="w-full bg-paper/40 px-2.5 py-2 text-sm sm:w-32"
            />
          )}
          <FoodPicker
            value={row.name}
            onChange={(v) => setName(row.id, v)}
            onPick={(p) => applyPreset(row.id, p)}
            onPickCustom={() => clearPreset(row.id)}
            custom={recent}
            customLabel="Foods you log"
            aria-label={`Food ${i + 1} name`}
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            aria-label={`Remove food ${i + 1}`}
            className={REMOVE_BUTTON}
          >
            <RemoveIcon />
          </button>
        </div>

        {/* Fresh, frozen or dried, under the name it changes — for the
            morning the plan said fresh and the freezer said otherwise. Only
            for a food that comes more than one way. */}
        <FormPicker
          row={row}
          label={row.name.trim() || `food ${i + 1}`}
          onPick={(name) => setForm(row.id, name)}
          className="mt-1 hover:bg-paper"
        />

        <div className="mt-2 flex items-center gap-2">
          <AmountControls
            row={row}
            label={`Food ${i + 1}`}
            onAmount={(raw) => setAmount(row.id, raw)}
            onUnit={(unit) => setUnit(row.id, unit)}
            inputClassName="bg-paper/40"
          />
          <div className="min-w-0 flex-1">
            <Input
              value={row.quantity}
              onChange={(e) => setQuantity(row.id, e.target.value)}
              placeholder="1 cup"
              aria-label={`Food ${i + 1} quantity`}
              className="bg-paper/40 px-2.5 py-2 text-sm"
            />
          </div>
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

        <NutrientFields
          row={row}
          label={`Food ${i + 1}`}
          detail={detail}
          onChange={(key, value) => setNutrient(row.id, key, value)}
          inputClassName="bg-paper/40"
        />
      </div>
    );
  };

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
        {foodBlocks(rows, (r) => r.groupId).map((block) => {
          const groupId = block.group;
          if (!groupId) return rowCard(block.foods[0]);

          const first = block.foods[0];
          const name = first.groupName ?? "Group";
          const n = block.foods.length;
          const macros = rowTotals(block.foods).macros;
          return (
            <div key={groupId} className={cn(GROUP_BOX, "pb-3")}>
              {/* One box, one meal, one remove: a dish ticked off the plan
                  stays a dish here, and comes back out in one tap. */}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={first.meal}
                  onChange={(e) => setGroupMeal(groupId, e.target.value)}
                  list={mealListId}
                  placeholder="Meal"
                  aria-label={`${name} meal`}
                  className="w-full bg-card/70 px-2.5 py-2 text-sm sm:w-32"
                />
                <div className="min-w-0 flex-1">
                  <FoodGroupHeading
                    name={name}
                    // Non-breaking inside each figure, so a phone wraps
                    // between them rather than leaving "F" without its 0.
                    macros={[
                      `${n} food${n === 1 ? "" : "s"}`,
                      `${macros.calories} kcal`,
                      `P ${macros.protein}`,
                      `C ${macros.carbs}`,
                      `F ${macros.fat}`,
                    ]
                      .map((part) => part.replace(/ /g, "\u00a0"))
                      .join(" · ")}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGroup(groupId)}
                  aria-label={`Remove ${name}, all ${n} foods`}
                  className={REMOVE_BUTTON}
                >
                  <RemoveIcon />
                </button>
              </div>

              {/* Folded by default. Ticking the smoothie shouldn't drop five
                  full edit cards into the log; its foods are a tap away for
                  the morning the berries ran out. */}
              <details className="group/foods mt-1.5">
                <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-xs text-ink-soft [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden
                    className="shrink-0 transition-transform group-open/foods:rotate-90"
                  >
                    ›
                  </span>
                  <span className="min-w-0 truncate group-open/foods:hidden">
                    {block.foods.map((r) => r.name.trim() || "Unnamed food").join(", ")}
                  </span>
                  <span className="hidden group-open/foods:inline">
                    Hide foods
                  </span>
                </summary>
                <div className="mt-1 flex flex-col gap-2.5">
                  {block.foods.map(rowCard)}
                </div>
              </details>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addRow}
        className={cn(buttonClass("outline"), "w-full")}
      >
        + Add food
      </button>

      <Card className="p-4">
        <NutritionTotals
          label={targets ? "Today vs your targets" : "Today's total"}
          totals={totals}
          targets={targets}
          nutrients={nutrientTotals}
          detail={detail}
        />
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
