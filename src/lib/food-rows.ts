// The editing rules for one food row, shared by the coach's plan builder and
// the athlete's day log. They were two copies of the same handful of functions
// until rows grew units and micronutrients; now there is one set, and each form
// keeps only what's actually its own (a meal label and a source on the log).
//
// Pure: every function takes a row and returns the next one. The forms own the
// state and decide which row an edit applies to.
//
// The rules, all inherited from the servings box these replace:
//   - Scaling is always from the preset (`base`), never from the numbers on
//     screen, so 1 → 2 → 1 lands back on the exact original figures.
//   - Anything typed over a scaled number — a name, a macro, a nutrient —
//     drops the preset link and keeps the numbers. The row is the person's
//     from then on, and nothing they typed is destroyed as a side effect.
import {
  amountIn,
  inputAmount,
  parseAmount,
  parseGrams,
  type AmountUnit,
} from "@/lib/food-amounts";
import {
  matchCatalogRow,
  normalizeFoodName,
  presetUnits,
  scalePreset,
  servingsIn,
  type FoodMacros,
  type FoodPreset,
  type ScaledFood,
  type StoredFood,
} from "@/lib/food-presets";
import {
  NUTRIENT_KEYS,
  parseNutrients,
  sumNutrients,
  type NutrientKey,
  type NutrientTotals,
  type Nutrients,
} from "@/lib/nutrients";
import type { MacroTotals } from "@/lib/nutrition-form";

export type MacroKey = "calories" | "protein" | "carbs" | "fat";

// Strings, like every other box on these forms, so a half-typed "1." survives
// a render instead of snapping back to "1".
export type NutrientText = Partial<Record<NutrientKey, string>>;

export type FoodRowFields = {
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  // Saved with the row. See Food.grams in schema.prisma.
  grams: number | null;
  gramsPerCup: number | null;
  nutrients: NutrientText;
  // Client-only, never persisted. `base` is the per-serving preset the numbers
  // were scaled from; null means the row was typed by hand and the amount box
  // has nothing to scale. `amount` is free text, read in `unit`.
  amount: string;
  unit: AmountUnit;
  base: FoodPreset | null;
};

export const blankFoodFields = (): FoodRowFields => ({
  name: "",
  quantity: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  grams: null,
  gramsPerCup: null,
  nutrients: {},
  amount: "",
  unit: "serving",
  base: null,
});

const numStr = (n: number | null | undefined) => (n == null ? "" : String(n));

const macroStrings = (m: FoodMacros) => ({
  calories: String(m.calories),
  protein: String(m.protein),
  carbs: String(m.carbs),
  fat: String(m.fat),
});

export function nutrientText(n: Nutrients | null | undefined): NutrientText {
  const out: NutrientText = {};
  if (!n) return out;
  for (const key of NUTRIENT_KEYS) {
    if (n[key] != null) out[key] = String(n[key]);
  }
  return out;
}

// A saved row, as form fields. No preset link — that is rehydrateFoodFields'
// job, and only the builder wants it (see LogRowsProvider for why the log
// deliberately doesn't).
export function storedFoodFields(f: StoredFood): FoodRowFields {
  return {
    ...blankFoodFields(),
    name: f.name,
    quantity: f.quantity ?? "",
    calories: numStr(f.calories),
    protein: numStr(f.protein),
    carbs: numStr(f.carbs),
    fat: numStr(f.fat),
    grams: f.grams ?? null,
    gramsPerCup: f.gramsPerCup ?? null,
    nutrients: nutrientText(parseNutrients(f.nutrients)),
  };
}

// Equal to within rounding. The same food's numbers reach a row by two routes
// — straight from USDA per 100 g, or through a catalog serving and back — and
// each rounds to two decimals on the way, so they can disagree in the last
// place without anyone having typed anything.
function sameNutrients(a: Nutrients | null, b: Nutrients | null): boolean {
  return NUTRIENT_KEYS.every((k) => {
    const x = a?.[k] ?? 0;
    const y = b?.[k] ?? 0;
    return Math.abs(x - y) <= Math.max(0.05, 0.02 * Math.max(x, y));
  });
}

// A saved row with its preset link rebuilt, when it is still exactly a catalog
// food at some amount. Pure, so the server render and the client hydrate agree.
//
// The stored numbers have to match what the preset and amount produce — if a
// coach picked Avocado ×2 and then typed over the calories, the row is theirs,
// and reattaching the preset would let a later nudge of the amount silently
// throw that edit away. A row saved before micronutrients existed has none
// stored; that is not an edit, so it reattaches, and picks the catalog's up.
export function rehydrateFoodFields(f: StoredFood): FoodRowFields {
  const fields = storedFoodFields(f);
  const match = matchCatalogRow(f);
  if (!match) return fields;

  const stored = parseNutrients(f.nutrients);
  if (stored && !sameNutrients(stored, match.scaled.nutrients)) return fields;

  return fill(
    fields,
    match.preset,
    inputAmount(match.amount, match.unit),
    match.unit,
    match.scaled,
  );
}

