// What a trend chart is allowed to plot, and how each line identifies itself.
//
// Pure — no React, no Prisma, no formatting beyond a unit string — for the same
// reason units.ts and body.ts are: TrendChart is a client component, so
// everything it reaches for has to survive the boundary. It also means the
// fourteen definitions below can be read in one sitting without standing
// anything up.
//
// The registry is generic over its row and its context rather than hardcoded to
// Measurement, because the same chart draws the coach's macros. A registry holds
// *functions*, which don't serialize, so it can never arrive as a prop from a
// server page — each domain gets a thin client wrapper that imports its own
// (BodyTrend, NutritionTrend). That indirection is the mechanism, not ceremony.
import { TAPE_SITES, UNITS, type TapeSite, type Units } from "@/lib/constants";
import { bmi } from "@/lib/body";
import { formatDate, formatDateShort } from "@/lib/format";
import { inFromCm, lbFromKg, lengthUnit, massUnit } from "@/lib/units";

// The eight series colours, as literal strings.
//
// Literal, and that is the whole point: Tailwind v4 only emits a @theme
// variable when its scanner finds the token spelled out in source. Building
// these as `var(--color-series-${slot})` would leave the scanner nothing to
// find and the dark values would be tree-shaken out of the build, while light
// kept working — globals.css declares the light set as hand-written CSS. The
// `@theme static` block there is the belt; this array is the braces.
//
// They reach the SVG as an inline `color` on a <g>, with currentColor on the
// children — see TrendChart. One property drives the line, its dots and its
// legend key, and no class name is ever constructed at runtime.
export const SERIES_INK = [
  "var(--color-series-1)",
  "var(--color-series-2)",
  "var(--color-series-3)",
  "var(--color-series-4)",
  "var(--color-series-5)",
  "var(--color-series-6)",
  "var(--color-series-7)",
  "var(--color-series-8)",
] as const;

export type SeriesSlot = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// The dash for slots drawn a second time. Fourteen metrics against eight hues,
// so hue alone can't carry identity — dash is the second channel. It is spoken
// for by that job and nothing else: dashing a bridged gap as well would give
// one channel two meanings, which is the exact confusion this is here to avoid.
export const SERIES_DASH = "6 4";

// The unit a metric is measured in, and the thing the axis rule keys off:
// every visible series in one family gets a real axis in that unit, a mix gets
// percent change. Families rather than per-metric unit strings so that
// "are these comparable?" has one answer instead of fourteen.
export type MetricFamily = {
  key: string;
  // Canonical (kg, cm, …) to whatever the reader is looking at. UNROUNDED, and
  // deliberately: this feeds geometry, not text. units.ts stays the only place
  // that rounds, because rounding is a write-path hazard and nothing here
  // writes anything back.
  toDisplay: (canonical: number, units: Units) => number;
  unit: (units: Units) => string;
  // Ticks, tooltip and table. A waist-to-hip ratio needs two places where a
  // bodyweight needs one and a calorie count needs none.
  decimals: number;
  // How wide to open the window when every reading in range is identical. In
  // display units, and per-family because ±1 is a sensible window around a
  // kilo and a nonsense one around a ratio of 0.85.
  flatPad: number;
};

const identity = (n: number) => n;

export const FAMILIES = {
  mass: {
    key: "mass",
    toDisplay: (kg, units) => (units === UNITS.IMPERIAL ? lbFromKg(kg) : kg),
    unit: massUnit,
    decimals: 1,
    flatPad: 1,
  },
  length: {
    key: "length",
    toDisplay: (cm, units) => (units === UNITS.IMPERIAL ? inFromCm(cm) : cm),
    unit: lengthUnit,
    decimals: 1,
    flatPad: 1,
  },
  percent: {
    key: "percent",
    toDisplay: identity,
    unit: () => "%",
    decimals: 1,
    flatPad: 1,
  },
  // BMI is kept apart from the two waist ratios rather than lumped in as
  // "unitless". It lives on 18–35 where they live on 0.4–1.0, so sharing an
  // axis would flatten whichever one wasn't BMI into a straight line.
  index: {
    key: "index",
    toDisplay: identity,
    unit: () => "",
    decimals: 1,
    flatPad: 1,
  },
  ratio: {
    key: "ratio",
    toDisplay: identity,
    unit: () => "",
    decimals: 2,
    flatPad: 0.05,
  },
  energy: {
    key: "energy",
    toDisplay: identity,
    unit: () => "kcal",
    decimals: 0,
    flatPad: 100,
  },
  grams: {
    key: "grams",
    toDisplay: identity,
    unit: () => "g",
    decimals: 0,
    flatPad: 10,
  },
} as const satisfies Record<string, MetricFamily>;

