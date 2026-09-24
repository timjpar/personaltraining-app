import { Card } from "@/components/ui";
import { AmountSelect } from "@/components/AmountSelect";
import { FoodNutrients } from "@/components/NutrientPanel";
import { NutritionTotals } from "@/components/NutritionTotals";
import { sumMacros } from "@/lib/nutrition-form";
import { sumNutrients } from "@/lib/nutrients";
import { foodDetail, type StoredFood } from "@/lib/food-presets";
import type { NutrientDetail } from "@/lib/constants";

type Food = StoredFood & { id: string };
type Meal = { id: string; name: string; foods: Food[] };
type Plan = {
  notes: string | null;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  meals: Meal[];
};

function foodMacros(f: {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}) {
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
// the client's own nutrition page. `detail` is the viewer's micronutrient
// preference — whoever is reading, not whoever the plan is for.
export function NutritionPlanView({
  plan,
  detail,
}: {
  plan: Plan;
  detail: NutrientDetail;
}) {
  const totals = sumMacros(plan.meals);
  const targets = {
    calories: plan.targetCalories,
    protein: plan.targetProtein,
    carbs: plan.targetCarbs,
    fat: plan.targetFat,
  };
  const hasTargets = Object.values(targets).some((v) => v != null);

  // Resolved once per food: stored values, or the catalog's for a row saved
  // before micronutrients existed. See foodDetail.
  const meals = plan.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) => ({ ...f, detail: foodDetail(f) })),
  }));
  const allFoods = meals.flatMap((m) => m.foods);

  return (
    <div className="flex flex-col gap-5">
      {plan.notes ? (
        <p className="rounded-[var(--radius-sm)] border border-line bg-card px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {plan.notes}
        </p>
      ) : null}

      <NutritionTotals
        label="Daily totals"
        totals={totals}
        targets={hasTargets ? targets : null}
        nutrients={sumNutrients(allFoods.map((f) => f.detail))}
        detail={detail}
      />

      <div className="flex flex-col gap-4">
        {meals.map((meal) => {
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
              {/* Rows stack on phones. Side by side, the macro string is
                  rigid and the name is the only thing that can give, so real
                  foods came out as "Chicken brea…" — and the name is the part
                  you're scanning for. */}
              <ul className="mt-2 divide-y divide-line">
                {meal.foods.map((f) => (
                  <li key={f.id} className="py-2">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                      <p className="min-w-0 flex-1 text-sm text-ink sm:truncate">
                        {f.name}
                        {f.quantity ? (
                          <span className="text-ink-soft">
                            {" · "}
                            <AmountSelect
                              name={f.name}
                              quantity={f.quantity}
                              grams={f.detail.grams}
                              gramsPerCup={f.detail.gramsPerCup}
                            />
                          </span>
                        ) : null}
                      </p>
                      <span className="metric shrink-0 text-xs text-ink-soft">
                        {foodMacros(f)}
                      </span>
                    </div>
                    <FoodNutrients
                      nutrients={f.detail.nutrients}
                      detail={detail}
                      className="mt-1"
                    />
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
