// What a workout works, read off its rows — for the board's cards, where days
// sit side by side and the question is how they differ.
//
// Muscles come from the animation index: the same primary and secondary lists
// the demos highlight. A trainer's own movement with no animation therefore
// counts toward nothing, and the notes name it rather than letting the totals
// look complete.
//
// Sets per muscle are fractional — a whole set for each muscle an exercise
// works most, half for each one it assists. That's how the volume research
// counts (Pelland et al., 2024), and it keeps a squat from also reading as a
// full set of back work. Only the main block counts: warm-ups and cool-downs
// aren't hard sets, and neither are stretches or easy cardio wherever they sit.
//
// Pure and browser-safe: a card recomputes it on every edit.

import { DISCIPLINES, toDiscipline } from "@/lib/constants";
import { animationFor, muscleLabel } from "@/lib/exercise-anim/lookup";
import { archetypeFor, type Archetype } from "@/lib/exercise-archetypes";
import { disciplineForName } from "@/lib/exercise-presets";
import { pathsThrough } from "@/lib/progressions";

export type StatsExercise = {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  tempo: string;
  section: string;
};

export type MuscleVolume = {
  muscle: string;
  label: string;
  // Fractional working sets: direct + indirect / 2.
  sets: number;
  direct: number;
  indirect: number;
  // How many exercises work it as a main muscle. Zero when it's only assisting.
  exercises: number;
};

export type PatternKey =
  | "squat"
  | "hinge"
  | "lunge"
  | "push"
  | "pull"
  | "core"
  | "carry"
  | "power"
  | "climb"
  | "conditioning"
  | "mobility";

export type PatternCount = { key: PatternKey; label: string; sets: number; exercises: number };

export type ZoneKey = "strength" | "hypertrophy" | "endurance" | "timed" | "open";

export type ZoneCount = { key: ZoneKey; label: string; range: string; sets: number };

export type StatNote = { tone: "info" | "flag"; text: string };

export type WorkoutStats = {
  // Working sets per muscle, most first.
  muscles: MuscleVolume[];
  // What the stretches and mobility work go after, most often first.
  stretched: string[];
  // In a fixed order. A strength workout always lists the six basic patterns,
  // so one it leaves out shows as a gap; the rest appear only when present.
  patterns: PatternCount[];
  // Working sets by rep range, only the ranges that have any.
  zones: ZoneCount[];
  // A rough length, from sets, reps, tempo and rest.
  minutes: number;
  notes: StatNote[];
};

// Past about this many fractional sets for one muscle in one session, each
// extra set buys less (Pelland et al., 2024). Also where a muscle's bar fills.
export const SESSION_SET_CEILING = 11;

const PATTERN_LABELS: Record<PatternKey, string> = {
  squat: "Squat",
  hinge: "Hinge",
  lunge: "Lunge",
  push: "Push",
  pull: "Pull",
  core: "Core",
  carry: "Carry",
  power: "Power",
  climb: "Climbing",
  conditioning: "Conditioning",
  mobility: "Mobility",
};

const PATTERN_ORDER = Object.keys(PATTERN_LABELS) as PatternKey[];
const BASIC_PATTERNS = new Set<PatternKey>(["squat", "hinge", "lunge", "push", "pull", "core"]);

// Neutral is the archetype for "no figure fits" — calf raises, L-sits, splits —
// so it says nothing about the pattern and counts toward none.
const PATTERN_OF: Record<Archetype, PatternKey | null> = {
  squat: "squat",
  hinge: "hinge",
  lunge: "lunge",
  "press-horizontal": "push",
  "press-overhead": "push",
  "pull-vertical": "pull",
  "pull-horizontal": "pull",
  carry: "carry",
  core: "core",
  cardio: "conditioning",
  stretch: "mobility",
  explosive: "power",
  climb: "climb",
  neutral: null,
};

const ZONES: { key: ZoneKey; label: string; range: string }[] = [
  { key: "strength", label: "Strength", range: "1–5 reps" },
  { key: "hypertrophy", label: "Hypertrophy", range: "6–12 reps" },
  { key: "endurance", label: "Endurance", range: "13+ reps" },
  { key: "timed", label: "Timed", range: "holds, intervals, distance" },
  { key: "open", label: "Open-ended", range: "AMRAP, max, ladders" },
];

// The leading number of a sets field, as the board's set total reads it.
function setCount(sets: string): number {
  const m = /^\s*(\d+)/.exec(sets);
  return m ? Number(m[1]) : 0;
}