export type Metric<Row, Ctx> = {
  // Stable across releases — this is what localStorage holds, so renaming one
  // silently drops it out of everybody's saved selection.
  key: string;
  label: string;
  family: MetricFamily;
  // Identity, hardcoded. Never computed from position in a filtered list:
  // turning a line off must not repaint the ones left behind.
  slot: SeriesSlot;
  dashed: boolean;
  // On screen without asking. Fourteen chips is a wall — most of them greyed
  // on a new file — and the wall is the first thing anyone sees on the page.
  // The few that answer "how is this going" lead; the rest are a click away.
  // A selected metric is always shown regardless, or a line could be drawn
  // with no way to see it was on.
  primary?: boolean;
  // Canonical units, or null when this row can't produce it.
  value: (row: Row, ctx: Ctx) => number | null;
  // Why this metric can't work for this reader *at all*, in prose — a missing
  // profile field they can go and fix. Distinct from having no points yet,
  // which is a reading nobody has taken; the chip says something different for
  // each because the reader does something different about each.
  blocked?: (ctx: Ctx) => string | null;
  // Shown when the metric is fine in principle but has nothing to plot. Only
  // worth setting where the generic "not logged" would be unhelpful — and kept
  // to two or three words, because this is rendered inside the chip and a
  // sentence there triples its width. Fourteen chips, mostly unavailable, is
  // the normal state for a new athlete.
  emptyHint?: string;
  // A flat line at a fixed value — goal weight, calorie target. Drawn in
  // absolute mode only, because a goal has no meaning on a percent-change
  // axis, and folded into the domain or it clips off the top of the chart.
  reference?: (ctx: Ctx) => number | null;
};

// Every row a chart plots carries its x position and its own labels. The dates
// are formatted on the server and travel as strings: Measurement.date is
// local-midnight in the *server's* zone, and re-formatting it in the browser's
// zone shifts it a day, which lands as a hydration mismatch on every tick.
export type TrendRow = {
  t: number; // epoch ms — the x scale, and nothing else
  label: string; // "Mon, Aug 10" — tooltip and table
  short: string; // "Aug 10"      — axis tick
};

/* ---- Body ---------------------------------------------------------------- */

export type BodyRow = TrendRow & {
  weightKg: number | null;
  bodyFatPct: number | null;
} & { [K in TapeSite]: number | null };

// Measurement rows into chart rows. Structural rather than typed against
// Prisma's Measurement so this module stays free of the client, and so a page
// can `select` a narrower row without the type fighting it.
//
// Called on the server, in all three body pages, which is the point: the dates
// are formatted here and travel as strings. Measurement.date is local-midnight
// in the server's zone, and handing the Date over for the browser to format
// shifts it by the reader's offset — a silent off-by-one-day on the axis, and a
// hydration mismatch on top.
export function toBodyRows(
  measurements: ({
    date: Date;
    weightKg: number | null;
    bodyFatPct: number | null;
  } & { [K in TapeSite]: number | null })[],
): BodyRow[] {
  return measurements.map((m) => ({
    t: m.date.getTime(),
    label: formatDate(m.date),
    short: formatDateShort(m.date),
    weightKg: m.weightKg,
    bodyFatPct: m.bodyFatPct,
    neckCm: m.neckCm,
    chestCm: m.chestCm,
    waistCm: m.waistCm,
    hipsCm: m.hipsCm,
    thighCm: m.thighCm,
    armCm: m.armCm,
    calfCm: m.calfCm,
  }));
}

export type BodyCtx = {
  heightCm: number | null;
  goalWeightKg: number | null;
  // "your" on your own page, "their" when a coach is reading a client's, so a
  // blocked chip reads as a sentence either way. Same trick body.ts plays.
  possessive: string;
};

// Which hue each tape site gets. A lookup rather than inline definitions so the
// sites themselves still come from TAPE_SITES — constants.ts keeps that as one
// list precisely so a site can't appear in the form and vanish somewhere else,
// and a chart is somewhere else.
const TAPE_INK: Record<TapeSite, { slot: SeriesSlot; dashed: boolean }> = {
  neckCm: { slot: 3, dashed: true },
  chestCm: { slot: 5, dashed: false },
  waistCm: { slot: 4, dashed: false },
  hipsCm: { slot: 6, dashed: false },
  thighCm: { slot: 7, dashed: false },
  armCm: { slot: 2, dashed: true },
  calfCm: { slot: 5, dashed: true },
};

