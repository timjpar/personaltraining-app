// How the coach's workout library is arranged. Data-only, like theme.ts: the
// page reads the cookie on the server and the picker writes it from the
// browser, so this module must not pull in next/headers.

import { DISCIPLINE_LABELS, toDiscipline } from "@/lib/constants";

// A device preference, for the reasons saveThemePrefs gives: it has to be
// readable on the server so the list renders arranged the reader's way on the
// first paint, rather than flipping from the default after hydration (the
// cost use-stored-set.ts names and points here to remove).
export const LIBRARY_VIEW_COOKIE = "pt_library_view";
export const LIBRARY_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LIBRARY_VIEWS = [
  "kind",
  "day",
  "recent",
  "oldest",
  "az",
  "za",
  "exercises",
] as const;
export type LibraryView = (typeof LIBRARY_VIEWS)[number];

// Grouped by kind, because a library is a week's worth of lifts, climbs and
// recovery days, and the order they were last edited in tells you nothing.
export const DEFAULT_LIBRARY_VIEW: LibraryView = "kind";

// Short enough for a phone: a native select is as wide as its longest option.
export const LIBRARY_VIEW_LABELS: Record<LibraryView, string> = {
  kind: "By kind",
  day: "By day",
  recent: "Updated, newest",
  oldest: "Updated, oldest",
  az: "Name, A–Z",
  za: "Name, Z–A",
  exercises: "Most exercises",
};

// Views that draw a heading over each section, and views that draw one flat
// list. The picker uses these as its two optgroups.
export const GROUPED_VIEWS = ["kind", "day"] as const satisfies readonly LibraryView[];
export const SORTED_VIEWS = [
  "recent",
  "oldest",
  "az",
  "za",
  "exercises",
] as const satisfies readonly LibraryView[];

// Null rather than a default, unlike the to* helpers in constants.ts, because
// a view comes from two places in turn (the address bar, then the cookie) and
// an unrecognised value in the first must fall through to the second.
export function toLibraryView(value: unknown): LibraryView | null {
  const s = String(value ?? "");
  return (LIBRARY_VIEWS as readonly string[]).includes(s)
    ? (s as LibraryView)
    : null;
}

// Discipline is what kind of training a session is, but a coach's week has a
// kind it can't express: recovery. Those days are filed as Mobility, and only
// the title says otherwise. Ordered hardest to easiest, with Other last as the
// escape hatch it is.
export const WORKOUT_KINDS = [
  "CLIMBING",
  "STRENGTH",
  "CARDIO",
  "MOBILITY",
  "RECOVERY",
  "OTHER",
] as const;
export type WorkoutKind = (typeof WORKOUT_KINDS)[number];

export const WORKOUT_KIND_LABELS: Record<WorkoutKind, string> = {
  ...DISCIPLINE_LABELS,
  RECOVERY: "Recovery",
};

// The word a coach puts before the colon, as in "Lift: Lower Body".
const LABEL_KINDS: Record<string, WorkoutKind> = {
  lift: "STRENGTH",
  lifting: "STRENGTH",
  strength: "STRENGTH",
  climb: "CLIMBING",
  climbing: "CLIMBING",
  boulder: "CLIMBING",
  bouldering: "CLIMBING",
  cardio: "CARDIO",
  conditioning: "CARDIO",
  run: "CARDIO",
  mobility: "MOBILITY",
  yoga: "MOBILITY",
  recovery: "RECOVERY",
  rest: "RECOVERY",
};

// "Mon · Lift: Lower Body" is scheduled for Monday. The separator is required,
// so a title that merely starts with the letters ("Monster Pulls") is not.
const DAY_PREFIX =
  /^(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?)\.?\s*[·•|:–—-]\s*/i;

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** 0 for Sunday through 6 for Saturday, or null for a title with no day. */
export function workoutDay(title: string): number | null {
  const match = DAY_PREFIX.exec(title.trim());
  return match ? DAY_KEYS.indexOf(match[1].slice(0, 3).toLowerCase()) : null;
}

