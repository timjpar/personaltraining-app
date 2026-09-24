// Amounts of food: grams, ounces, cups and spoons, and moving between them.
// Pure, like units.ts beside it, so the builder, the log and the read-only
// views all do the same arithmetic. Nothing here knows about the catalog —
// scaling a preset lives in food-presets.ts, which imports this, not the other
// way round.
//
// The one fact everything hangs on: weight and volume only convert through a
// density, and a density belongs to a food. A cup of oats is 81 g and a cup of
// spinach is 30 g, so "cups" is only ever offered for a food whose grams per
// cup is actually known (from USDA, or from a serving written as
// "1 cup (148 g)"). Mass-to-mass and volume-to-volume need nothing, and those
// are always exact.

export const AMOUNT_UNITS = ["serving", "g", "oz", "cup", "tbsp", "tsp", "ml"] as const;
export type AmountUnit = (typeof AMOUNT_UNITS)[number];

export function toAmountUnit(value: unknown): AmountUnit | null {
  const s = String(value ?? "");
  return (AMOUNT_UNITS as readonly string[]).includes(s) ? (s as AmountUnit) : null;
}

// Exact by definition.
export const G_PER_OZ = 28.349523125;
// The US customary cup, which is the cup USDA weighs every household measure
// in — so a density from USDA only converts cleanly against this one. Labels
// round it to 240 ml; the 1.4% between the two is finer than any measuring cup.
export const ML_PER_CUP = 236.588;

const VOLUME_PER_CUP = { cup: 1, tbsp: 16, tsp: 48, ml: ML_PER_CUP } as const;
type VolumeUnit = keyof typeof VOLUME_PER_CUP;

const isVolume = (u: AmountUnit): u is VolumeUnit => u in VOLUME_PER_CUP;

// What is known about how much of something there is. Either side can be
// missing: "150 g" has no volume until a density turns up, "330 ml" has no
// weight, and "1 medium" has neither.
export type Measure = {
  grams: number | null;
  ml: number | null;
  gramsPerCup: number | null;
};

// Fill in whichever side the density can supply.
export function completeMeasure(m: Measure): Measure {
  const d = m.gramsPerCup;
  if (!d) return m;
  return {
    ...m,
    grams: m.grams ?? (m.ml != null ? (m.ml / ML_PER_CUP) * d : null),
    ml: m.ml ?? (m.grams != null ? (m.grams / d) * ML_PER_CUP : null),
  };
}

// How much of `unit` a measure comes to, or null if it can't be known.
export function amountIn(m: Measure, unit: AmountUnit): number | null {
  const full = completeMeasure(m);
  if (unit === "g") return full.grams;
  if (unit === "oz") return full.grams == null ? null : full.grams / G_PER_OZ;
  if (isVolume(unit)) {
    return full.ml == null ? null : (full.ml / ML_PER_CUP) * VOLUME_PER_CUP[unit];
  }
  return null;
}