const needsHeight = (ctx: BodyCtx) =>
  ctx.heightCm == null ? `needs ${ctx.possessive} height` : null;

// Order here is chip order: the three figures that answer "is this fat or
// muscle" first, then the tape in the order the form asks for it, then the
// derived indices last. Colour assignment is independent of this order — see
// Metric.slot.
export const BODY_METRICS: Metric<BodyRow, BodyCtx>[] = [
  {
    key: "weight",
    primary: true,
    label: "Weight",
    family: FAMILIES.mass,
    slot: 0,
    dashed: false,
    value: (r) => r.weightKg,
    reference: (ctx) => ctx.goalWeightKg,
  },
  {
    key: "bodyFat",
    primary: true,
    label: "Body fat %",
    family: FAMILIES.percent,
    slot: 1,
    dashed: false,
    value: (r) => r.bodyFatPct,
  },
  {
    key: "lean",
    primary: true,
    label: "Lean mass",
    family: FAMILIES.mass,
    slot: 2,
    dashed: false,
    // Both figures, same day. A weight from Tuesday against a caliper reading
    // from Friday is a number nobody measured.
    value: (r) =>
      r.weightKg != null && r.bodyFatPct != null
        ? r.weightKg * (1 - r.bodyFatPct / 100)
        : null,
    emptyHint: "needs body fat %",
  },
  {
    key: "fatMass",
    primary: true,
    label: "Fat mass",
    family: FAMILIES.mass,
    slot: 3,
    dashed: false,
    value: (r) =>
      r.weightKg != null && r.bodyFatPct != null
        ? (r.weightKg * r.bodyFatPct) / 100
        : null,
    emptyHint: "needs body fat %",
  },
  ...TAPE_SITES.map(
    (site): Metric<BodyRow, BodyCtx> => ({
      key: site.key.replace(/Cm$/, ""),
      label: site.label,
      family: FAMILIES.length,
      slot: TAPE_INK[site.key].slot,
      dashed: TAPE_INK[site.key].dashed,
      value: (r) => r[site.key],
    }),
  ),
  {
    key: "bmi",
    label: "BMI",
    family: FAMILIES.index,
    slot: 0,
    dashed: true,
    value: (r, ctx) =>
      r.weightKg != null && ctx.heightCm != null
        ? bmi(r.weightKg, ctx.heightCm)
        : null,
    blocked: needsHeight,
  },
  {
    key: "waistHip",
    label: "Waist-to-hip",
    family: FAMILIES.ratio,
    slot: 6,
    dashed: true,
    value: (r) =>
      r.waistCm != null && r.hipsCm != null && r.hipsCm !== 0
        ? r.waistCm / r.hipsCm
        : null,
    emptyHint: "needs hips",
  },
  {
    key: "waistHeight",
    label: "Waist-to-height",
    family: FAMILIES.ratio,
    slot: 4,
    dashed: true,
    value: (r, ctx) =>
      r.waistCm != null && ctx.heightCm != null && ctx.heightCm !== 0
        ? r.waistCm / ctx.heightCm
        : null,
    blocked: needsHeight,
  },
];

/* ---- Nutrition ----------------------------------------------------------- */

export type NutritionRow = TrendRow & {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionCtx = {
  targets: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
};

// Note what falls out of the family rule here: the three macros share `grams`,
// so picking them gives a real gram axis, and adding calories mixes families
// and flips the chart to percent change. That is the correct answer — grams of
// protein and kilocalories have no shared scale — and it is the case that
// proves the family design rather than an edge of it.
export const NUTRITION_METRICS: Metric<NutritionRow, NutritionCtx>[] = [
  {
    key: "calories",
    primary: true,
    label: "Calories",
    family: FAMILIES.energy,
    slot: 0,
    dashed: false,
    value: (r) => r.calories,
    reference: (ctx) => ctx.targets?.calories ?? null,
  },
  {
    key: "protein",
    primary: true,
    label: "Protein",
    family: FAMILIES.grams,
    slot: 2,
    dashed: false,
    value: (r) => r.protein,
    reference: (ctx) => ctx.targets?.protein ?? null,
  },
  {
    key: "carbs",
    primary: true,
    label: "Carbs",
    family: FAMILIES.grams,
    slot: 3,
    dashed: false,
    value: (r) => r.carbs,
    reference: (ctx) => ctx.targets?.carbs ?? null,
  },
  {
    key: "fat",
    primary: true,
    label: "Fat",
    family: FAMILIES.grams,
    slot: 1,
    dashed: false,
    value: (r) => r.fat,
    reference: (ctx) => ctx.targets?.fat ?? null,
  },
];
