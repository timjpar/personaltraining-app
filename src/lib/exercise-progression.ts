// The grey hint in each box on the log form: what you logged for *that set*
// last time, and — only when the numbers are clean enough to be sure — what to
// aim for today. Set one answers to last time's set one, set two to set two.
//
// Double progression. Add a rep each session until the set tops out at
// REP_CEILING, then add weight instead and let the reps fall back on their own.
// So a load target never appears until the reps have earned it, and the two
// suggestions are never both live on the same movement.
//
// Everything here is a hint and nothing here is stored: these strings land in
// `placeholder`, so an untouched box still submits blank and logs null. That is
// the whole reason this can afford to guess at all.
//
// Pure — no Prisma, no React — so the server page that builds the hints and any
// client component that might later want them can both import it.

import { UNITS, type Units } from "@/lib/constants";
import { archetypeFor, type Archetype } from "@/lib/exercise-archetypes";
import { setValuesFor, storedSetCount } from "@/lib/exercise-sets";

// The top of the rep range. Past this, more reps stop being the point.
export const REP_CEILING = 10;

// Results are free-form strings by design — see the Exercise.result* comments
// in schema.prisma. A set's own value is usually one clean number, but "8-10"
// and "as many as I could" are honest answers too, so anything that isn't a
// number with an optional unit parses as null and is simply read back
// unchanged. Bailing is the correct outcome far more often than guessing.
type Amount = { value: number; unit: string; suffix: string };

// Deliberately strict. No ranges ("8-10"), no prose ("failure"), and no "%" in
// the character class, which is what keeps a percentage-of-1RM load from being
// "progressed" by 2.5 of something. Lists never reach it: exercise-sets splits
// them into their per-set values first.
const AMOUNT = /^(\d+(?:\.\d+)?)(\s*)([a-z]*)$/i;

export function parseAmount(raw: string | null | undefined): Amount | null {
  const text = (raw ?? "").trim();
  if (!text) return null;

  const m = AMOUNT.exec(text);
  if (!m) return null;

  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  // `suffix` keeps the athlete's own spacing and spelling so a suggestion comes
  // back in the shape they typed it: "60 kg" → "62.5 kg", never "62.5kg".
  return { value, unit: m[3].toLowerCase(), suffix: `${m[2]}${m[3]}` };
}

// A bare count is the common case; the rest are the ways people write one out.
// Anything else — "30s" on a plank, "400m" on a carry — is not a rep and must
// not be incremented.
const REP_UNITS = new Set(["", "rep", "reps", "r", "x"]);

const KG_UNITS = new Set(["kg", "kgs", "kilo", "kilos"]);
const LB_UNITS = new Set(["lb", "lbs", "pound", "pounds"]);

// The jumps a gym actually has plates for. Lower-body work moves in bigger
// ones — 2.5 kg on a squat is inside the noise of how you slept.
const LOWER_BODY = new Set<Archetype>(["squat", "hinge", "lunge"]);

// How much to add, or null when this isn't a load at all. An unrecognised unit
// is the guard that matters: "5km" logged against a run parses as a number
// perfectly well, and adding 2.5 to it would be nonsense.
function loadStep(name: string, unit: string, units: Units): number | null {
  const bare = unit === "";
  const imperial = LB_UNITS.has(unit) || (bare && units === UNITS.IMPERIAL);
  const metric = KG_UNITS.has(unit) || (bare && units === UNITS.METRIC);
  if (!imperial && !metric) return null;

  const lower = LOWER_BODY.has(archetypeFor(name));
  if (imperial) return lower ? 10 : 5;
  return lower ? 5 : 2.5;
}

// 62.5 stays 62.5, 65 doesn't become 65.0. toFixed first so 60 + 2.5 can't
// arrive as 62.50000000000001.
const trim = (n: number) => String(Number(n.toFixed(2)));

export type LastResult = {
  sets: string | null;
  reps: string | null;
  load: string | null;
};

// One placeholder per box on one set's row. A missing key is a box that has
// nothing to say — the athlete never logged a load for that set, or never got
// to it — and the form leaves it blank, so a row with no history reads as an
// empty pair of inputs under their column headings.
export type SetHint = { reps?: string; load?: string };

// A set's own numbers, worded for a box roughly 90px wide on a phone. Hence the
// arrow rather than the "Last time … · try …" this used to say when there was
// one box for the whole movement: the form explains the convention once, above
// the exercises, and every row after that is numbers.
const target = (was: string, next: string) => `${was} → ${next}`;

// In set order, and only as long as the history actually is. Sets the athlete
// adds beyond what they did last time simply get no hint, which is the honest
// answer — a fifth set has no fifth set to be compared with.
export function logHints({
  name,
  last,
  units,
}: {
  name: string;
  last: LastResult | undefined;
  units: Units;
}): SetHint[] | undefined {
  if (!last) return undefined;

  const count = storedSetCount(last);
  if (count === 0) return undefined;

  const reps = setValuesFor(last.reps, count);
  const loads = setValuesFor(last.load, count);

  const repAmounts = reps.map((v) => {
    const amount = parseAmount(v);
    return amount && REP_UNITS.has(amount.unit) ? amount : null;
  });

  // The "then just weights" half of the rule, read across the whole movement
  // rather than one row: while any set still has a rep left in it, the weight
  // stays where it was. Adding load to set 3 alone isn't double progression,
  // it's two different exercises.
  const counted = repAmounts.filter((a) => a != null);
  const atCeiling =
    counted.length > 0 && counted.every((a) => a.value >= REP_CEILING);

  const hints = reps.map((was, i): SetHint => {
    const hint: SetHint = {};

    const amount = repAmounts[i];
    // Sets are never progressed, only reps and load. Adding a fourth set is a
    // change to the programme, which is the coach's call, not a hint's.
    if (was) {
      hint.reps =
        amount && !atCeiling
          ? target(was, `${trim(amount.value + 1)}${amount.suffix}`)
          : was;
    }

    const wasLoad = loads[i];
    if (wasLoad) {
      const load = parseAmount(wasLoad);
      const step = load ? loadStep(name, load.unit, units) : null;
      hint.load =
        atCeiling && load && step != null
          ? target(wasLoad, `${trim(load.value + step)}${load.suffix}`)
          : wasLoad;
    }

    return hint;
  });

  return hints.some((h) => h.reps || h.load) ? hints : undefined;
}
