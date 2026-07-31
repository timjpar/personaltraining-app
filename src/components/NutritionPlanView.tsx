import { Card } from "@/components/ui";
import { MacroBar } from "@/components/MacroBar";
import { sumMacros } from "@/lib/nutrition-form";

type Food = {
  id: string;
  name: string;
  quantity: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};
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

// Read-only rendering of a nutrition plan, shared by the trainer plan page and
// the client's own nutrition page.
export function NutritionPlanView({ plan }: { plan: Plan }) {
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

      <div>
        <p className="eyebrow mb-2 text-ink-soft">Daily totals</p>
        <MacroBar totals={totals} targets={hasTargets ? targets : null} />
      </div>

      <div className="flex flex-col gap-4">
        {plan.meals.map((meal) => {
          const mealTotals = sumMacros([meal]);
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
              <ul className="mt-2 divide-y divide-line">
                {meal.foods.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-2">
                    <p className="min-w-0 flex-1 truncate text-sm text-ink">
                      {f.name}
                      {f.quantity ? (
                        <span className="text-ink-soft"> · {f.quantity}</span>
                      ) : null}
                    </p>
                    <span className="metric shrink-0 text-xs text-ink-soft">
                      {foodMacros(f)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