// Seconds in a duration: "90s", "2:00", "2 min", "1 min 30s", "45 sec". In a
// reps field a bare "m" is metres ("20m" of sled), so only rest reads it as
// minutes. Null when the text names no time at all.
function durationSeconds(text: string, bareMIsMinutes: boolean): number | null {
  const s = text.toLowerCase();
  const clock = /(\d+):([0-5]\d)/.exec(s);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const unit = bareMIsMinutes
    ? /(\d+(?:\.\d+)?)\s*(min(?:ute)?s?|m|sec(?:ond)?s?|s)(?![a-z])/g
    : /(\d+(?:\.\d+)?)\s*(min(?:ute)?s?|sec(?:ond)?s?|s)(?![a-z])/g;
  let total = 0;
  let found = false;
  for (const m of s.matchAll(unit)) {
    found = true;
    total += Number(m[1]) * (m[2].startsWith("m") ? 60 : 1);
  }
  return found ? total : null;
}

// Rest between sets. A bare number is seconds, unless it's small enough that
// only minutes make sense ("3").
function restSeconds(rest: string): number | null {
  const timed = durationSeconds(rest, true);
  if (timed != null) return timed;
  const bare = /^\s*(\d+(?:\.\d+)?)\s*$/.exec(rest);
  if (!bare) return null;
  const n = Number(bare[1]);
  return n <= 5 ? n * 60 : n;
}

const METRES: Record<string, number> = { m: 1, km: 1000, yd: 0.9144, mi: 1609 };

type RepRead = {
  // Null when the reps box is empty.
  zone: ZoneKey | null;
  // Reps in a set, when it's counted in reps.
  reps: number | null;
  // Seconds of work in a set, when the field says so directly.
  work: number | null;
  // Done once per side: "10/leg", "45s/side".
  sides: 1 | 2;
};

function readReps(text: string): RepRead {
  const s = text.trim().toLowerCase();
  const sides =
    /\/\s*(side|leg|arm|way|each|hand)|\beach\b|per side|\be\/s\b|\bea\b/.test(s) ? 2 : 1;
  // "7s on / 3s off x6": a repeater, timed by its cycles.
  const intervals = /(\d+)\s*s\w*\s+on\b.*?(\d+)\s*s\w*\s+off\b.*?x\s*(\d+)/.exec(s);
  if (intervals) {
    const [, on, off, n] = intervals.map(Number);
    return { zone: "timed", reps: null, work: (on + off) * n, sides };
  }
  const distance = /(\d+(?:\.\d+)?)\s*(km|m|yd|mi)(?![a-z])/.exec(s);
  if (distance) {
    // About a brisk run's pace; sled and carry work is slower, sprints faster.
    return { zone: "timed", reps: null, work: (Number(distance[1]) * METRES[distance[2]]) / 3, sides };
  }
  const timed = durationSeconds(s, false);
  if (timed != null) return { zone: "timed", reps: null, work: timed, sides };
  if (!s) return { zone: null, reps: null, work: null, sides };
  if (/amrap|max|failure|ladder|round|circuit|cal\b|\?/.test(s)) {
    return { zone: "open", reps: null, work: null, sides };
  }
  const range = /(\d+)\s*[-–]\s*(\d+)/.exec(s);
  const first = /(\d+)/.exec(s);
  const reps = range ? (Number(range[1]) + Number(range[2])) / 2 : first ? Number(first[1]) : null;
  if (reps == null) return { zone: "open", reps: null, work: null, sides };
  const zone: ZoneKey = reps <= 5 ? "strength" : reps <= 12 ? "hypertrophy" : "endurance";
  return { zone, reps, work: null, sides };
}

// Seconds per rep from a tempo like "31X1" or "3-1-1-0" (X, explosive, is about
// a second). A rep without one takes about three.
function secondsPerRep(tempo: string): number {
  const parts = tempo.toUpperCase().match(/[0-9X]/g);
  if (!parts || parts.length !== 4) return 3;
  return Math.max(1, parts.reduce((t, p) => t + (p === "X" ? 1 : Number(p)), 0));
}

// The rest a coach usually means when they leave the box empty: longer for
// heavy sets. Warm-up and cool-down rows just move on.
function typicalRest(read: RepRead, main: boolean): number {
  if (!main) return 15;
  if (read.zone === "strength") return 150;
  if (read.zone === "hypertrophy") return 90;
  return 60;
}

function exerciseSeconds(ex: StatsExercise, read: RepRead): number {
  const main = ex.section === "MAIN";
  const sets = Math.max(1, setCount(ex.sets));
  const work =
    (read.work ?? (read.reps ?? 10) * secondsPerRep(ex.tempo)) * read.sides;
  const rest = restSeconds(ex.rest) ?? typicalRest(read, main);
  // Setting up, loading the bar, walking to the next station.
  const changeover = main ? 60 : 30;
  return sets * work + (sets - 1) * rest + changeover;
}

function roundMinutes(seconds: number): number {
  const m = seconds / 60;
  if (m < 15) return Math.max(1, Math.round(m));
  return Math.round(m / 5) * 5;
}

