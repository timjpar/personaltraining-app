"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { NutritionFormState } from "@/app/(trainer)/nutrition/actions";
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

type FoodRow = {
  id: string;
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
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

const newFood = (): FoodRow => ({
  id: crypto.randomUUID(),
  name: "",
  quantity: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
});
const newMeal = (name = ""): MealRow => ({
  id: crypto.randomUUID(),
  name,
  foods: [newFood()],
});

const MACROS: { key: keyof FoodRow; label: string; placeholder: string }[] = [
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
            ? m.foods.map((f, fi) => ({
                id: `m${mi}-f${fi}`,
                name: f.name,
                quantity: f.quantity ?? "",
                calories: numStr(f.calories),
                protein: numStr(f.protein),
                carbs: numStr(f.carbs),
                fat: numStr(f.fat),
              }))
            : [{ id: `m${mi}-f0`, name: "", quantity: "", calories: "", protein: "", carbs: "", fat: "" }],
        }))
      : [
          {
            id: "m0",
            name: "Breakfast",
            foods: [{ id: "m0-f0", name: "", quantity: "", calories: "", protein: "", carbs: "", fat: "" }],
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
  const setFood = (
    mealId: string,
    foodId: string,
    key: keyof FoodRow,
    value: string,
  ) =>
    setMeals((ms) =>
      ms.map((m) =>
        m.id === mealId
          ? {
              ...m,
              foods: m.foods.map((f) =>
                f.id === foodId ? { ...f, [key]: value } : f,
              ),
            }
          : m,
      ),
    );

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

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormError>{state.error}</FormError>

      {/* All meals + foods travel as one JSON field. */}
      <input type="hidden" name="meals" value={JSON.stringify(meals)} />

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
                  <div className="flex items-center gap-2">
                    <Input
                      value={food.name}
                      onChange={(e) => setFood(meal.id, food.id, "name", e.target.value)}
                      placeholder="Food"
                      className="flex-1 bg-card text-sm"
                      aria-label={`Food ${fi + 1} name`}
                    />
                    <Input
                      value={food.quantity}
                      onChange={(e) => setFood(meal.id, food.id, "quantity", e.target.value)}
                      placeholder="1 cup"
                      className="w-24 bg-card text-sm"
                      aria-label={`Food ${fi + 1} quantity`}
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
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {MACROS.map((mac) => (
                      <label key={mac.key} className="flex flex-col gap-1">
                        <span className="eyebrow text-ink-soft/70">{mac.label}</span>
                        <Input
                          type="number"
                          min={0}
                          value={food[mac.key]}
                          onChange={(e) => setFood(meal.id, food.id, mac.key, e.target.value)}
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
