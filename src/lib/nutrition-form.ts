// Parses the nutrition builder into structured data, and sums food macros into
// daily totals. The builder is fully controlled and submits its meals as one
// JSON blob (field "meals"); the plan-level fields are plain named inputs.
//
// Both halves of the loop live here: the coach's plan (parseNutritionForm) and
// the athlete's day log (parseNutritionLogForm). sumMacros serves both.
import { toFoodSource, type FoodSource } from "@/lib/constants";
import { roundGrams } from "@/lib/food-amounts";
import { groupLabel } from "@/lib/food-groups";
import { parseNutrients, type Nutrients } from "@/lib/nutrients";

// The state every day-log action returns. It lives here rather than beside one
// role's actions for the reason BodyState gives in body-form.ts: two actions
// now return it — the athlete's saveNutritionLog and the coach's own
// saveMyNutritionLog — and the one form both render has no business importing a
// type out of either route group.
export type LogState = { error?: string; ok?: string };

export type ParsedFood = {
  name: string;
  quantity: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  grams: number | null;
  gramsPerCup: number | null;
  nutrients: Nutrients | null;
  // See Food.groupName. A day log carries one too, ticked off the plan with
  // its foods — see LoggedFood.groupName.
  groupName: string | null;
  order: number;
};

export type ParsedMeal = {
  name: string;
  order: number;
  foods: ParsedFood[];
};

export type ParsedPlan = {
  title: string;
  notes: string | null;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  meals: ParsedMeal[];
};

function intOrNull(value: unknown): number | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Math.trunc(Number(s));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// A weight or a density from the builder: positive, finite, and capped, the
// same gate intOrNull is for the macros — with two decimals kept, because ⅛
// tsp of salt is 0.75 g and 0 g of anything isn't an amount.
function measureOrNull(value: unknown, max: number): number | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n <= max ? roundGrams(n) : null;
}

// The three fields every food row carries beyond its macros, parsed the same
// way for a plan and a day.
function measures(food: Record<string, unknown>) {
  return {
    grams: measureOrNull(food?.grams, 10_000),
    gramsPerCup: measureOrNull(food?.gramsPerCup, 2_000),
    nutrients: parseNutrients(food?.nutrients),
  };
}

export function parseNutritionForm(
  formData: FormData,
): { data?: ParsedPlan; error?: string } {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Give the plan a title." };

  const notes = String(formData.get("notes") ?? "").trim() || null;

  let raw: unknown = [];
  try {
    raw = JSON.parse(String(formData.get("meals") ?? "[]"));
  } catch {
    raw = [];
  }

  const meals: ParsedMeal[] = [];
  if (Array.isArray(raw)) {
    for (const m of raw) {
      const foodsRaw = Array.isArray(
        (m as { foods?: unknown })?.foods,
      )
        ? ((m as { foods: unknown[] }).foods)
        : [];

      const foods: ParsedFood[] = [];
      for (const f of foodsRaw) {
        const food = f as Record<string, unknown>;
        const name = String(food?.name ?? "").trim();
        if (!name) continue; // drop empty food rows
        foods.push({
          name,
          quantity: String(food?.quantity ?? "").trim() || null,
          calories: intOrNull(food?.calories),
          protein: intOrNull(food?.protein),
          carbs: intOrNull(food?.carbs),
          fat: intOrNull(food?.fat),
          ...measures(food),
          groupName: groupLabel(food?.groupName),
          order: foods.length + 1,
        });
      }
      if (foods.length === 0) continue; // drop meals with no foods

      const mealName =
        String((m as { name?: unknown })?.name ?? "").trim() ||
        `Meal ${meals.length + 1}`;
      meals.push({ name: mealName, order: meals.length + 1, foods });
    }
  }

  if (meals.length === 0) {
    return { error: "Add at least one food to a meal." };
  }

  return {
    data: {
      title,
      notes,
      targetCalories: intOrNull(formData.get("targetCalories")),
      targetProtein: intOrNull(formData.get("targetProtein")),
      targetCarbs: intOrNull(formData.get("targetCarbs")),
      targetFat: intOrNull(formData.get("targetFat")),
      meals,
    },
  };
}

// The client's day log. Same job as parseNutritionForm above and the same
// serialization contract — one hidden JSON field — but the shape is flat: a
// day is a list of foods carrying a meal label, not a list of meals carrying
// foods. See the LoggedFood comment in schema.prisma for why.
export type ParsedLogEntry = {
  meal: string;
  name: string;
  quantity: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  grams: number | null;
  gramsPerCup: number | null;
  nutrients: Nutrients | null;
  groupName: string | null;
  source: FoodSource;
  order: number;
};

export type ParsedLog = {
  notes: string | null;
  entries: ParsedLogEntry[];
};

export function parseNutritionLogForm(
  formData: FormData,
): { data?: ParsedLog; error?: string } {
  let raw: unknown = [];
  try {
    raw = JSON.parse(String(formData.get("entries") ?? "[]"));
  } catch {
    raw = [];
  }

  const entries: ParsedLogEntry[] = [];
  if (Array.isArray(raw)) {
    for (const e of raw) {
      const entry = e as Record<string, unknown>;
      const name = String(entry?.name ?? "").trim();
      if (!name) continue; // drop empty rows, exactly as the plan parser does
      entries.push({
        // Trimmed to a sane length: it's a label the athlete types freely and
        // it ends up in a digest email and a coach's feed.
        meal: String(entry?.meal ?? "").trim().slice(0, 40),
        name,
        quantity: String(entry?.quantity ?? "").trim() || null,
        calories: intOrNull(entry?.calories),
        protein: intOrNull(entry?.protein),
        carbs: intOrNull(entry?.carbs),
        fat: intOrNull(entry?.fat),
        ...measures(entry),
        groupName: groupLabel(entry?.groupName),
        source: toFoodSource(entry?.source),
        order: entries.length + 1,
      });
    }
  }

  // An empty log is a legitimate thing to save: it's how an athlete clears a
  // day they logged by mistake. The action deletes the row rather than storing
  // an empty one, so there's nothing to reject here.
  return {
    data: {
      notes: String(formData.get("notes") ?? "").trim() || null,
      entries,
    },
  };
}

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function sumMacros(
  meals: {
    foods: {
      calories: number | null;
      protein: number | null;
      carbs: number | null;
      fat: number | null;
    }[];
  }[],
): MacroTotals {
  const totals: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const meal of meals) {
    for (const food of meal.foods) {
      totals.calories += food.calories ?? 0;
      totals.protein += food.protein ?? 0;
      totals.carbs += food.carbs ?? 0;
      totals.fat += food.fat ?? 0;
    }
  }
  return totals;
}

// Macros as one line of text, every figure named: "200 kcal · 16 g protein ·
// 7 g carbs · 12 g fat". It used to be "P 16 · C 7 · F 12", which only meant
// something to whoever built it. A null figure is left out rather than shown
// as 0. Non-breaking inside each figure, so a narrow column wraps between them
// and never leaves "fat" on a line without its number.
export function macroText(m: {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}): string {
  return [
    m.calories != null ? `${m.calories} kcal` : null,
    m.protein != null ? `${m.protein} g protein` : null,
    m.carbs != null ? `${m.carbs} g carbs` : null,
    m.fat != null ? `${m.fat} g fat` : null,
  ]
    .filter((part): part is string => part != null)
    .map((part) => part.replace(/ /g, " "))
    .join(" · ");
}
