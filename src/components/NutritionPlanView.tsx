import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { AmountSelect } from "@/components/AmountSelect";
import { riceOtherWeight } from "@/lib/rice";
import { FoodNutrients } from "@/components/NutrientPanel";
import { NutritionTotals } from "@/components/NutritionTotals";
import { macroText, sumMacros } from "@/lib/nutrition-form";
import { sumNutrients } from "@/lib/nutrients";
import { foodBlocks } from "@/lib/food-groups";
import { foodDetail, type FoodDetail, type StoredFood } from "@/lib/food-presets";
import type { NutrientDetail } from "@/lib/constants";

type Food = StoredFood & { id: string; groupName?: string | null };
type Meal = { id: string; name: string; foods: Food[] };
type Plan = {
  notes: string | null;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  meals: Meal[];
};

// A group sits in a box of its own inside the meal: tinted and edged in the
// accent, the builder's group box at reading size. Shared with PlanCheckoff.
export const GROUP_BOX =
  "rounded-[var(--radius-sm)] border border-jade/35 bg-jade-wash/45 px-3 pt-2.5";

// A group's name over the foods in it. Wherever the foods are listed with
// their own numbers it shows no total: on the line above the first food, a
// dish's total read as a second, wrong count for that food (the chia soak's
// 53 kcal taken for its lemon juice's 4). Only the day log's form passes
// `macros`, for while its foods are folded away. Shared with PlanCheckoff,
// which puts a tick-all checkbox in front of the name — so spans all the way
// down, since there it sits inside a <label> — and with the day log's form
// and view.
//
// Side by side only when the box itself is wide, not the screen: beside the
// log, the plan is a narrow column on a wide screen, and a viewport breakpoint
// put the rigid macro string next to the name there and cut it to "YOGURT B…".
// Wide means room for the macros spelled out, which take a good 330px.
// The name wraps rather than truncating, since it's the part being looked for.
export function FoodGroupHeading({
  name,
  macros,
  children,
}: {
  name: string;
  macros?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <span className="@container block">
      <span className="flex flex-col gap-0.5 @xl:flex-row @xl:items-center @xl:gap-3">
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          {children}
          <span className="eyebrow min-w-0 break-words text-jade-strong">{name}</span>
        </span>
        {macros ? (
          <span
            className={
              children
                ? "metric shrink-0 pl-[1.625rem] text-xs text-ink-soft @xl:pl-0"
                : "metric shrink-0 text-xs text-ink-soft"
            }
          >
            {macros}
          </span>
        ) : null}
      </span>
    </span>
  );
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

  const foodItem = (f: Food & { detail: FoodDetail }) => (
    <li key={f.id} className="@container py-2">
      <div className="flex flex-col gap-0.5 @2xl:flex-row @2xl:items-center @2xl:gap-3">
        <p className="min-w-0 flex-1 text-sm text-ink @2xl:truncate">
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
              {riceOtherWeight(f) ? ` · ${riceOtherWeight(f)}` : null}
            </span>
          ) : null}
        </p>
        <span className="metric shrink-0 text-xs text-ink-soft">
          {macroText(f)}
        </span>
      </div>
      <FoodNutrients
        nutrients={f.detail.nutrients}
        detail={detail}
        className="mt-1"
      />
    </li>
  );

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
        nutrients={sumNutrients(allFoods.map((f) => ({ name: f.name, ...f.detail })))}
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
                {/* Not for a meal of one food, whose total is that food's
                    own line again. */}
                {meal.foods.length > 1 ? (
                  <span className="metric text-xs text-ink-soft">
                    {mealTotals.calories} kcal
                  </span>
                ) : null}
              </div>
              {/* Rows stack unless the row is wide. Side by side, the macro
                  string is rigid and the name is the only thing that can
                  give, so real foods came out as "Chicken brea…" — and the
                  name is the part you're scanning for. */}
              <ul className="mt-2 divide-y divide-line">
                {foodBlocks(meal.foods, (f) => f.groupName).map((block) =>
                  block.group ? (
                    <li key={`g-${block.foods[0].id}`} className="py-2">
                      <div className={GROUP_BOX}>
                        <FoodGroupHeading
                          name={block.group}
                        />
                        <ul className="mt-1 divide-y divide-line">
                          {block.foods.map(foodItem)}
                        </ul>
                      </div>
                    </li>
                  ) : (
                    foodItem(block.foods[0])
                  ),
                )}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