// The inverse: `amount` of `unit` as a weight, given a food's density.
export function gramsOf(
  amount: number,
  unit: AmountUnit,
  gramsPerCup: number | null | undefined,
): number | null {
  if (unit === "g") return amount;
  if (unit === "oz") return amount * G_PER_OZ;
  if (isVolume(unit)) {
    return gramsPerCup ? (amount / VOLUME_PER_CUP[unit]) * gramsPerCup : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reading amounts out of the strings people write.
// ---------------------------------------------------------------------------

const FRACTIONS: Record<string, number> = {
  "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4,
  "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8,
};
const FRACTION_CHARS = Object.keys(FRACTIONS).join("");

// "1.5", "½", "1½", "1 ½" → a number. The number part of every pattern below.
const NUM = `(?:\\d+(?:\\.\\d+)?(?:\\s*[${FRACTION_CHARS}])?|[${FRACTION_CHARS}])`;

export function parseNumber(s: string): number | null {
  const m = new RegExp(`^\\s*(\\d+(?:\\.\\d+)?)?\\s*([${FRACTION_CHARS}])?\\s*$`).exec(s);
  if (!m || (m[1] == null && m[2] == null)) return null;
  return (m[1] ? Number(m[1]) : 0) + (m[2] ? FRACTIONS[m[2]] : 0);
}

// "2 × 1 medium (118 g)" → { n: 2, rest: "1 medium (118 g)" }. The multiplier
// form servingLabel writes, and the one hand-written plans use too.
function splitMultiplier(s: string): { n: number; rest: string } {
  const m = new RegExp(`^(${NUM})\\s*[×x]\\s*(.+)$`).exec(s.trim());
  if (m) {
    const n = parseNumber(m[1]);
    if (n != null && n > 0) return { n, rest: m[2].trim() };
  }
  return { n: 1, rest: s.trim() };
}

function firstAmount(s: string, unit: string): number | null {
  // Parenthesised first — "1 cup dry (80 g)" is 80 g, whatever the words
  // before it say — then anywhere.
  const paren = new RegExp(`\\((${NUM})\\s*${unit}\\b[^)]*\\)`, "i").exec(s);
  const any = paren ?? new RegExp(`(?:^|\\s)(${NUM})\\s*${unit}\\b`, "i").exec(s);
  return any ? parseNumber(any[1]) : null;
}

// Best-effort weight of a written quantity, for rows that were never given
// one explicitly. Null means "no idea", never zero.
//
// Two conventions both put grams in brackets after a multiplier, and mean
// different things by it. servingLabel writes "2 × 1 medium (118 g)" — the
// brackets are one serving. A hand-written plan writes "2 × 150 g (300 g)" —
// the brackets are the total. The tell is a leading weight whose multiple is
// the bracketed one.
export function parseGrams(quantity: string | null | undefined): number | null {
  const s = String(quantity ?? "").trim();
  if (!s) return null;
  const { n, rest } = splitMultiplier(s);

  const kg = firstAmount(rest, "kg");
  const g = kg != null ? kg * 1000 : firstAmount(rest, "g");
  if (g == null) return null;

  if (n !== 1) {
    const lead = new RegExp(`^(${NUM})\\s*g\\b`, "i").exec(rest);
    const leadG = lead ? parseNumber(lead[1]) : null;
    if (leadG != null && Math.abs(leadG * n - g) < 0.5) return g;
    return g * n;
  }
  return g;
}

export function parseMl(quantity: string | null | undefined): number | null {
  const s = String(quantity ?? "").trim();
  if (!s) return null;
  const { n, rest } = splitMultiplier(s);
  const litres = firstAmount(rest, "l");
  const ml = litres != null ? litres * 1000 : firstAmount(rest, "ml");
  return ml == null ? null : ml * n;
}

// Grams per cup implied by a serving written in cups or spoons with its weight
// alongside: "1 cup (148 g)" → 148, "2 tbsp (30 g)" → 240, "½ cup (124 g)" → 248.
export function gramsPerCupFromServing(serving: string): number | null {
  const m = new RegExp(`^(${NUM})\\s*(cups?|tbsp|tsp)\\b`, "i").exec(serving.trim());
  if (!m) return null;
  const n = parseNumber(m[1]);
  const g = parseGrams(serving);
  if (!n || g == null) return null;
  const unit = m[2].toLowerCase().startsWith("cup") ? "cup" : (m[2].toLowerCase() as VolumeUnit);
  return (g / n) * VOLUME_PER_CUP[unit];
}

// ---------------------------------------------------------------------------
// Writing amounts back out.
// ---------------------------------------------------------------------------

const GLYPHS: [number, string][] = [
  [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [3 / 8, "⅜"], [1 / 2, "½"],
  [5 / 8, "⅝"], [2 / 3, "⅔"], [3 / 4, "¾"], [7 / 8, "⅞"],
];

// Kitchen measures read as fractions — "⅔ cup", "2¼ tbsp" — because that is
// what a measuring cup is marked in. Snapped to the nearest mark when it lands
// within 6% of one, which is closer than anyone levels a cup; a short decimal
// otherwise.
function kitchenNumber(v: number): string {
  let best = { value: Math.round(v), text: String(Math.round(v)) };
  const whole = Math.floor(v);
  for (const base of [whole, whole + 1]) {
    for (const [f, glyph] of [[0, ""], ...GLYPHS] as [number, string][]) {
      const value = base + f;
      if (Math.abs(value - v) < Math.abs(best.value - v)) {
        best = { value, text: glyph ? `${base || ""}${glyph}` : String(base) };
      }
    }
  }
  if (best.value > 0 && Math.abs(best.value - v) / v <= 0.06) return best.text;
  return String(Number(v.toFixed(v >= 10 ? 0 : v >= 1 ? 1 : 2)));
}

// Rounding for display, per unit: whole grams and millilitres, tenths of an
// ounce, kitchen fractions for spoons and cups.
export function formatAmount(value: number, unit: AmountUnit): string {
  switch (unit) {
    case "g":
      return `${value >= 10 ? Math.round(value) : Number(value.toFixed(1))} g`;
    case "ml":
      return `${Math.round(value)} ml`;
    case "oz":
      return `${Number(value.toFixed(value >= 10 ? 0 : 1))} oz`;
    case "cup": {
      // Plural by what's printed, not the raw value: 1.04 cups prints as "1".
      const n = kitchenNumber(value);
      const one = n === "1" || (!/\d/.test(n)) || Number(n) < 1;
      return `${n} ${one ? "cup" : "cups"}`;
    }
    case "tbsp":
    case "tsp":
      return `${kitchenNumber(value)} ${unit}`;
    default:
      return String(Number(value.toFixed(2)));
  }
}

// What the amount box holds after a unit switch: tidy enough to read, precise
// enough that switching straight back lands where it started (to the rounding
// shown).
export function inputAmount(value: number, unit: AmountUnit): string {
  const digits =
    unit === "g" || unit === "ml" ? (value >= 10 ? 0 : 1)
    : unit === "oz" || unit === "tbsp" || unit === "tsp" ? 1
    : 2;
  return String(Number(value.toFixed(digits)));
}

// The free-text box is the gate, as parseServings is for servings. Ceilings per
// unit so a stray keypress can't write a nine-digit calorie count.
const AMOUNT_CAPS: Record<AmountUnit, number> = {
  serving: 99, g: 5000, oz: 200, cup: 25, tbsp: 200, tsp: 500, ml: 5000,
};

export function parseAmount(value: unknown, unit: AmountUnit): number | null {
  const raw = String(value ?? "").trim();
  const n = parseNumber(raw) ?? Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > AMOUNT_CAPS[unit]) return null;
  return n;
}

// Written into Food.quantity for every unit but "serving", which keeps
// servingLabel's "2 × 1 medium (118 g)". The gram figure rides along for the
// kitchen units because that is what a scale reads, and it's what the next
// person to open the plan will want to check against.
export function unitAmountLabel(amount: number, unit: AmountUnit, grams: number | null): string {
  const main = formatAmountExact(amount, unit);
  if (unit === "g" || unit === "ml" || grams == null) return main;
  return `${main} (${Math.round(grams)} g)`;
}

// Halves, quarters and eighths only: they are exact in binary, so "½ cup"
// parses back to precisely the 0.5 that was typed. A third can't be typed
// exactly, so it never gets a glyph here.
const EXACT_GLYPHS: [number, string][] = [
  [0.125, "⅛"], [0.25, "¼"], [0.375, "⅜"], [0.5, "½"],
  [0.625, "⅝"], [0.75, "¾"], [0.875, "⅞"],
];

// Like formatAmount, but never rounds a typed amount to a neighbouring
// fraction: "0.3 cup" stays 0.3, so the label parses back to what was typed.
function formatAmountExact(amount: number, unit: AmountUnit): string {
  const whole = Math.floor(amount);
  const frac = amount - whole;
  const kitchen = unit === "cup" || unit === "tbsp" || unit === "tsp";
  const glyph = kitchen
    ? EXACT_GLYPHS.find(([f]) => Math.abs(frac - f) < 1e-9)?.[1]
    : undefined;
  const n = glyph ? `${whole || ""}${glyph}` : String(Number(amount.toFixed(3)));
  if (unit === "cup") return `${n} ${amount > 1 ? "cups" : "cup"}`;
  return `${n} ${unit}`;
}

// The inverse of unitAmountLabel: "1½ cups (120 g)" → { amount: 1.5, unit: "cup" }.
export function parseUnitAmountLabel(
  quantity: string | null | undefined,
): { amount: number; unit: Exclude<AmountUnit, "serving"> } | null {
  const s = String(quantity ?? "").trim();
  const m = new RegExp(`^(${NUM})\\s*(g|oz|cups?|tbsp|tsp|ml)(?:\\s*\\(\\s*${NUM}\\s*g\\s*\\))?$`, "i").exec(s);
  if (!m) return null;
  const amount = parseNumber(m[1]);
  if (amount == null || amount <= 0) return null;
  const u = m[2].toLowerCase();
  const unit = (u.startsWith("cup") ? "cup" : u) as Exclude<AmountUnit, "serving">;
  return { amount, unit };
}

// ---------------------------------------------------------------------------
// Re-reading a saved amount in another unit, for the menu on every food row.
// Display only: nothing chosen here is ever written back.
// ---------------------------------------------------------------------------

export type DisplayUnit = "written" | Exclude<AmountUnit, "serving">;

export const DISPLAY_UNITS: readonly DisplayUnit[] = ["written", "g", "oz", "cup", "tbsp", "tsp", "ml"];

export function toDisplayUnit(value: unknown): DisplayUnit {
  const s = String(value ?? "");
  return (DISPLAY_UNITS as readonly string[]).includes(s) ? (s as DisplayUnit) : "written";
}

// Every way this amount can honestly be shown. "written" — the quantity as the
// coach typed it — always comes first and is the default. Spoons are offered
// only where they're the natural measure (a teaspoon count for a cup of oats
// is arithmetic, not help), and millilitres only for something that was
// written as a volume in the first place.
export function displayAmounts(
  quantity: string,
  measure: { grams: number | null; gramsPerCup: number | null },
): { unit: DisplayUnit; label: string }[] {
  const written = quantity.trim();
  const ml = parseMl(written);
  const full = completeMeasure({ ...measure, ml });
  const out: { unit: DisplayUnit; label: string }[] = [];
  if (written) out.push({ unit: "written", label: written });

  if (full.grams != null && full.grams > 0) {
    out.push({ unit: "g", label: formatAmount(full.grams, "g") });
    out.push({ unit: "oz", label: formatAmount(full.grams / G_PER_OZ, "oz") });
  }
  if (full.ml != null && full.ml > 0) {
    // Cups from a quarter up, tablespoons under half a cup, teaspoons under
    // three tablespoons: each unit where it's the one you'd reach for.
    const cups = full.ml / ML_PER_CUP;
    const tbsp = cups * 16;
    if (cups >= 0.25) out.push({ unit: "cup", label: formatAmount(cups, "cup") });
    if (tbsp >= 0.5 && tbsp < 8) out.push({ unit: "tbsp", label: formatAmount(tbsp, "tbsp") });
    if (tbsp < 3) out.push({ unit: "tsp", label: formatAmount(cups * 48, "tsp") });
    if (ml != null) out.push({ unit: "ml", label: formatAmount(full.ml, "ml") });
  }

  // "100 g" written and "100 g" offered is one option, not two.
  const seen = new Set<string>();
  return out.filter((o) => {
    const key = o.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
