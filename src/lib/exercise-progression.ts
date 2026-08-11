// The grey hint under each result box on the log form: what you logged last
// time for this movement, and — only when the numbers are clean enough to be
// sure — what to aim for today.
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

// The top of the rep range. Past this, more reps stop being the point.
export const REP_CEILING = 10;

// Results are free-form strings by design — see the Exercise.result* comments
// in schema.prisma. "6,6,6,5" and "3 of 4" are honest answers to what happened
// and there is no single figure to progress from, so anything that isn't one
// clean number with an optional unit parses as null and is simply read back
// unchanged. Bailing is the correct outcome far more often than guessing.
type Amount = { value: number; unit: string; suffix: string };

// Deliberately strict. No ranges ("8-10"), no lists ("6,6,6,5"), no prose
// ("3 of 4"), and no "%" in the character class, which is what keeps a
// percentage-of-1RM load from being "progressed" by 2.5 of something.
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

// One placeholder per box. A missing key means "no history for this one" and
// the form falls back to its own wording, so an exercise the athlete has never
// done reads exactly as it did before this existed.
export type LogHints = { sets?: string; reps?: string; load?: string };

export function logHints({
  name,
  last,
  units,
}: {
  name: string;
  last: LastResult | undefined;
  units: Units;
}): LogHints | undefined {
  if (!last) return undefined;

  const hints: LogHints = {};

  // Sets are never progressed. Adding a fourth set is a change to the
  // programme, which is the coach's call, not a hint's.
  if (last.sets) hints.sets = `Last time ${last.sets}`;

  const reps = parseAmount(last.reps);
  const countable = reps != null && REP_UNITS.has(reps.unit);
  const atCeiling = countable && reps.value >= REP_CEILING;

  if (last.reps) {
    hints.reps =
      countable && !atCeiling
        ? `Last time ${last.reps} · try ${trim(reps.value + 1)}${reps.suffix}`
        : `Last time ${last.reps}`;
  }

  if (last.load) {
    const load = parseAmount(last.load);
    const step = load ? loadStep(name, load.unit, units) : null;
    // Gated on atCeiling, which is the "then just weights" half of the rule:
    // while there are still reps to add, the weight stays where it was.
    hints.load =
      atCeiling && load && step != null
        ? `Last time ${last.load} · try ${trim(load.value + step)}${load.suffix}`
        : `Last time ${last.load}`;
  }

  return Object.keys(hints).length > 0 ? hints : undefined;
}
