"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { NutritionFormState } from "@/app/(trainer)/nutrition/actions";
import { FoodPicker } from "@/components/FoodPicker";
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
import type { FoodMacros, FoodPreset } from "@/lib/food-presets";
import {
  findFoodPreset,
  normalizeFoodName,
  parseServingLabel,
  parseServings,
  scaleMacros,
  servingLabel,
} from "@/lib/food-presets";

type MacroKey = "calories" | "protein" | "carbs" | "fat";

type FoodRow = {
  id: string;
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  // Client-only, never persisted. `base` is the per-serving preset the macros
  // were scaled from; null means the row was typed by hand and the servings box
  // has nothing to multiply. The multiplier survives a save through the
  // quantity string ("2 × 1 medium (200 g)"), which is what lets an edit page
  // rebuild both of these.
  servings: string;
  base: FoodPreset | null;
};
type MealRow = { id: string; name: string; foods: FoodRow[] };

type Initial = {
  title?: string;
  notes?: string | null;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
  meals?: {
    name: string;
    foods: {
      name: string;
      quantity: string | null;
      calories: number | null;
      protein: number | null;
      carbs: number | null;
      fat: number | null;
    }[];
  }[];
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

const blankFood = (id: string): FoodRow => ({
  id,
  name: "",
  quantity: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  servings: "",
  base: null,
});
const newFood = (): FoodRow => blankFood(crypto.randomUUID());
const newMeal = (name = ""): MealRow => ({
  id: crypto.randomUUID(),
  name,
  foods: [newFood()],
});

// Rebuild the preset link for a food loaded from the database. Both helpers are
// pure, so this runs identically on the server and the client — the initial
// rows have to hydrate without a mismatch.
function rehydrate(
  id: string,
  f: {
    name: string;
    quantity: string | null;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  },
): FoodRow {
  const row: FoodRow = {
    id,
    name: f.name,
    quantity: f.quantity ?? "",
    calories: numStr(f.calories),
    protein: numStr(f.protein),
    carbs: numStr(f.carbs),
    fat: numStr(f.fat),
    servings: "",
    base: null,
  };

  const preset = findFoodPreset(f.name);
  const parsed = parseServingLabel(f.quantity);
  if (!preset || !parsed) return row;

  // The stored macros have to still match what this preset and multiplier
  // produce. If a coach picked Avocado ×2 and then typed over the calories, the
  // row is theirs now — reattaching the preset would let a later nudge of the
  // servings box silently throw that edit away.
  const scaled = scaleMacros(preset, parsed.servings);
  const matches =
    scaled.calories === (f.calories ?? 0) &&
    scaled.protein === (f.protein ?? 0) &&
    scaled.carbs === (f.carbs ?? 0) &&
    scaled.fat === (f.fat ?? 0);
  if (!matches) return row;

  return { ...row, servings: String(parsed.servings), base: preset };
}

const MACROS: { key: MacroKey; label: string; placeholder: string }[] = [
  { key: "calories", label: "Cal", placeholder: "320" },
  { key: "protein", label: "Protein", placeholder: "30" },
  { key: "carbs", label: "Carbs", placeholder: "40" },
  { key: "fat", label: "Fat", placeholder: "10" },
];

export function NutritionBuilder({
  action,
  submitLabel,
  cancelHref,
  initial,
}: {
  action: (
    state: NutritionFormState,
    formData: FormData,
  ) => Promise<NutritionFormState>;
  submitLabel: string;
  cancelHref: string;
  initial?: Initial;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // Deterministic ids for the server-rendered rows so hydration matches; rows
  // added later via the client-only handlers use random ids.
  const [meals, setMeals] = useState<MealRow[]>(() =>
    initial?.meals?.length
      ? initial.meals.map((m, mi) => ({
          id: `m${mi}`,
          name: m.name,
          foods: m.foods.length
            ? m.foods.map((f, fi) => rehydrate(`m${mi}-f${fi}`, f))
            : [blankFood(`m${mi}-f0`)],
        }))
      : [
          {
            id: "m0",
            name: "Breakfast",
            foods: [blankFood("m0-f0")],
          },
        ],
  );

  const addMeal = () =>
    setMeals((ms) => [...ms, newMeal(`Meal ${ms.length + 1}`)]);
  const removeMeal = (mealId: string) =>
    setMeals((ms) => (ms.length > 1 ? ms.filter((m) => m.id !== mealId) : ms));
  const setMealName = (mealId: string, name: string) =>
    setMeals((ms) => ms.map((m) => (m.id === mealId ? { ...m, name } : m)));
  const addFood = (mealId: string) =>
    setMeals((ms) =>
      ms.map((m) =>
        m.id === mealId ? { ...m, foods: [...m.foods, newFood()] } : m,
      ),
    );
  const removeFood = (mealId: string, foodId: string) =>
    setMeals((ms) =>
      ms.map((m) =>
        m.id === mealId
          ? {
              ...m,
              foods:
                m.foods.length > 1
                  ? m.foods.filter((f) => f.id !== foodId)
                  : m.foods,
            }
          : m,
      ),
    );

  const update = (
    mealId: string,
    foodId: string,
    fn: (food: FoodRow) => FoodRow,
  ) =>
    setMeals((ms) =>
      ms.map((m) =>
        m.id === mealId
          ? { ...m, foods: m.foods.map((f) => (f.id === foodId ? fn(f) : f)) }
          : m,
      ),
    );

  const setField = (
    mealId: string,
    foodId: string,
    key: "quantity",
    value: string,
  ) => update(mealId, foodId, (f) => ({ ...f, [key]: value }));

  // Picking from the catalog fills the row: name, serving, and the macros for
  // exactly one serving.
  const applyPreset = (mealId: string, foodId: string, preset: FoodPreset) =>
    update(mealId, foodId, (f) => ({
      ...f,
      name: preset.name,
      base: preset,
      servings: "1",
      quantity: servingLabel(preset, 1),
      ...macroStrings(scaleMacros(preset, 1)),
    }));

  const clearPreset = (mealId: string, foodId: string) =>
    update(mealId, foodId, (f) => ({ ...f, base: null, servings: "" }));

  // Always scaled from the base, never from the numbers currently on screen —
  // so 1 → 2 → 1 lands back on the exact original figures.
  const setServings = (mealId: string, foodId: string, raw: string) =>
    update(mealId, foodId, (f) => {
      const n = parseServings(raw);
      // Mid-keystroke ("1." or an empty box) must not rewrite the macros.
      if (!f.base || n == null) return { ...f, servings: raw };
      return {
        ...f,
        servings: raw,
        quantity: servingLabel(f.base, n),
        ...macroStrings(scaleMacros(f.base, n)),
      };
    });

  // Renaming past the preset drops the link but keeps the numbers — the coach's
  // figures are never destroyed as a side effect of an edit.
  const setFoodName = (mealId: string, foodId: string, name: string) =>
    update(mealId, foodId, (f) => {
      const stillPreset =
        f.base && normalizeFoodName(name) === normalizeFoodName(f.base.name);
      return stillPreset
        ? { ...f, name }
        : { ...f, name, base: null, servings: "" };
    });

  // Same rule for a hand-edited macro: once a number stops matching the scaled
  // serving, the row belongs to the coach and the servings box goes inert.
  const setMacro = (
    mealId: string,
    foodId: string,
    key: MacroKey,
    value: string,
  ) =>
    update(mealId, foodId, (f) => {
      const next = { ...f, [key]: value };
      const n = parseServings(f.servings);
      if (!f.base || n == null) return next;
      const expected = String(scaleMacros(f.base, n)[key]);
      return value === expected ? next : { ...next, base: null, servings: "" };
    });

  const totals = meals.reduce(
    (acc, m) => {
      for (const f of m.foods) {
        acc.calories += num(f.calories);
        acc.protein += num(f.protein);
        acc.carbs += num(f.carbs);
        acc.fat += num(f.fat);
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  // Only the persisted fields travel. `base` is a whole preset object per row
  // and `servings`/`id` mean nothing to the server.
  const payload = useMemo(
    () =>
      meals.map((m) => ({
        name: m.name,
        foods: m.foods.map(
          ({ name, quantity, calories, protein, carbs, fat }) => ({
            name,
            quantity,
            calories,
            protein,
            carbs,
            fat,
          }),
        ),
      })),
    [meals],
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormError>{state.error}</FormError>

      {/* All meals + foods travel as one JSON field. */}
      <input type="hidden" name="meals" value={JSON.stringify(payload)} />

      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Plan title" htmlFor="title">
            <Input
              id="title"
              name="title"
              placeholder="Cut · 2,000 kcal"
              defaultValue={initial?.title ?? ""}
              required
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes for the athlete" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              placeholder="Hit protein first. Water 3L/day. Veg with every meal."
              defaultValue={initial?.notes ?? ""}
            />
          </Field>
        </div>
      </Card>

      <div>
        <p className="eyebrow mb-2 text-ink-soft">Daily targets (optional)</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {(
            [
              { name: "targetCalories", label: "Calories", value: initial?.targetCalories, placeholder: "2000" },
              { name: "targetProtein", label: "Protein (g)", value: initial?.targetProtein, placeholder: "160" },
              { name: "targetCarbs", label: "Carbs (g)", value: initial?.targetCarbs, placeholder: "200" },
              { name: "targetFat", label: "Fat (g)", value: initial?.targetFat, placeholder: "60" },
            ] as const
          ).map((t) => (
            <label key={t.name} className="flex flex-col gap-1">
              <span className="eyebrow text-ink-soft/70">{t.label}</span>
              <Input
                name={t.name}
                type="number"
                min={0}
                defaultValue={t.value ?? ""}
                placeholder={t.placeholder}
                className="metric"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {meals.map((meal, mi) => (
          <Card key={meal.id} className="p-4">
            <div className="flex items-center gap-3">
              <span className="metric grid h-7 min-w-7 place-items-center rounded-[6px] border border-line bg-paper px-1.5 text-xs font-medium text-ink-soft">
                {String(mi + 1).padStart(2, "0")}
              </span>
              <Input
                value={meal.name}
                onChange={(e) => setMealName(meal.id, e.target.value)}
                placeholder="Meal name (e.g. Breakfast)"
                className="flex-1 font-medium"
                aria-label={`Meal ${mi + 1} name`}
              />
              <button
                type="button"
                onClick={() => removeMeal(meal.id)}
                aria-label={`Remove meal ${mi + 1}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-colors hover:bg-paper hover:text-flag"
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
              {meal.foods.map((food, fi) => (
                <div
                  key={food.id}
                  className="rounded-[var(--radius-sm)] border border-line bg-paper/40 p-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {/* The name takes its own line on a phone; the serving
                        controls share the next one. */}
                    <FoodPicker
                      value={food.name}
                      onChange={(v) => setFoodName(meal.id, food.id, v)}
                      onPick={(p) => applyPreset(meal.id, food.id, p)}
                      onPickCustom={() => clearPreset(meal.id, food.id)}
                      aria-label={`Food ${fi + 1} name`}
                      className="min-w-0 basis-full sm:flex-1 sm:basis-auto"
                    />
                    {/* Widths live on the wrappers: `inputBase` sets w-full and
                        cn() is a plain join, so a width class on the Input
                        itself loses to it. */}
                    <div className="relative w-[4.5rem] shrink-0">
                      <Input
                        type="number"
                        min={0}
                        step="0.25"
                        inputMode="decimal"
                        value={food.servings}
                        disabled={food.base == null}
                        onChange={(e) =>
                          setServings(meal.id, food.id, e.target.value)
                        }
                        placeholder="1"
                        aria-label={`Food ${fi + 1} servings`}
                        title={
                          food.base == null
                            ? "Pick a food from the list to scale a serving"
                            : undefined
                        }
                        className="metric bg-card px-2 py-1.5 pr-5 text-sm disabled:opacity-50"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-soft"
                      >
                        ×
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
                      <Input
                        value={food.quantity}
                        onChange={(e) =>
                          setField(meal.id, food.id, "quantity", e.target.value)
                        }
                        placeholder="1 cup"
                        className="bg-card px-2.5 py-2 text-sm"
                        aria-label={`Food ${fi + 1} quantity`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFood(meal.id, food.id)}
                      aria-label={`Remove food ${fi + 1}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-colors hover:bg-card hover:text-flag"
                    >
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden>
                        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
                          value={food[mac.key]}
                          onChange={(e) => setMacro(meal.id, food.id, mac.key, e.target.value)}
                          placeholder={mac.placeholder}
                          className={cn("metric bg-card px-2 py-1.5 text-sm")}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addFood(meal.id)}
              className={cn(buttonClass("ghost", "sm"), "mt-2.5")}
            >
              + Add food
            </button>
          </Card>
        ))}

        <button
          type="button"
          onClick={addMeal}
          className={cn(buttonClass("outline"), "w-full")}
        >
          + Add meal
        </button>
      </div>

      <Card className="p-4">
        <p className="eyebrow mb-2.5 text-ink-soft">Daily total (from foods)</p>
        <MacroBar totals={totals} />
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
