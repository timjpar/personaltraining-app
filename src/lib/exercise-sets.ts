// Per-set results, packed into the three free-form result columns.
//
// Exercise.resultReps has held "6,6,6,5" since the first seed — one value per
// set, comma-separated — so the log form's per-set rows write the shape that
// was already in the database rather than earning a table of their own.
// resultSets stays the count, and it is what tells a reader how many sets a
// single collapsed figure covers.
//
// Pure — no Prisma, no React — because both ends need it: the server action
// packs rows on the way in, the log form and every recap unpack them on the
// way out.

// The most rows the form will ever open with or let you add to. A guard on the
// prescription more than a limit on the athlete: "sets: 100" is a typo, and
// rendering a hundred pairs of inputs on a phone is not a useful reading of it.
export const MAX_SETS = 20;

// A blank between two logged sets. Trailing blanks fall off entirely (see
// joinSetValues), so this only ever marks a set that was skipped in the middle
// of an exercise — which has to keep its position, or set 4's number becomes
// set 3's.
const GAP = "–";

// The set count out of a free-form prescription: "4", "3-4", "4 sets".
// Deliberately the *first* number — "3-4" is three sets you owe and a fourth
// you might, and opening the form with the optional row already there asks for
// it. Also reads "3 of 4" as 3, which is the shape resultSets stores.
export function parseSetCount(raw: string | null | undefined): number | null {
  const m = /\d+/.exec(raw ?? "");
  if (!m) return null;
  const n = Number(m[0]);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(n, MAX_SETS);
}

export function splitSetValues(raw: string | null | undefined): string[] {
  const text = (raw ?? "").trim();
  if (!text) return [];
  return text.split(",").map((s) => {
    const v = s.trim();
    return v === GAP ? "" : v;
  });
}

// One value per set, for a list that may not be as long as the session it
// describes. A single figure is the whole exercise's answer — that is every
// result logged before per-set rows existed, and still what a collapsed
// uniform list looks like — so it applies to every set rather than only the
// first. Anything shorter than `count` pads with blanks.
export function setValuesFor(
  raw: string | null | undefined,
  count: number,
): string[] {
  const values = splitSetValues(raw);
  if (values.length === 1) return Array.from({ length: count }, () => values[0]);
  return Array.from({ length: count }, (_, i) => values[i] ?? "");
}

// The inverse. Trailing blanks fall off — those are sets that never happened,
// not sets logged as nothing — and a list that says the same thing in every
// position collapses to that thing, because "6,6,6,6" carries nothing "6"
// doesn't and reads worse everywhere it lands.
export function joinSetValues(values: string[]): string | null {
  const trimmed = values.map((v) => v.trim());
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === "") trimmed.pop();
  if (trimmed.length === 0) return null;
  if (trimmed.every((v) => v === trimmed[0])) return trimmed[0];
  return trimmed.map((v) => (v === "" ? GAP : v)).join(",");
}

// What goes in resultSets: "4", or "3 of 4" when fewer sets were logged than
// were written. The second shape has been in the data since the first seed and
// reads the way a coach would say it out loud.
export function describeSetsDone(
  logged: number,
  prescribed: number | null,
): string | null {
  if (logged < 1) return null;
  if (prescribed != null && logged < prescribed) return `${logged} of ${prescribed}`;
  return String(logged);
}

// How many sets a stored result describes — the widest claim any of the three
// columns makes. A collapsed "6" alongside a resultSets of "4" is four sets of
// six, and a row from before per-set logging is simply one.
export function storedSetCount(result: {
  sets?: string | null;
  reps?: string | null;
  load?: string | null;
}): number {
  return Math.max(
    parseSetCount(result.sets) ?? 0,
    splitSetValues(result.reps).length,
    splitSetValues(result.load).length,
  );
}
