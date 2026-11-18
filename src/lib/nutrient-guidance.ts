// What a day's protein, carbs and fats are measured against: the published
// guideline for each, worked out for the calories that day actually holds.
//
// Minerals and vitamins read against the label's Daily Value, a fixed amount
// for a 2,000 kcal adult. Fats and sugars don't work that way. Almost every
// guideline for them is a share of calories ("saturated fat under 10% of
// energy"), so 20 g of saturated fat is a different answer at 1,800 kcal than
// at 3,000, and a label's 20 g DV says nothing about either. Fibre's is set
// per 1,000 kcal for the same reason. So these rows carry the guideline itself,
// in grams for this day, with who said it, rather than a percentage of a DV
// that was never meant for them.
//
// Sources, chosen for being the ones a dietitian would cite and agreeing with
// each other where they overlap:
//   - National Academies (US/Canada DRIs, 2005): the macronutrient ranges and
//     fibre's 14 g per 1,000 kcal.
//   - WHO (2023 guideline on saturated and trans fats; 2015 on sugars).
//   - FAO/WHO, Fats and fatty acids in human nutrition (2010): the
//     polyunsaturated, omega-6, omega-3 and EPA+DHA ranges.
//   - US Dietary Guidelines 2025–2030: saturated fat under 10%, and no added
//     sugar needed, at most 10 g a meal.
//   - FDA label Daily Value for cholesterol, which no current guideline sets.
// Pure data and arithmetic, so the server views and the builder share it.
import type { MacroTotals } from "@/lib/nutrition-form";
import type { NutrientKey } from "@/lib/nutrients";

// EPA and DHA are stored apart, as the food tables report them, but every
// guideline for them is for the two together.
export type GuidedKey = NutrientKey | "omega3EpaDha";
export type MacroKey = "protein" | "carbs" | "fat";

type Rule =
  // A share of the day's calories, from grams at this many kcal per gram.
  | { basis: "energy"; kcalPerGram: number; min?: number; max?: number; source: string; extra?: string }
  // A fixed amount a day, in the nutrient's own unit.
  | { basis: "amount"; unit: "g" | "mg"; min?: number; max?: number; source: string; extra?: string }
  // At least this many grams per 1,000 kcal eaten.
  | { basis: "density"; perThousandKcal: number; source: string }
  // Nothing to aim at, said so rather than left blank.
  | { basis: "none"; text: string; source: string };

const FAT = 9;
const CARB = 4;

const RULES: Partial<Record<GuidedKey, Rule>> = {
  fiber: { basis: "density", perThousandKcal: 14, source: "National Academies" },
  sugar: {
    basis: "none",
    text: "No limit on the sugar in whole fruit, vegetables and milk",
    source: "WHO",
  },
  addedSugar: {
    basis: "energy",
    kcalPerGram: CARB,
    max: 10,
    source: "WHO",
    extra: "US guidelines: none needed, at most 10 g a meal",
  },
  satFat: { basis: "energy", kcalPerGram: FAT, max: 10, source: "WHO, US guidelines" },
  transFat: { basis: "energy", kcalPerGram: FAT, max: 1, source: "WHO" },
  monoFat: {
    basis: "none",
    text: "No set amount: the rest of your fat, once the others are in range",
    source: "FAO/WHO",
  },
  polyFat: { basis: "energy", kcalPerGram: FAT, min: 6, max: 11, source: "FAO/WHO" },
  omega6La: { basis: "energy", kcalPerGram: FAT, min: 2.5, max: 9, source: "FAO/WHO" },
  omega3Ala: { basis: "energy", kcalPerGram: FAT, min: 0.5, source: "FAO/WHO" },
  // FAO/WHO's range tops out at 2 g, but EFSA found no safety concern up to
  // 5 g a day, so the top end is said rather than drawn as a limit to break.
  omega3EpaDha: {
    basis: "amount",
    unit: "g",
    min: 0.25,
    source: "EFSA, FAO/WHO",
    extra: "Up to 5 g a day is safe (EFSA)",
  },
  cholesterol: { basis: "amount", unit: "mg", max: 300, source: "FDA daily value" },
};

// The National Academies' acceptable ranges, as shares of calories. Someone
// who trains is better served by grams per kilo of body weight, which is how
// the sports-nutrition position stand (ACSM, Academy of Nutrition and
// Dietetics, Dietitians of Canada, 2016) writes protein and carbs; a plan has
// no body weight to work that out from, so it is said rather than computed.
const MACRO_RULES: Record<MacroKey, Rule> = {
  protein: {
    basis: "energy",
    kcalPerGram: 4,
    min: 10,
    max: 35,
    source: "National Academies",
    extra: "Training: 1.2–2.0 g per kg of body weight (ACSM)",
  },
  carbs: {
    basis: "energy",
    kcalPerGram: 4,
    min: 45,
    max: 65,
    source: "National Academies",
    extra: "Training: 3–5 g per kg on light days, 5–7 g on hour-long ones (ACSM)",
  },
  fat: { basis: "energy", kcalPerGram: 9, min: 20, max: 35, source: "National Academies" },
};