function labelKind(title: string): WorkoutKind | null {
  const rest = title.trim().replace(DAY_PREFIX, "");
  const match = /^([a-z]+)\s*:/i.exec(rest);
  return match ? (LABEL_KINDS[match[1].toLowerCase()] ?? null) : null;
}

// The discipline field decides, except where it can't be trusted. Strength is
// the column default and what the builder's picker opens on, so a climbing day
// saved without touching the picker reads as Strength; there the title's own
// label ("Climb:") is the better witness. Any other discipline was picked on
// purpose and wins. Recovery wins over everything, since no discipline says it.
export function workoutKind(t: { title: string; discipline: string }): WorkoutKind {
  const labelled = labelKind(t.title);
  if (labelled === "RECOVERY") return labelled;
  const discipline = toDiscipline(t.discipline);
  if (discipline !== "STRENGTH") return discipline;
  return labelled ?? discipline;
}

export type LibraryRow = {
  id: string;
  title: string;
  discipline: string;
  exercises: number;
  // Milliseconds, for sorting. The label beside it is formatted on the server
  // like every other date here, so the browser's zone never gets a say.
  updatedAt: number;
  updatedLabel: string;
};

export type LibraryGroup = {
  key: string;
  // Null for the sorted views, which draw one list with no heading.
  label: string | null;
  rows: LibraryRow[];
};

// A fixed locale, not the runtime's: the list renders on the server and again
// on hydration, and two collators that disagree would reorder it in between.
const collator = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });

type Keyed = LibraryRow & { kind: WorkoutKind; day: number | null };

const byTitle = (a: Keyed, b: Keyed) => collator.compare(a.title, b.title);

// Sunday first where the title has a day, then the unscheduled ones by name.
const byDay = (a: Keyed, b: Keyed) => (a.day ?? 7) - (b.day ?? 7) || byTitle(a, b);

const byKind = (a: Keyed, b: Keyed) =>
  WORKOUT_KINDS.indexOf(a.kind) - WORKOUT_KINDS.indexOf(b.kind) || byTitle(a, b);

const SORTS: Record<(typeof SORTED_VIEWS)[number], (a: Keyed, b: Keyed) => number> = {
  recent: (a, b) => b.updatedAt - a.updatedAt || byTitle(a, b),
  oldest: (a, b) => a.updatedAt - b.updatedAt || byTitle(a, b),
  az: byTitle,
  za: (a, b) => byTitle(b, a),
  exercises: (a, b) => b.exercises - a.exercises || byDay(a, b),
};

function section(
  rows: Keyed[],
  keys: readonly (string | number)[],
  keyOf: (row: Keyed) => string | number,
  labelOf: (key: string | number) => string,
  order: (a: Keyed, b: Keyed) => number,
): LibraryGroup[] {
  // A section with nothing in it gets no heading, as on the roster.
  return keys.flatMap((key) => {
    const inSection = rows.filter((r) => keyOf(r) === key).sort(order);
    return inSection.length
      ? [{ key: String(key), label: labelOf(key), rows: inSection }]
      : [];
  });
}

export function arrangeLibrary(rows: LibraryRow[], view: LibraryView): LibraryGroup[] {
  const keyed: Keyed[] = rows.map((r) => ({
    ...r,
    kind: workoutKind(r),
    day: workoutDay(r.title),
  }));

  switch (view) {
    case "kind":
      return section(
        keyed,
        WORKOUT_KINDS,
        (r) => r.kind,
        (k) => WORKOUT_KIND_LABELS[k as WorkoutKind],
        byDay,
      );
    case "day":
      // Index 7 is the shelf for titles with no day, so it sorts last.
      return section(
        keyed,
        [0, 1, 2, 3, 4, 5, 6, 7],
        (r) => r.day ?? 7,
        (d) => DAY_LABELS[d as number] ?? "Unscheduled",
        byKind,
      );
    default:
      return [{ key: view, label: null, rows: [...keyed].sort(SORTS[view]) }];
  }
}
