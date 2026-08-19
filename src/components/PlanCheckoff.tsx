"use client";

// The coach's plan, with a checkbox on every food. Ticking one drops it into
// the day's log already filled in; unticking takes it back out.
//
// Deliberately not a mode on NutritionPlanView. That component renders a plan
// in four places where there is no log to write to — the coach's library, the
// admin view, and a coach reading an athlete's day — and every one of them
// would have had to start passing a flag saying "not here". This is the day
// view's copy, and it is the only one that needs a LogRowsProvider above it.
import { Card } from "@/components/ui";
import { MacroBar } from "@/components/MacroBar";
import { sumMacros } from "@/lib/nutrition-form";
import { planKey, useLogRows, type PlanFood } from "@/components/nutrition-log-state";

type Food = PlanFood & { id: string };
type Meal = { id: string; name: string; foods: Food[] };
type Plan = {
  notes: string | null;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  meals: Meal[];
};

function foodMacros(f: Food) {
  return [
    f.calories != null ? `${f.calories} kcal` : null,
    f.protein != null ? `P ${f.protein}` : null,
    f.carbs != null ? `C ${f.carbs}` : null,
    f.fat != null ? `F ${f.fat}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function PlanCheckoff({ plan }: { plan: Plan }) {
  const { togglePlanFood, plannedKeys } = useLogRows();

  const totals = sumMacros(plan.meals);
  const targets = {
    calories: plan.targetCalories,
    protein: plan.targetProtein,
    carbs: plan.targetCarbs,
    fat: plan.targetFat,
  };
  const hasTargets = Object.values(targets).some((v) => v != null);

  return (
    <div className="flex flex-col gap-5">
      {plan.notes ? (
        <p className="rounded-[var(--radius-sm)] border border-line bg-card px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {plan.notes}
        </p>
      ) : null}

      <p className="text-sm text-ink-soft">
        Tick anything you ate and it fills itself into your log, macros and all.
        Untick to take it back out.
      </p>

      <div>
        <p className="eyebrow mb-2 text-ink-soft">Daily totals</p>
        <MacroBar totals={totals} targets={hasTargets ? targets : null} />
      </div>

      <div className="flex flex-col gap-4">
        {plan.meals.map((meal) => {
          const mealTotals = sumMacros([meal]);
          const ticked = meal.foods.filter((f) =>
            plannedKeys.has(planKey(meal.name, f.name)),
          ).length;
          const allTicked = ticked === meal.foods.length && ticked > 0;

          return (
            <Card key={meal.id} className="p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-base font-semibold text-ink">
                  {meal.name}
                </h3>
                <span className="metric text-xs text-ink-soft">
                  {mealTotals.calories} kcal
                </span>
              </div>

              {/* One gesture for the ordinary case: you ate the meal as it was
                  written. Without it, a fourteen-item breakfast is fourteen
                  taps to say the same thing. */}
              <button
                type="button"
                onClick={() => {
                  for (const f of meal.foods) {
                    const on = plannedKeys.has(planKey(meal.name, f.name));
                    if (on !== allTicked) continue;
                    togglePlanFood(meal.name, f);
                  }
                }}
                className="metric mt-1 text-xs text-jade-strong transition-colors hover:text-ink"
              >
                {allTicked ? "Clear all" : "Tick all"}
              </button>

              <ul className="mt-2 divide-y divide-line">
                {meal.foods.map((f) => {
                  const checked = plannedKeys.has(planKey(meal.name, f.name));
                  return (
                    <li key={f.id}>
                      {/* The whole row is the hit target — a bare checkbox is
                          a 13px tap on a phone, and this list is read and
                          ticked one-handed in a kitchen. */}
                      <label className="flex cursor-pointer flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:gap-3">
                        <span className="flex min-w-0 flex-1 items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePlanFood(meal.name, f)}
                            className="h-4 w-4 shrink-0 accent-jade"
                          />
                          <span
                            className={
                              checked
                                ? "min-w-0 text-sm text-ink-soft line-through"
                                : "min-w-0 text-sm text-ink"
                            }
                          >
                            {f.name}
                            {f.quantity ? (
                              <span className="text-ink-soft"> · {f.quantity}</span>
                            ) : null}
                          </span>
                        </span>
                        <span className="metric shrink-0 pl-7 text-xs text-ink-soft sm:pl-0">
                          {foodMacros(f)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
