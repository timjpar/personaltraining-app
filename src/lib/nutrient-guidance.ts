// What a day's protein, carbs and fats are measured against: the published
// guideline for each, worked out for the calories that day holds and, where
// the guideline is written per kilo, the body weight of the person eating it.
//
// Minerals and vitamins read against the label's Daily Value, a fixed amount
// for a 2,000 kcal adult. Fats and sugars don't work that way. Almost every
// guideline for them is a share of calories ("saturated fat under 10% of
// energy"), so 20 g of saturated fat is a different answer at 1,800 kcal than
// at 3,000. Fibre's is set per 1,000 kcal for the same reason, and protein for
// someone who trains is set per kilo of body weight. So these rows carry the
// guideline itself, in grams for this day, with who said it.
//
// Each row still reads as a percentage, like a daily value: the share of one
// recommended amount. Where the guideline is a single figure that is easy —
// 100% is the saturated fat limit, or the fibre minimum. Where it is a range,
// 100% is the middle of the range, the same choice the FDA made for carbs (its
// 275 g daily value is 55% of 2,000 kcal, the middle of 45–65%). For protein
// that middle, 1.6 g/kg, is also the figure the meta-analyses land on. Every
// row says which kind of 100% it is, so the number is never a riddle.
//
// Sources, chosen for being the ones a dietitian would cite and agreeing with
// each other where they overlap:
//   - National Academies (US/Canada DRIs, 2005): the macronutrient ranges and
//     fibre's 14 g per 1,000 kcal.
//   - ACSM, Academy of Nutrition and Dietetics and Dietitians of Canada (2016)
//     and ISSN (2017): protein 1.2–2.0 g/kg and carbs by training load.
//   - WHO (2023 guideline on saturated and trans fats; 2015 on sugars).
//   - FAO/WHO, Fats and fatty acids in human nutrition (2010): the
//     polyunsaturated, omega-6, omega-3 and EPA+DHA ranges; EFSA (2012) on how
//     much EPA+DHA is safe.
//   - US Dietary Guidelines 2025–2030: saturated fat under 10%, and no added
//     sugar needed, at most 10 g a meal.
//   - FDA label Daily Value for cholesterol, which no current guideline sets.
// Pure data and arithmetic, so the server views and the builder share it.
import { UNITS, type Units } from "@/lib/constants";
import type { MacroTotals } from "@/lib/nutrition-form";
import type { NutrientKey } from "@/lib/nutrients";

// EPA and DHA are stored apart, as the food tables report them, but every
// guideline for them is for the two together.
export type GuidedKey = NutrientKey | "omega3EpaDha";
export type MacroKey = "protein" | "carbs" | "fat";

// Whose body a day's per-kilo figures are worked out for, and the units the
// viewer reads weights in (User.units). weightKg is null when nobody has
// weighed in, and the rows fall back to shares of calories.
export type BodyBasis = { weightKg: number | null; units: Units };

const LB_PER_KG = 2.20462262;

// A guideline's numbers. `target` is the 100% point when it isn't the middle
// of min and max (or the one end there is).
type Bounds = { min?: number; max?: number; target?: number };

type Rule =
  // A share of the day's calories, from grams at this many kcal per gram.
  | ({ basis: "energy"; kcalPerGram: number; source: string; extra?: string } & Bounds)
  // A fixed amount a day, in the nutrient's own unit.
  | ({ basis: "amount"; unit: "g" | "mg"; source: string; extra?: string } & Bounds)
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

// The National Academies' acceptable ranges, as shares of calories. Their tops
// for protein and carbs are where the other two macros get squeezed, not a
// harm, so going past them isn't drawn as a warning.
const MACRO_RULES: Record<MacroKey, Rule & { basis: "energy" }> = {
  protein: { basis: "energy", kcalPerGram: 4, min: 10, max: 35, source: "National Academies" },
  carbs: { basis: "energy", kcalPerGram: 4, min: 45, max: 65, source: "National Academies" },
  fat: { basis: "energy", kcalPerGram: 9, min: 20, max: 35, source: "National Academies" },
};
const SOFT_TOP: MacroKey[] = ["protein", "carbs"];

// Protein for someone who trains, per kilo of body weight (ACSM 2016; ISSN
// 2017). Used instead of the share of calories whenever there's a weight.
const PROTEIN_PER_KG = { min: 1.2, max: 2.0, target: 1.6, source: "ACSM, ISSN" };

