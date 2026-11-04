// Which workout on the week an exercise from the board's shelf would fit best.
//
// Three things decide it, in this order of weight:
// - a session has a ceiling for one muscle (SESSION_SET_CEILING, about 11
//   working sets) past which each extra set buys less, so a workout already
//   near it for this exercise's muscles is a poor home;
// - a muscle trained hard wants a day or so before it's trained hard again,
//   so putting the exercise into a workout that doesn't already work those
//   muscles is a poor fit when the day before or after does;
// - a workout that already trains those muscles is a good home, since it
//   keeps the other days fresh — as long as the ceiling holds.
// The exercise's own kind of training counts too: a fingerboard hang belongs
// with the climbing sessions. Pure, so the board and its tests agree.
import {
  DISCIPLINES,
  DISCIPLINE_LABELS,
  SECTION_ORDER,
  type Discipline,
  type ExerciseSection,
} from "@/lib/constants";
import { SESSION_SET_CEILING, workoutStats, type StatsExercise } from "@/lib/workout-stats";
import {
  EXERCISE_PRESETS,
  SECTION_PRESET_CATEGORY,
  disciplineForName,
  normalizeExerciseName,
} from "@/lib/exercise-presets";
import type { BoardWorkout } from "@/lib/board-order";

// What an exercise off the shelf comes in as, until the coach changes it.
export const SHELF_SETS = "3";

// A muscle worked hard enough to need recovering from: two or more direct
// working sets in a day.
const HARD_SETS = 2;

export type Volume = Map<string, { label: string; sets: number }>;

const volumeOf = (rows: StatsExercise[], discipline: string): Volume =>
  new Map(
    workoutStats(rows, discipline)
      .muscles.filter((m) => m.sets > 0)
      .map((m) => [m.muscle, { label: m.label, sets: m.sets }]),
  );

export function workoutVolume(w: BoardWorkout): Volume {
  return volumeOf(
    SECTION_ORDER.flatMap((section) => w.rows[section].map((row) => ({ ...row, section }))),
    w.discipline,
  );
}

// The section an exercise goes in: a warm-up movement leads, a stretch
// closes, anything else is the main work.
const SECTION_OF = new Map<string, ExerciseSection>();
for (const [section, label] of Object.entries(SECTION_PRESET_CATEGORY)) {
  for (const name of EXERCISE_PRESETS.find((c) => c.label === label)?.exercises ?? []) {
    SECTION_OF.set(normalizeExerciseName(name), section as ExerciseSection);
  }
}
export const sectionFor = (name: string): ExerciseSection =>
  SECTION_OF.get(normalizeExerciseName(name)) ?? "MAIN";

const asRow = (name: string): StatsExercise => ({
  name,
  sets: SHELF_SETS,
  reps: "",
  rest: "",
  tempo: "",
  section: sectionFor(name),
});

export function exerciseVolume(name: string): Volume {
  return volumeOf([asRow(name)], disciplineForName(name) ?? "STRENGTH");
}

// What a stretch or mobility drill goes after, by label ("Hip flexors"). A
// stretch works nothing, so this is what it's matched on instead.
export function exerciseStretches(name: string): string[] {
  return workoutStats([asRow(name)], disciplineForName(name) ?? "MOBILITY").stretched;
}

export type DaySlot = {
  // Hidden and past days get no suggestion.
  open: boolean;
  label: string;
  workouts: { workout: BoardWorkout; volume: Volume }[];
};

export type Suggestion = { key: string; day: number; title: string; reason: string };

const list = (labels: string[]) =>
  labels.length <= 2
    ? labels.join(" and ")
    : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;

/**
 * The best workouts for an exercise, best first, at most `limit`. `cyclic` is
 * for the library's week, which repeats, so Saturday sits beside Sunday.
 */
