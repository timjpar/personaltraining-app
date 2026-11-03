// Which path a movement is heading along for one athlete, and whether they've
// earned the next rung. Pure — no Prisma, no React — so the server can build a
// session's progressions and the builder can answer the same question in the
// browser as a coach types a name.

import { parseAmount, REP_UNITS, type LastResult } from "./exercise-progression";
import { setValuesFor, storedSetCount } from "./exercise-sets";
import { normalizeExerciseName } from "./exercise-presets";
import type { Discipline } from "./constants";
import {
  PROGRESSION_PATHS,
  pathsThrough,
  type PathPlace,
  type ProgressionPath,
  type ProgressionTarget,
} from "./progressions";

// A goal somebody chose, as resolveGoal needs it. Newest first.
export type GoalChoice = {
  exerciseKey: string;
  pathId: string;
  // Chosen by someone other than the athlete — their coach.
  byCoach: boolean;
};

// Why this path and not another, which the panel says out loud:
// - chosen: picked on this movement, by the athlete or their coach
// - following: picked on another movement of the same path — the athlete moved
//   up a rung, and the goal they chose lower down still holds
// - custom: a path someone wrote for this athlete that includes this movement
// - auto: the app's pick, from the shipped catalog
export type GoalSource = "chosen" | "following" | "custom" | "auto";

export type ResolvedGoal = PathPlace & { source: GoalSource; byCoach: boolean };

export function resolveGoal(
  name: string,
  {
    customPaths = [],
    choices = [],
    discipline,
  }: {
    // Newest first. Searched ahead of the shipped catalog.
    customPaths?: ProgressionPath[];
    choices?: GoalChoice[];
    discipline?: Discipline;
  } = {},
): { goal: ResolvedGoal | null; others: PathPlace[] } {
  const places = pathsThrough(name, {
    paths: [...customPaths, ...PROGRESSION_PATHS],
    discipline,
  });
  if (places.length === 0) return { goal: null, others: [] };

  const key = normalizeExerciseName(name);
  const placeOf = (pathId: string) => places.find((p) => p.path.id === pathId);

  let goal: ResolvedGoal | null = null;

  const own = choices.find((c) => c.exerciseKey === key && placeOf(c.pathId));
  if (own) {
    goal = { ...placeOf(own.pathId)!, source: "chosen", byCoach: own.byCoach };
  }

  if (!goal) {
    const followed = choices.find((c) => placeOf(c.pathId));
    if (followed) {
      goal = {
        ...placeOf(followed.pathId)!,
        source: "following",
        byCoach: followed.byCoach,
      };
    }
  }

  if (!goal) {
    const custom = places.find((p) => p.path.family === "custom");
    if (custom) goal = { ...custom, source: "custom", byCoach: false };
  }

  if (!goal) goal = { ...places[0], source: "auto", byCoach: false };

  const chosen = goal;
  return { goal: chosen, others: places.filter((p) => p.path !== chosen.path) };
}

// How a hold was typed into the reps box: "30s", "30 sec", "1:30", "2 min", or
// a bare "30" — which is seconds here, because the target asking is a hold.
const SECOND_UNITS = new Set(["", "s", "sec", "secs", "second", "seconds"]);
const MINUTE_UNITS = new Set(["min", "mins", "minute", "minutes"]);
const CLOCK = /^(\d+):([0-5]\d)$/;

function secondsOf(raw: string): number | null {
  const clock = CLOCK.exec(raw.trim());
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const amount = parseAmount(raw);
  if (!amount) return null;
  if (SECOND_UNITS.has(amount.unit)) return amount.value;
  if (MINUTE_UNITS.has(amount.unit)) return amount.value * 60;
  return null;
}

function repsOf(raw: string): number | null {
  const amount = parseAmount(raw);
  return amount && REP_UNITS.has(amount.unit) ? amount.value : null;
}

export type Readiness = {
  ready: boolean;
  // Sets that reached the target, out of the sets it asks for.
  met: number;
  needed: number;
  // What was logged for each set, as typed, blanks dropped.
  logged: string[];
};

// Whether the last logged result for a movement meets its step's target. Null
// when there's nothing to judge: no target (a step judged by eye or by load),
// no history, or a history whose numbers can't be read — "AMRAP" is an honest
// result and not a failed one.
export function readiness(
  target: ProgressionTarget | undefined,
  last: LastResult | undefined,
): Readiness | null {
  if (!target || !last) return null;
  const count = storedSetCount(last);
  if (count === 0) return null;

  const values = setValuesFor(last.reps, count).filter((v) => v !== "");
  const read = values.map((v) => (target.seconds != null ? secondsOf(v) : repsOf(v)));
  if (read.every((n) => n == null)) return null;

  const goal = target.seconds ?? target.reps ?? Infinity;
  const met = read.filter((n) => n != null && n >= goal).length;
  return { ready: met >= target.sets, met, needed: target.sets, logged: values };
}