// Carbs by training load, per kilo (ACSM 2016). Said, not computed: a plan
// doesn't know whether the day is light or an hour of hard training.
const CARBS_PER_KG = { light: [3, 5], hour: [5, 7] } as const;

export type Guide = {
  // The guideline in the nutrient's own unit for this day; null where it has
  // no lower or no upper end.
  low: number | null;
  high: number | null;
  // The 100% point, and the amount as a share of it.
  target: number | null;
  percent: number | null;
  // Only a ceiling: a full bar is the limit, not an achievement.
  limit: boolean;
  // Past the top is nothing to warn about (protein, carbs).
  soft: boolean;
  status: "below" | "within" | "above" | "unset";
  // What 100% is: "100% = 85 g, the middle of the recommended 20–35% of
  // calories (62–108 g)".
  text: string;
  // Where this day sits by the guideline's own measure: "31% of calories,
  // 1.2 g/kg". Null where there is nothing to add to the amount.
  yours: string | null;
  extra: string | null;
  source: string;
};

// The day's energy as protein, carbs and fat supply it (4, 4 and 9 kcal per
// gram), so the three macro shares add up to 100% and every share on the panel
// is of the same number. Falls back to the calorie total for a day of foods
// typed in with calories only.
export function energyOf(m: MacroTotals): number {
  const fromMacros = m.protein * 4 + m.carbs * 4 + m.fat * 9;
  return fromMacros > 0 ? fromMacros : Math.max(m.calories, 0);
}

export function nutrientGuide(key: GuidedKey, value: number, kcal: number): Guide | null {
  const rule = RULES[key];
  return rule ? resolve(rule, value, kcal) : null;
}

export function macroGuide(key: MacroKey, grams: number, kcal: number, body?: BodyBasis | null): Guide {
  const weightKg = body?.weightKg && body.weightKg > 0 ? body.weightKg : null;
  const units = body?.units ?? UNITS.METRIC;
  const soft = SOFT_TOP.includes(key);

  if (key === "protein" && weightKg) {
    const p = PROTEIN_PER_KG;
    const low = p.min * weightKg;
    const high = p.max * weightKg;
    const target = p.target * weightKg;
    const share = kcal > 0 ? (grams * 4 * 100) / kcal : null;
    return {
      low,
      high,
      target,
      percent: (grams / target) * 100,
      limit: false,
      soft,
      status: statusOf(grams, low, high),
      text: `100% = ${amount(target)} g, ${perWeight(p.target, units)}, the middle of the ${perWeightRange(p.min, p.max, units)} recommended for training`,
      yours: join(perWeight(grams / weightKg, units), share != null ? `${shareText(share)} of calories` : null),
      extra: null,
      source: p.source,
    };
  }

  const guide = resolve(MACRO_RULES[key], grams, kcal);
  const mine = weightKg ? perWeight(grams / weightKg, units) : null;
  const training =
    key === "carbs"
      ? `Training: ${perWeightRange(...CARBS_PER_KG.light, units)} on light days, ${perWeightRange(...CARBS_PER_KG.hour, units)} on hour-long ones (ACSM)`
      : null;
  return {
    ...guide,
    soft,
    yours: join(guide.yours, mine),
    extra: training,
  };
}