function fill<T extends FoodRowFields>(
  row: T,
  base: FoodPreset,
  amount: string,
  unit: AmountUnit,
  scaled: ScaledFood,
): T {
  return {
    ...row,
    base,
    amount,
    unit,
    quantity: scaled.quantity,
    grams: scaled.grams,
    gramsPerCup: base.gramsPerCup ?? null,
    nutrients: nutrientText(scaled.nutrients),
    ...macroStrings(scaled.macros),
  };
}

function expected(row: FoodRowFields): ScaledFood | null {
  if (!row.base) return null;
  const n = parseAmount(row.amount, row.unit);
  return n == null ? null : scalePreset(row.base, n, row.unit);
}

// Picking from the catalog (or a scan, or a ticked plan food) fills the row
// with exactly one serving.
export function applyPreset<T extends FoodRowFields>(row: T, preset: FoodPreset): T {
  const scaled = scalePreset(preset, 1, "serving")!;
  return fill({ ...row, name: preset.name }, preset, "1", "serving", scaled);
}

// Keeps every number; only the scaling goes.
export function detachPreset<T extends FoodRowFields>(row: T): T {
  return { ...row, base: null, amount: "", unit: "serving" };
}

export function setAmount<T extends FoodRowFields>(row: T, raw: string): T {
  const n = parseAmount(raw, row.unit);
  // Mid-keystroke ("1." or an empty box) must not rewrite anything.
  if (!row.base || n == null) return { ...row, amount: raw };
  const scaled = scalePreset(row.base, n, row.unit);
  return scaled ? fill(row, row.base, raw, row.unit, scaled) : { ...row, amount: raw };
}

// A unit switch keeps the food the same size: one serving of blueberries
// becomes 148 g, not 1 g. The converted amount is rounded to something
// readable, and the numbers follow what the box then says.
export function setUnit<T extends FoodRowFields>(row: T, unit: AmountUnit): T {
  if (!row.base || !presetUnits(row.base).includes(unit)) return row;
  const current = parseAmount(row.amount, row.unit);
  const servings = current == null ? null : servingsIn(row.base, current, row.unit);
  if (servings == null) return { ...row, unit, amount: "" };

  const next =
    unit === "serving"
      ? servings
      : amountIn(
          {
            grams: (row.base.grams ?? 0) * servings,
            ml: null,
            gramsPerCup: row.base.gramsPerCup ?? null,
          },
          unit,
        );
  if (next == null) return row;
  const amount = inputAmount(next, unit);
  const scaled = scalePreset(row.base, Number(amount), unit);
  return scaled ? fill(row, row.base, amount, unit, scaled) : row;
}

// Renaming past the preset drops the link but keeps the numbers.
export function setName<T extends FoodRowFields>(row: T, name: string): T {
  const stillPreset =
    row.base && normalizeFoodName(name) === normalizeFoodName(row.base.name);
  return stillPreset ? { ...row, name } : detachPreset({ ...row, name });
}

// The quantity box stays free text, as it always was. Its weight is re-read
// from whatever is typed, so a row retyped as "a big handful" stops claiming
// the 148 g it used to be.
export function setQuantity<T extends FoodRowFields>(row: T, quantity: string): T {
  return { ...row, quantity, grams: parseGrams(quantity) };
}

export function setMacro<T extends FoodRowFields>(
  row: T,
  key: MacroKey,
  value: string,
): T {
  const next = { ...row, [key]: value };
  const want = expected(row);
  if (!want) return next;
  return value === String(want.macros[key]) ? next : detachPreset(next);
}

export function setNutrient<T extends FoodRowFields>(
  row: T,
  key: NutrientKey,
  value: string,
): T {
  const nutrients = { ...row.nutrients };
  if (value.trim() === "") delete nutrients[key];
  else nutrients[key] = value;
  const next = { ...row, nutrients };

  const want = expected(row)?.nutrients?.[key];
  if (!row.base) return next;
  return want != null && value === String(want) ? next : detachPreset(next);
}

// Only what the server stores. `base` is a whole preset object per row, and
// `amount`/`unit` are how the numbers were reached, not the numbers.
export function persistedFood(row: FoodRowFields) {
  return {
    name: row.name,
    quantity: row.quantity,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    grams: row.grams,
    gramsPerCup: row.gramsPerCup,
    nutrients: row.nutrients,
  };
}

const num = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function rowTotals(rows: FoodRowFields[]): {
  macros: MacroTotals;
  nutrients: NutrientTotals;
} {
  const macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const r of rows) {
    macros.calories += num(r.calories);
    macros.protein += num(r.protein);
    macros.carbs += num(r.carbs);
    macros.fat += num(r.fat);
  }
  // Blank rows are scaffolding, not foods, and mustn't count against coverage.
  const foods = rows.filter((r) => r.name.trim() !== "");
  return {
    macros,
    nutrients: sumNutrients(
      foods.map((r) => ({ nutrients: parseNutrients(r.nutrients) })),
    ),
  };
}