export type Guide = {
  // The guideline in the nutrient's own unit for this day; null where it has
  // no lower or no upper end.
  low: number | null;
  high: number | null;
  // Only a ceiling: a full bar is the limit, not an achievement.
  limit: boolean;
  // The value as a share of the day's calories, where the guideline is one.
  share: number | null;
  status: "below" | "within" | "above" | "unset";
  // "6–11% of calories: 19–34 g".
  text: string;
  source: string;
};

// The day's energy as protein, carbs and fat supply it (4, 4 and 9 kcal per
// gram), so the three shares add up to 100% and every share on the panel is
// of the same number. Falls back to the calorie total for a day of foods typed
// in with calories only.
export function energyOf(m: MacroTotals): number {
  const fromMacros = m.protein * 4 + m.carbs * 4 + m.fat * 9;
  return fromMacros > 0 ? fromMacros : Math.max(m.calories, 0);
}

export function hasGuide(key: GuidedKey): boolean {
  return key in RULES;
}

export function nutrientGuide(key: GuidedKey, value: number, kcal: number): Guide | null {
  const rule = RULES[key];
  return rule ? resolve(rule, value, kcal) : null;
}

export function macroGuide(key: MacroKey, grams: number, kcal: number): Guide {
  return resolve(MACRO_RULES[key], grams, kcal);
}

function resolve(rule: Rule, value: number, kcal: number): Guide {
  if (rule.basis === "none") {
    return { low: null, high: null, limit: false, share: null, status: "unset", text: rule.text, source: rule.source };
  }

  if (rule.basis === "density") {
    const low = kcal > 0 ? (rule.perThousandKcal * kcal) / 1000 : null;
    const text =
      low == null
        ? `At least ${rule.perThousandKcal} g per 1,000 kcal`
        : `At least ${rule.perThousandKcal} g per 1,000 kcal: ${amount(low)} g`;
    return { low, high: null, limit: false, share: null, status: statusOf(value, low, null), text, source: rule.source };
  }

  if (rule.basis === "amount") {
    const low = rule.min ?? null;
    const high = rule.max ?? null;
    const u = rule.unit;
    const text =
      low != null && high != null
        ? `${amount(low)}–${amount(high)} ${u} a day`
        : low != null
          ? `At least ${amount(low)} ${u} a day`
          : `Under ${amount(high!)} ${u} a day`;
    return {
      low,
      high,
      limit: low == null,
      share: null,
      status: statusOf(value, low, high),
      text: withExtra(text, rule.extra),
      source: rule.source,
    };
  }

  // Energy: the percentages are the guideline; the grams are what they come
  // to on this day.
  const toGrams = (pct: number) => (kcal > 0 ? (pct / 100) * kcal / rule.kcalPerGram : null);
  const low = rule.min != null ? toGrams(rule.min) : null;
  const high = rule.max != null ? toGrams(rule.max) : null;
  const share = kcal > 0 ? (value * rule.kcalPerGram * 100) / kcal : null;
  const pcts =
    rule.min != null && rule.max != null
      ? `${pct(rule.min)}–${pct(rule.max)}% of calories`
      : rule.min != null
        ? `At least ${pct(rule.min)}% of calories`
        : `Under ${pct(rule.max!)}% of calories`;
  const grams =
    low != null && high != null
      ? `${amount(low)}–${amount(high)} g`
      : low != null
        ? `${amount(low)} g`
        : high != null
          ? `${amount(high)} g`
          : null;
  return {
    low,
    high,
    limit: rule.min == null,
    share,
    status: kcal > 0 ? statusOf(value, low, high) : "unset",
    text: withExtra(grams ? `${pcts}: ${grams}` : pcts, rule.extra),
    source: rule.source,
  };
}

function statusOf(value: number, low: number | null, high: number | null): Guide["status"] {
  if (low != null && value < low) return "below";
  if (high != null && value > high) return "above";
  return "within";
}

function withExtra(text: string, extra?: string): string {
  return extra ? `${text}. ${extra}` : text;
}

// Guideline amounts are round numbers people can hold in their head: "31 g",
// "1.5 g", "0.25 g", never "30.84 g".
function amount(n: number): string {
  const digits = n >= 10 ? 0 : n >= 1 ? 1 : 2;
  return Number(n.toFixed(digits)).toLocaleString("en-US", { maximumFractionDigits: digits });
}

function pct(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// "10.6%", "0.5%", "31%": one decimal under 20%, where the fat and sugar
// limits sit and 10.6 against an 11% ceiling must not round up to it; whole
// numbers above, where the macro ranges are 10 points wide.
export function formatShare(share: number): string {
  return share >= 20 ? `${Math.round(share)}%` : `${Number(share.toFixed(1))}%`;
}