function resolve(rule: Rule, value: number, kcal: number): Guide {
  const base = { soft: false, extra: null as string | null };
  if (rule.basis === "none") {
    return {
      ...base,
      low: null,
      high: null,
      target: null,
      percent: null,
      limit: false,
      status: "unset",
      text: rule.text,
      yours: null,
      source: rule.source,
    };
  }

  if (rule.basis === "density") {
    const low = kcal > 0 ? (rule.perThousandKcal * kcal) / 1000 : null;
    return {
      ...base,
      low,
      high: null,
      target: low,
      percent: low ? (value / low) * 100 : null,
      limit: false,
      status: low == null ? "unset" : statusOf(value, low, null),
      text:
        low == null
          ? `At least ${rule.perThousandKcal} g per 1,000 kcal`
          : `100% = the ${amount(low)} g minimum, ${rule.perThousandKcal} g per 1,000 kcal`,
      yours: null,
      source: rule.source,
    };
  }

  const target = targetOf(rule);

  if (rule.basis === "amount") {
    const low = rule.min ?? null;
    const high = rule.max ?? null;
    const u = rule.unit;
    return {
      ...base,
      low,
      high,
      target,
      percent: target ? (value / target) * 100 : null,
      limit: low == null,
      status: statusOf(value, low, high),
      text:
        low != null && high != null
          ? `100% = ${amount(target!)} ${u}, the middle of the recommended ${amount(low)}–${amount(high)} ${u}`
          : low != null
            ? `100% = the ${amount(low)} ${u} minimum`
            : `100% = the ${amount(high!)} ${u} limit`,
      yours: null,
      extra: rule.extra ?? null,
      source: rule.source,
    };
  }

  // Energy: the percentages are the guideline; the grams are what they come
  // to on this day.
  const toGrams = (pct: number) => (kcal > 0 ? ((pct / 100) * kcal) / rule.kcalPerGram : null);
  const low = rule.min != null ? toGrams(rule.min) : null;
  const high = rule.max != null ? toGrams(rule.max) : null;
  const goal = target != null ? toGrams(target) : null;
  const share = kcal > 0 ? (value * rule.kcalPerGram * 100) / kcal : null;
  let text: string;
  if (goal == null) {
    text =
      rule.min != null && rule.max != null
        ? `${pct(rule.min)}–${pct(rule.max)}% of calories`
        : rule.min != null
          ? `At least ${pct(rule.min)}% of calories`
          : `Under ${pct(rule.max!)}% of calories`;
  } else if (rule.min != null && rule.max != null) {
    text = `100% = ${amount(goal)} g, the middle of the recommended ${pct(rule.min)}–${pct(rule.max)}% of calories (${amount(low!)}–${amount(high!)} g)`;
  } else if (rule.min != null) {
    text = `100% = the ${amount(goal)} g minimum, ${pct(rule.min)}% of calories`;
  } else {
    text = `100% = the ${amount(goal)} g limit, ${pct(rule.max!)}% of calories`;
  }
  return {
    ...base,
    low,
    high,
    target: goal,
    percent: goal ? (value / goal) * 100 : null,
    limit: rule.min == null,
    status: kcal > 0 ? statusOf(value, low, high) : "unset",
    text,
    yours: share != null ? `${shareText(share)} of calories` : null,
    extra: rule.extra ?? null,
    source: rule.source,
  };
}

function targetOf(rule: Bounds): number | null {
  if (rule.target != null) return rule.target;
  if (rule.min != null && rule.max != null) return (rule.min + rule.max) / 2;
  return rule.max ?? rule.min ?? null;
}

function statusOf(value: number, low: number | null, high: number | null): Guide["status"] {
  if (low != null && value < low) return "below";
  if (high != null && value > high) return "above";
  return "within";
}

function join(...parts: (string | null)[]): string | null {
  const kept = parts.filter((p): p is string => !!p);
  return kept.length ? kept.join(", ") : null;
}

// "2.4 g/kg" or "1.09 g/lb": grams per unit of body weight, in the viewer's
// units. Per pound runs a little under half per kilo, so it keeps a second
// decimal under 1.
function perWeight(gramsPerKg: number, units: Units): string {
  return units === UNITS.IMPERIAL
    ? `${ratio(gramsPerKg / LB_PER_KG)} g/lb`
    : `${ratio(gramsPerKg)} g/kg`;
}

function perWeightRange(a: number, b: number, units: Units): string {
  return units === UNITS.IMPERIAL
    ? `${ratio(a / LB_PER_KG)}–${ratio(b / LB_PER_KG)} g/lb`
    : `${ratio(a)}–${ratio(b)} g/kg`;
}

function ratio(n: number): string {
  return String(Number(n >= 1 ? n.toFixed(1) : n.toFixed(2)));
}

// Guideline amounts are round numbers people can hold in their head: "31 g",
// "1.5 g", "0.25 g", never "30.84 g".
function amount(n: number): string {
  const digits = n >= 10 ? 0 : n >= 1 ? 1 : 2;
  return Number(n.toFixed(digits)).toLocaleString("en-US", { maximumFractionDigits: digits });
}

function pct(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

// "10.6%", "0.5%", "31%": one decimal under 20%, where the fat and sugar
// limits sit and 10.6 against an 11% ceiling must not round up to it; whole
// numbers above, where the macro ranges are 10 points wide.
function shareText(share: number): string {
  return share >= 20 ? `${Math.round(share)}%` : `${Number(share.toFixed(1))}%`;
}

// A percentage of the recommended amount, read like a daily value: "150%".
export function formatPercent(percent: number): string {
  if (percent > 0 && percent < 1) return "<1%";
  return `${Math.round(percent)}%`;
}
