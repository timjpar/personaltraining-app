// Parses the nutrition builder into structured data, and sums food macros into
// daily totals. The builder is fully controlled and submits its meals as one
// JSON blob (field "meals"); the plan-level fields are plain named inputs.

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
