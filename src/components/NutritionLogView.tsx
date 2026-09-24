import { Card } from "@/components/ui";
import { AmountSelect } from "@/components/AmountSelect";
import { FoodNutrients } from "@/components/NutrientPanel";
import { NutritionTotals } from "@/components/NutritionTotals";
import { sumMacros } from "@/lib/nutrition-form";
import { sumNutrients } from "@/lib/nutrients";
import { foodDetail, type StoredFood } from "@/lib/food-presets";
import type { NutrientDetail } from "@/lib/constants";

type LoggedFood = StoredFood & {
  id: string;
  meal: string;
};

type Log = {
  notes: string | null;
  foods: LoggedFood[];
};

function foodMacros(f: StoredFood) {
  return [
    f.calories != null ? `${f.calories} kcal` : null,
    f.protein != null ? `P ${f.protein}` : null,
    f.carbs != null ? `C ${f.carbs}` : null,
    f.fat != null ? `F ${f.fat}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Read-only rendering of a day's log, shared by the athlete's past days and
// both trainer surfaces — the same job NutritionPlanView does for a plan.
//
// It can't be NutritionPlanView: that takes meals as rows with ids and a
// nested foods array, and a log is flat with the meal as a label. Grouping
// happens here, at read time, which is the trade the flat shape buys (see the
// LoggedFood comment in schema.prisma).
export function NutritionLogView({
  log,
  targets,
  detail,
}: {
  log: Log;
  // The viewer's micronutrient preference — the coach's own, when a coach is
  // reading an athlete's day.
  detail: NutrientDetail;
  targets?: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
}) {
  const totals = sumMacros([{ foods: log.foods }]);
  const hasTargets = targets
    ? Object.values(targets).some((v) => v != null)
    : false;

  // Grouped in encounter order, so the day reads in the order it was logged
  // rather than alphabetically. Foods with no meal label collect at the end
  // under a heading that says so, instead of an empty one.
  const foods = log.foods.map((f) => ({ ...f, detail: foodDetail(f) }));
  const groups = new Map<string, typeof foods>();
  for (const f of foods) {
    const key = f.meal.trim();
    const bucket = groups.get(key);
    if (bucket) bucket.push(f);
    else groups.set(key, [f]);
  }

  return (
    <div className="flex flex-col gap-5">
      {log.notes ? (
        <p className="rounded-[var(--radius-sm)] border border-line bg-card px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {log.notes}
        </p>
      ) : null}

      <NutritionTotals
        label={hasTargets ? "Logged vs target" : "Logged"}
        totals={totals}
        targets={hasTargets ? targets : null}
        nutrients={sumNutrients(foods.map((f) => f.detail))}
        detail={detail}
      />

      <div className="flex flex-col gap-4">
        {[...groups.entries()].map(([meal, mealFoods]) => {
          const mealTotals = sumMacros([{ foods: mealFoods }]);
          return (
            <Card key={meal || "__unlabelled"} className="p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-base font-semibold text-ink">
                  {meal || "Other"}
                </h3>
                <span className="metric text-xs text-ink-soft">
                  {mealTotals.calories} kcal
                </span>
              </div>
              {/* Stacked on phones for the same reason NutritionPlanView
                  stacks: side by side, the macro string is rigid and the name
                  is the only thing that can give. */}
              <ul className="mt-2 divide-y divide-line">
                {mealFoods.map((f) => (
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
