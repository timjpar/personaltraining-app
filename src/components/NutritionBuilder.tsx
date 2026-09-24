"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { NutritionFormState } from "@/app/(trainer)/nutrition/actions";
import { FoodPicker } from "@/components/FoodPicker";
import { AmountControls, NutrientFields } from "@/components/FoodRowControls";
import { NutritionTotals } from "@/components/NutritionTotals";
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
import type { AmountUnit } from "@/lib/food-amounts";
import type { FoodPreset, StoredFood } from "@/lib/food-presets";
import * as foodRows from "@/lib/food-rows";
import type { FoodRowFields, MacroKey } from "@/lib/food-rows";
import type { NutrientKey } from "@/lib/nutrients";

// How a row is edited — scaling, units, what breaks the preset link — lives in
// src/lib/food-rows.ts, shared with the athlete's day log.
type FoodRow = FoodRowFields & { id: string };
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
    foods: StoredFood[];
  }[];
};

const blankFood = (id: string): FoodRow => ({ ...foodRows.blankFoodFields(), id });
const newFood = (): FoodRow => blankFood(crypto.randomUUID());
const newMeal = (name = ""): MealRow => ({
  id: crypto.randomUUID(),
  name,
  foods: [newFood()],
});

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
  detail,
}: {
  action: (
    state: NutritionFormState,
    formData: FormData,
  ) => Promise<NutritionFormState>;
  submitLabel: string;
  cancelHref: string;
  initial?: Initial;
  // The coach's micronutrient preference — see NutritionTotals.
  detail: NutrientDetail;
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
            ? m.foods.map((f, fi) => ({
                ...foodRows.rehydrateFoodFields(f),
                id: `m${mi}-f${fi}`,
              }))
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

  const applyPreset = (mealId: string, foodId: string, preset: FoodPreset) =>
    update(mealId, foodId, (f) => foodRows.applyPreset(f, preset));
  const clearPreset = (mealId: string, foodId: string) =>
    update(mealId, foodId, (f) => foodRows.detachPreset(f));
  const setAmount = (mealId: string, foodId: string, raw: string) =>
    update(mealId, foodId, (f) => foodRows.setAmount(f, raw));
  const setUnit = (mealId: string, foodId: string, unit: AmountUnit) =>
    update(mealId, foodId, (f) => foodRows.setUnit(f, unit));
  const setFoodName = (mealId: string, foodId: string, name: string) =>
    update(mealId, foodId, (f) => foodRows.setName(f, name));
  const setQuantity = (mealId: string, foodId: string, quantity: string) =>
    update(mealId, foodId, (f) => foodRows.setQuantity(f, quantity));
  const setMacro = (mealId: string, foodId: string, key: MacroKey, value: string) =>
    update(mealId, foodId, (f) => foodRows.setMacro(f, key, value));
  const setNutrient = (
    mealId: string,
    foodId: string,
    key: NutrientKey,
    value: string,
  ) => update(mealId, foodId, (f) => foodRows.setNutrient(f, key, value));

  const totals = useMemo(
    () => foodRows.rowTotals(meals.flatMap((m) => m.foods)),
    [meals],
  );

  // Only the persisted fields travel. `base` is a whole preset object per row
  // and `amount`/`unit`/`id` mean nothing to the server.
  const payload = useMemo(
    () =>
      meals.map((m) => ({
        name: m.name,
        foods: m.foods.map(foodRows.persistedFood),
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
                  {/* Two lines: the food, then how much of it. See the matching
                      note in NutritionLogForm. */}
                  <div className="flex items-center gap-2">
                    <FoodPicker
                      value={food.name}
                      onChange={(v) => setFoodName(meal.id, food.id, v)}
                      onPick={(p) => applyPreset(meal.id, food.id, p)}
                      onPickCustom={() => clearPreset(meal.id, food.id)}
                      aria-label={`Food ${fi + 1} name`}
                      className="min-w-0 flex-1"
                    />
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
                  <div className="mt-2 flex items-center gap-2">
                    <AmountControls
                      row={food}
                      label={`Food ${fi + 1}`}
                      onAmount={(raw) => setAmount(meal.id, food.id, raw)}
                      onUnit={(unit) => setUnit(meal.id, food.id, unit)}
                      inputClassName="bg-card"
                    />
                    <div className="min-w-0 flex-1">
                      <Input
                        value={food.quantity}
                        onChange={(e) =>
                          setQuantity(meal.id, food.id, e.target.value)
                        }
                        placeholder="1 cup"
                        className="bg-card px-2.5 py-2 text-sm"
                        aria-label={`Food ${fi + 1} quantity`}
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
                          value={food[mac.key]}
                          onChange={(e) => setMacro(meal.id, food.id, mac.key, e.target.value)}
                          placeholder={mac.placeholder}
                          className={cn("metric bg-card px-2 py-1.5 text-sm")}
                        />
                      </label>
                    ))}
                  </div>
                  <NutrientFields
                    row={food}
                    label={`Food ${fi + 1}`}
                    detail={detail}
                    onChange={(key, value) =>
                      setNutrient(meal.id, food.id, key, value)
                    }
                    inputClassName="bg-card"
                  />
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
        <NutritionTotals
          label="Daily total (from foods)"
          totals={totals.macros}
          nutrients={totals.nutrients}
          detail={detail}
        />
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
