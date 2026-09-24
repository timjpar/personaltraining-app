// Micronutrients: which ones the app knows, what a day's worth is, and the
// arithmetic for scaling and summing them. Data and pure functions only, so the
// client builder can import it as freely as the server views.
//
// Macros stay where they were — four Int columns on every food row, because
// they are the numbers a plan is written in. Everything here rides in one
// nullable JSON column beside them (Food.nutrients, LoggedFood.nutrients),
// keyed by NutrientKey. Twenty-nine more columns on two tables would be the
// honest-looking alternative and the wrong one: most rows only ever carry a
// handful of these, and a typed-in food carries none.
//
// A stored value is always the total for that row's amount, never per 100 g —
// the same snapshot contract Food.quantity documents for the macros.

export type NutrientUnit = "g" | "mg" | "µg";

// "key" is the short list most people mean by micronutrients; "all" is
// everything USDA reports for a whole food that is worth a coach's attention.
export type NutrientTier = "key" | "all";

// The three families a nutrition panel reads in. Real categories, not
// decoration: they are how a coach scans for "is this day short on minerals".
export type NutrientGroup = "fats" | "minerals" | "vitamins";

export const NUTRIENT_GROUP_LABELS: Record<NutrientGroup, string> = {
  fats: "Fibre, sugar & fats",
  minerals: "Minerals",
  vitamins: "Vitamins",
};

export type NutrientDef = {
  key: NutrientKey;
  label: string;
  unit: NutrientUnit;
  // FDA adult Daily Value (2016 label rule), in `unit`. Null where there is
  // none — total sugar and the fat breakdown have no DV to be a percentage of.
  dv: number | null;
  // A limit is something to stay under, not a target to reach. It changes how
  // a full bar reads: 100% of your fibre is good news, 100% of your sodium is
  // the ceiling.
  limit?: boolean;
  tier: NutrientTier;
  group: NutrientGroup;
  // USDA FoodData Central nutrient id, for scripts/build-food-nutrients.ts.
  usda: number;
  // Open Food Facts nutriment names, first match wins. OFF normalises every one
  // of these to grams per 100 g, so they're converted to `unit` on the way in.
  off: string[];
};