export function formatSets(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatMinutes(m: number): string {
  if (m < 60) return `~${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `~${h} h ${rest} min` : `~${h} h`;
}

function listNames(names: string[]): string {
  const shown = names.slice(0, 3);
  const more = names.length - shown.length;
  const head = shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}` : shown[0];
  return more > 0 ? `${shown.join(", ")} and ${more} more` : head;
}

export function workoutStats(exercises: StatsExercise[], discipline: string): WorkoutStats {
  const kind = toDiscipline(discipline);
  const muscles = new Map<string, MuscleVolume>();
  const stretched = new Map<string, number>();
  const patterns = new Map<PatternKey, PatternCount>();
  const zones = new Map<ZoneKey, number>();
  const unknown: string[] = [];
  let seconds = 0;
  let onPath = 0;
  let restGuessed = 0;
  let push = 0;
  let pull = 0;

  const muscle = (key: string) => {
    let entry = muscles.get(key);
    if (!entry) {
      entry = { muscle: key, label: muscleLabel(key), sets: 0, direct: 0, indirect: 0, exercises: 0 };
      muscles.set(key, entry);
    }
    return entry;
  };

  for (const ex of exercises) {
    const name = ex.name.trim();
    if (!name) continue;
    const read = readReps(ex.reps);
    seconds += exerciseSeconds(ex, read);
    if (pathsThrough(name).length) onPath++;

    const archetype = archetypeFor(name);
    const mobility =
      kind === DISCIPLINES.MOBILITY ||
      archetype === "stretch" ||
      (disciplineForName(name) === DISCIPLINES.MOBILITY && archetype !== "cardio");
    const info = animationFor(name);
    const sets = setCount(ex.sets);

    if (mobility && archetype !== "cardio") {
      for (const m of info?.primary ?? []) stretched.set(m, (stretched.get(m) ?? 0) + 1);
    }
    if (ex.section !== "MAIN") continue;

    const pattern = mobility ? "mobility" : PATTERN_OF[archetype];
    if (pattern) {
      const p = patterns.get(pattern) ?? { key: pattern, label: PATTERN_LABELS[pattern], sets: 0, exercises: 0 };
      p.sets += sets;
      p.exercises += 1;
      patterns.set(pattern, p);
      if (pattern === "push") push += sets;
      if (pattern === "pull") pull += sets;
    }

    if (mobility || archetype === "cardio") continue;
    if (!ex.rest.trim()) restGuessed++;
    if (read.zone) zones.set(read.zone, (zones.get(read.zone) ?? 0) + sets);
    if (!info) {
      unknown.push(name);
      continue;
    }
    for (const m of info.primary) {
      const entry = muscle(m);
      entry.direct += sets;
      entry.exercises += 1;
    }
    for (const m of info.secondary) muscle(m).indirect += sets;
  }

  for (const entry of muscles.values()) entry.sets = entry.direct + entry.indirect / 2;
  const muscleList = [...muscles.values()]
    .filter((m) => m.sets > 0 || m.exercises > 0)
    .sort((a, b) => b.sets - a.sets || b.exercises - a.exercises || a.label.localeCompare(b.label));

  const strength = kind === DISCIPLINES.STRENGTH;
  const patternList = PATTERN_ORDER.filter(
    (k) => patterns.has(k) || (strength && BASIC_PATTERNS.has(k)),
  ).map((k) => patterns.get(k) ?? { key: k, label: PATTERN_LABELS[k], sets: 0, exercises: 0 });

  const notes: StatNote[] = [];
  const over = muscleList.filter((m) => m.sets > SESSION_SET_CEILING);
  if (strength && over.length) {
    const who = listNames(over.map((m) => `${m.label} (${formatSets(m.sets)})`));
    notes.push({
      tone: "flag",
      text: `${who} ${over.length === 1 ? "gets" : "get"} more than ${SESSION_SET_CEILING} sets — past that in one session, each extra set gives less back`,
    });
  }
  if (pull > 0 && push >= pull * 1.5) {
    notes.push({ tone: "flag", text: `More pushing than pulling — ${push} : ${pull} sets` });
  }
  const named = exercises.filter((e) => e.name.trim()).length;
  if (onPath > 0) {
    notes.push({
      tone: "info",
      text: `${onPath} of ${named} exercise${named === 1 ? "" : "s"} ${onPath === 1 ? "has" : "have"} a progression path — open one to see it`,
    });
  }
  if (unknown.length) {
    notes.push({
      tone: "info",
      text: `No muscle data for ${listNames(unknown)}, so ${unknown.length === 1 ? "it isn't" : "they aren't"} counted`,
    });
  }
  if (restGuessed) {
    notes.push({
      tone: "info",
      text: `Time assumes typical rest for ${restGuessed} exercise${restGuessed === 1 ? "" : "s"} with none set`,
    });
  }

  return {
    muscles: muscleList,
    stretched: [...stretched.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([m]) => muscleLabel(m)),
    patterns: patternList,
    zones: ZONES.filter((z) => (zones.get(z.key) ?? 0) > 0).map((z) => ({
      ...z,
      sets: zones.get(z.key) ?? 0,
    })),
    minutes: seconds > 0 ? roundMinutes(seconds) : 0,
    notes,
  };
}
