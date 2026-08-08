import { Card } from "@/components/ui";
import { MacroBar } from "@/components/MacroBar";
import { sumMacros } from "@/lib/nutrition-form";

type LoggedFood = {
  id: string;
  meal: string;
  name: string;
  quantity: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type Log = {
  notes: string | null;
  foods: LoggedFood[];
};

function foodMacros(f: LoggedFood) {
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
}: {
  log: Log;
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
  const groups = new Map<string, LoggedFood[]>();
  for (const f of log.foods) {
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

      <div>
        <p className="eyebrow mb-2 text-ink-soft">
          {hasTargets ? "Logged vs target" : "Logged"}
        </p>
        <MacroBar totals={totals} targets={hasTargets ? targets : null} />
      </div>

      <div className="flex flex-col gap-4">
        {[...groups.entries()].map(([meal, foods]) => {
          const mealTotals = sumMacros([{ foods }]);
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
                {foods.map((f) => (
                  <li
                    key={f.id}
                    className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <p className="min-w-0 flex-1 text-sm text-ink sm:truncate">
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