export function suggestWorkouts(
  name: string,
  days: DaySlot[],
  { cyclic, limit = 2 }: { cyclic: boolean; limit?: number },
): Suggestion[] {
  const mine = exerciseVolume(name);
  const stretches = mine.size ? [] : exerciseStretches(name).map((l) => l.toLowerCase());
  const kind = disciplineForName(name);
  const warmup = sectionFor(name) !== "MAIN";
  const n = days.length;
  const near = (i: number, d: number) => {
    const j = i + d;
    if (cyclic) return days[(j + n) % n];
    return j >= 0 && j < n ? days[j] : undefined;
  };
  // What each day trains hard, all its workouts together.
  const hard = days.map((d) => {
    const out = new Map<string, number>();
    for (const { volume } of d.workouts)
      for (const [m, v] of volume) out.set(m, (out.get(m) ?? 0) + v.sets);
    return new Set([...out].filter(([, s]) => s >= HARD_SETS).map(([m]) => m));
  });

  const scored = days.flatMap((day, i) =>
    !day.open
      ? []
      : day.workouts
          .filter(({ workout }) => !workout.locked)
          .map(({ workout, volume }) => {
            const title = workout.title.trim() || "Untitled workout";
            let score = 0;
            const over: string[] = [];
            const shared: string[] = [];
            const tired: { m: string; d: string }[] = [];
            for (const [m, v] of mine) {
              const have = volume.get(m)?.sets ?? 0;
              if (have > 0) {
                shared.push(v.label.toLowerCase());
                score -= 1;
                if (have + v.sets > SESSION_SET_CEILING) {
                  over.push(`${v.label.toLowerCase()} to ${Math.round(have + v.sets)} sets`);
                  score += 4;
                }
              } else if (!warmup) {
                for (const side of [near(i, -1), near(i, 1)]) {
                  const j = side ? days.indexOf(side) : -1;
                  if (j >= 0 && hard[j].has(m)) {
                    tired.push({ m: v.label.toLowerCase(), d: side!.label });
                    score += 2;
                  }
                }
              }
            }
            // Warm-ups and stretches go in anything; main work belongs with
            // its own kind of session.
            // A stretch is best after the work that tightens what it stretches.
            const eases = stretches.filter((l) =>
              [...volume.values()].some((v) => v.sets >= HARD_SETS && v.label.toLowerCase() === l),
            );
            score -= eases.length;
            const wrongKind =
              !warmup && kind != null && kind !== DISCIPLINES.MOBILITY && kind !== workout.discipline;
            if (wrongKind) score += 3;
            // A lighter session takes one more exercise more easily.
            score += 0.05 * SECTION_ORDER.reduce((t, s) => t + workout.rows[s].length, 0);

            let reason: string;
            if (over.length) reason = `It would take ${list(over)}, past about ${SESSION_SET_CEILING} a session`;
            else if (tired.length)
              reason = `${list([...new Set(tired.map((t) => `${t.m} on ${t.d}`))])} would get little rest`;
            else if (shared.length)
              reason = warmup
                ? `Warms up the ${list(shared)} this workout trains`
                : `Already works ${list(shared)}, with room for ${SHELF_SETS} more sets`;
            else if (eases.length) reason = `Stretches the ${list(eases)} this workout trains`;
            else if (mine.size)
              reason = `Nothing for ${list([...mine.values()].map((v) => v.label.toLowerCase()))} the day before or after`;
            else reason = "The lightest workout that fits";
            if (wrongKind) {
              const label = DISCIPLINE_LABELS[workout.discipline as Discipline] ?? workout.discipline;
              reason += `, though it isn't a ${label.toLowerCase()} movement`;
            }
            return { key: workout.key, day: i, title, score, reason };
          }),
  );

  scored.sort((a, b) => a.score - b.score || a.day - b.day);
  const sentence = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);
  return scored
    .slice(0, limit)
    .map(({ key, day, title, reason }) => ({ key, day, title, reason: sentence(reason) }));
}
