// Parses the nutrition builder into structured data, and sums food macros into
// daily totals. The builder is fully controlled and submits its meals as one
// JSON blob (field "meals"); the plan-level fields are plain named inputs.
//
// Both halves of the loop live here: the coach's plan (parseNutritionForm) and
// the athlete's day log (parseNutritionLogForm). sumMacros serves both.
import { toFoodSource, type FoodSource } from "@/lib/constants";

export type ParsedFood = {
  name: string;
  quantity: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
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
