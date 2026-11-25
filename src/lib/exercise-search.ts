// Matching what a coach types against exercise names. Shared by the builder's
// picker and the /exercises page, so the two never disagree about what a
// search finds.
//
// A query is split into words and every word has to land somewhere, in any
// order. The name is searched first; the catalog heading a movement sits under
// and the other names it goes by fill in the rest, so "barbell overhead press"
// finds Overhead Press even though "barbell" is only its heading.
//
// Data-only, like exercise-presets.ts: a client component imports it.

import {
  EXERCISE_CATEGORIES,
  EXERCISE_PRESETS,
  normalizeExerciseName,
} from "./exercise-presets";

// Other names a movement goes by. Coaches type what they'd say out loud, and
// the catalog only knows one spelling. Keyed by catalog name.
const ALIASES: Record<string, string[]> = {
  "Overhead Press": [
    "OHP",
    "military press",
    "strict press",
    "standing press",
    "shoulder press",
  ],
  "Barbell Row": ["bent-over row"],
  "Romanian Deadlift": ["RDL"],
  "Dumbbell Romanian Deadlift": ["RDL"],
  "Close-Grip Bench Press": ["CGBP"],
  "Bulgarian Split Squat": ["BSS", "RFESS", "rear-foot elevated split squat"],
  "Dumbbell Skullcrusher": ["lying triceps extension"],
  "Cable Fly": ["cable crossover", "chest fly"],
  "Dumbbell Fly": ["chest fly"],
  "Pec Deck": ["chest fly machine", "butterfly"],
  "Lying Leg Curl": ["hamstring curl"],
  "Seated Leg Curl": ["hamstring curl"],
  "Leg Extension": ["quad extension"],
  "Seated Cable Row": ["low row"],
  Dip: ["parallel bar dip", "triceps dip", "chest dip"],
  "Handstand Push-Up": ["HSPU"],
  "Toes-to-Bar": ["T2B", "TTB"],
  "Ab Wheel Rollout": ["ab roller"],
  "Pallof Press": ["anti-rotation press"],
  "Turkish Get-Up": ["TGU"],
  "Clean & Jerk": ["clean and jerk"],
  "Row (Erg)": ["rower", "rowing machine"],
  "Assault Bike": ["air bike"],
  "Echo Bike": ["air bike"],
};

// Shorthand for a whole word, swapped in before matching, so "db row" finds
// Dumbbell Row. Only ever a whole query word: "db" is also the middle of
// "deadbug".
const SHORTHAND: Record<string, string> = {
  db: "dumbbell",
  bb: "barbell",
  kb: "kettlebell",
  bw: "bodyweight",
  abs: "core",
  fingerboard: "hangboard",
};

function words(text: string): string[] {
  return normalizeExerciseName(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

// A name both ways: spaced, and run together from each word on, so "pushup"
// finds Push-Up. The run-together form only matches from the start of a word,
// or "rdl" would find Campus Boa*rd L*adder.
type Text = { spaced: string; runs: string[] };

function textOf(name: string): Text {
  const w = words(name);
  return { spaced: w.join(" "), runs: w.map((_, i) => w.slice(i).join("")) };
}

function inText(term: string, text: Text): boolean {
  return (
    text.spaced.includes(term) || text.runs.some((r) => r.startsWith(term))
  );
}

// Every heading a catalog name sits under, both the picker's ("Rock Climbing")
// and the page's ("Fingers & Grip"), as single words.
const HEADING_WORDS = new Map<string, Set<string>>();
for (const category of [...EXERCISE_CATEGORIES, ...EXERCISE_PRESETS]) {
  const label = words(category.label);
  for (const name of category.exercises) {
    const key = normalizeExerciseName(name);
    const set = HEADING_WORDS.get(key) ?? new Set<string>();
    for (const w of label) set.add(w);
    HEADING_WORDS.set(key, set);
  }
}

const ALIAS_TEXT = new Map<string, Text[]>(
  Object.entries(ALIASES).map(([name, aliases]) => [
    normalizeExerciseName(name),
    aliases.map(textOf),
  ]),
);

// Headings only answer for words of three letters or more, matched from the
// start of a heading word: "up" shouldn't pull in every warm-up, and "ell"
// shouldn't pull in every barbell lift.
function inHeading(term: string, headings: Set<string> | undefined): boolean {
  if (!headings || term.length < 3) return false;
  for (const w of headings) if (w.startsWith(term)) return true;
  return false;
}

// Names are re-ranked on every keystroke, so each one is taken apart once.
const NAME_TEXT = new Map<string, Text>();

function nameText(name: string): Text {
  const key = normalizeExerciseName(name);
  let text = NAME_TEXT.get(key);
  if (!text) {
    text = textOf(name);
    NAME_TEXT.set(key, text);
  }
  return text;
}

// A ranker for one query, or null when nothing has been typed and everything
// should show. The ranker gives a name's place among the matches — 0 when the
// name starts with what was typed, 1 when the name alone holds every word, 2
// when a heading or another name had to help — and null when it doesn't match.
export function exerciseMatcher(
  query: string,
): ((name: string) => number | null) | null {
  const terms = words(query).map((w) => SHORTHAND[w] ?? w);
  if (terms.length === 0) return null;
  const phrase = terms.join(" ");

  return (name) => {
    const text = nameText(name);
    if (terms.every((t) => inText(t, text))) {
      return text.spaced.startsWith(phrase) ? 0 : 1;
    }

    const key = normalizeExerciseName(name);
    const aliases = ALIAS_TEXT.get(key) ?? [];
    const headings = HEADING_WORDS.get(key);
    const found = terms.every(
      (t) =>
        inText(t, text) ||
        aliases.some((a) => inText(t, a)) ||
        inHeading(t, headings),
    );
    return found ? 2 : null;
  };
}