export const NUTRIENT_KEYS = [
  "fiber",
  "sugar",
  "satFat",
  "sodium",
  "cholesterol",
  "potassium",
  "calcium",
  "iron",
  "magnesium",
  "zinc",
  "vitaminA",
  "vitaminC",
  "vitaminD",
  "vitaminB12",
  "folate",
  "monoFat",
  "polyFat",
  "phosphorus",
  "copper",
  "manganese",
  "selenium",
  "vitaminE",
  "vitaminK",
  "thiamin",
  "riboflavin",
  "niacin",
  "vitaminB6",
  "choline",
  "pantothenicAcid",
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

// What one row, or one day, carries. Partial on purpose: a key that is absent
// means "not known", which is different from a measured zero.
export type Nutrients = Partial<Record<NutrientKey, number>>;

// Order is display order, grouped: fibre, sugar and the fats first, then
// minerals, then vitamins — roughly the order a nutrition facts panel reads in.
export const NUTRIENTS: NutrientDef[] = [
  { key: "fiber", label: "Fibre", unit: "g", dv: 28, tier: "key", group: "fats", usda: 1079, off: ["fiber"] },
  { key: "sugar", label: "Sugar", unit: "g", dv: null, limit: true, tier: "key", group: "fats", usda: 2000, off: ["sugars"] },
  { key: "satFat", label: "Saturated fat", unit: "g", dv: 20, limit: true, tier: "key", group: "fats", usda: 1258, off: ["saturated-fat"] },
  { key: "monoFat", label: "Monounsaturated fat", unit: "g", dv: null, tier: "all", group: "fats", usda: 1292, off: ["monounsaturated-fat"] },
  { key: "polyFat", label: "Polyunsaturated fat", unit: "g", dv: null, tier: "all", group: "fats", usda: 1293, off: ["polyunsaturated-fat"] },
  { key: "cholesterol", label: "Cholesterol", unit: "mg", dv: 300, limit: true, tier: "key", group: "fats", usda: 1253, off: ["cholesterol"] },
  { key: "sodium", label: "Sodium", unit: "mg", dv: 2300, limit: true, tier: "key", group: "minerals", usda: 1093, off: ["sodium"] },
  { key: "potassium", label: "Potassium", unit: "mg", dv: 4700, tier: "key", group: "minerals", usda: 1092, off: ["potassium"] },
  { key: "calcium", label: "Calcium", unit: "mg", dv: 1300, tier: "key", group: "minerals", usda: 1087, off: ["calcium"] },
  { key: "iron", label: "Iron", unit: "mg", dv: 18, tier: "key", group: "minerals", usda: 1089, off: ["iron"] },
  { key: "magnesium", label: "Magnesium", unit: "mg", dv: 420, tier: "key", group: "minerals", usda: 1090, off: ["magnesium"] },
  { key: "zinc", label: "Zinc", unit: "mg", dv: 11, tier: "key", group: "minerals", usda: 1095, off: ["zinc"] },
  { key: "phosphorus", label: "Phosphorus", unit: "mg", dv: 1250, tier: "all", group: "minerals", usda: 1091, off: ["phosphorus"] },
  { key: "copper", label: "Copper", unit: "mg", dv: 0.9, tier: "all", group: "minerals", usda: 1098, off: ["copper"] },
  { key: "manganese", label: "Manganese", unit: "mg", dv: 2.3, tier: "all", group: "minerals", usda: 1101, off: ["manganese"] },
  { key: "selenium", label: "Selenium", unit: "µg", dv: 55, tier: "all", group: "minerals", usda: 1103, off: ["selenium"] },
  { key: "vitaminA", label: "Vitamin A", unit: "µg", dv: 900, tier: "key", group: "vitamins", usda: 1106, off: ["vitamin-a"] },
  { key: "vitaminC", label: "Vitamin C", unit: "mg", dv: 90, tier: "key", group: "vitamins", usda: 1162, off: ["vitamin-c"] },
  { key: "vitaminD", label: "Vitamin D", unit: "µg", dv: 20, tier: "key", group: "vitamins", usda: 1114, off: ["vitamin-d"] },
  { key: "vitaminE", label: "Vitamin E", unit: "mg", dv: 15, tier: "all", group: "vitamins", usda: 1109, off: ["vitamin-e"] },
  { key: "vitaminK", label: "Vitamin K", unit: "µg", dv: 120, tier: "all", group: "vitamins", usda: 1185, off: ["vitamin-k"] },
  { key: "thiamin", label: "Thiamin (B1)", unit: "mg", dv: 1.2, tier: "all", group: "vitamins", usda: 1165, off: ["vitamin-b1"] },
  { key: "riboflavin", label: "Riboflavin (B2)", unit: "mg", dv: 1.3, tier: "all", group: "vitamins", usda: 1166, off: ["vitamin-b2"] },
  { key: "niacin", label: "Niacin (B3)", unit: "mg", dv: 16, tier: "all", group: "vitamins", usda: 1167, off: ["vitamin-pp"] },
  { key: "pantothenicAcid", label: "Pantothenic acid (B5)", unit: "mg", dv: 5, tier: "all", group: "vitamins", usda: 1170, off: ["pantothenic-acid"] },
  { key: "vitaminB6", label: "Vitamin B6", unit: "mg", dv: 1.7, tier: "all", group: "vitamins", usda: 1175, off: ["vitamin-b6"] },
  { key: "folate", label: "Folate", unit: "µg", dv: 400, tier: "key", group: "vitamins", usda: 1190, off: ["vitamin-b9", "folates"] },
  { key: "vitaminB12", label: "Vitamin B12", unit: "µg", dv: 2.4, tier: "key", group: "vitamins", usda: 1178, off: ["vitamin-b12"] },
  { key: "choline", label: "Choline", unit: "mg", dv: 550, tier: "all", group: "vitamins", usda: 1180, off: ["choline"] },
];

const BY_KEY = new Map(NUTRIENTS.map((n) => [n.key, n]));

export function nutrientDef(key: NutrientKey): NutrientDef {
  return BY_KEY.get(key)!;
}

// The nutrients a viewer has asked to see. "key" is a strict subset of "all",
// so the short list never shows something the long one would hide.
export function nutrientsForTier(tier: NutrientTier): NutrientDef[] {
  return tier === "all" ? NUTRIENTS : NUTRIENTS.filter((n) => n.tier === "key");
}

// Ceilings per unit, so a stray keypress or a hallucinated scan can't store a
// number no day of eating could produce. Generous: they exist to stop nonsense,
// not to second-guess a real figure.
const CAPS: Record<NutrientUnit, number> = { g: 2000, mg: 100_000, µg: 100_000 };

// Stored values keep two decimals: enough for a 0.05 µg vitamin D figure to
// survive, and no more precision than any source actually has.
export const roundNutrient = (n: number) => Math.round(n * 100) / 100;

// The gate for anything arriving from a form, a scan or the database's JSON
// column. Unknown keys are dropped rather than rejected — the payload came from
// our own builder, and failing a whole save over one stray field would be worse
// than losing the field.
export function parseNutrients(value: unknown): Nutrients | null {
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const out: Nutrients = {};
  for (const def of NUTRIENTS) {
    const v = (raw as Record<string, unknown>)[def.key];
    if (v == null || v === "") continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > CAPS[def.unit]) continue;
    out[def.key] = roundNutrient(n);
  }
  return Object.keys(out).length ? out : null;
}

export function hasNutrients(n: Nutrients | null | undefined): n is Nutrients {
  return !!n && Object.keys(n).length > 0;
}

// Always scaled from the base, never from an already-scaled figure — the rule
// scaleMacros follows, for the same reason.
export function scaleNutrients(
  base: Nutrients | null | undefined,
  factor: number,
): Nutrients | null {
  if (!hasNutrients(base)) return null;
  const out: Nutrients = {};
  for (const key of NUTRIENT_KEYS) {
    const v = base[key];
    if (v != null) out[key] = roundNutrient(v * factor);
  }
  return out;
}

export type NutrientTotals = {
  totals: Nutrients;
  // How many foods contributed anything, out of how many there were. A day's
  // total is only as complete as the foods it is built from, and a typed-in
  // lunch with no micronutrients must never read as a lunch with no iron in it.
  withData: number;
  foods: number;
};

export function sumNutrients(
  foods: { nutrients?: Nutrients | null }[],
): NutrientTotals {
  const totals: Nutrients = {};
  let withData = 0;
  for (const f of foods) {
    if (!hasNutrients(f.nutrients)) continue;
    withData += 1;
    for (const key of NUTRIENT_KEYS) {
      const v = f.nutrients[key];
      if (v != null) totals[key] = roundNutrient((totals[key] ?? 0) + v);
    }
  }
  return { totals, withData, foods: foods.length };
}

export function percentDV(key: NutrientKey, value: number): number | null {
  const dv = nutrientDef(key).dv;
  return dv ? Math.round((value / dv) * 100) : null;
}

// Display precision follows magnitude: "1,240 mg", "18 mg", "2.4 µg", "0.31 mg".
// Trailing zeros go, so a stored 3.00 reads as "3".
export function formatNutrientValue(value: number): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 1 : 2;
  return Number(value.toFixed(digits)).toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

export function formatNutrient(key: NutrientKey, value: number): string {
  return `${formatNutrientValue(value)} ${nutrientDef(key).unit}`;
}
