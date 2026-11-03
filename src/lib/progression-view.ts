// The progressions for one session, as the panel under each exercise draws
// them. Server-only (it talks to Prisma): it reads the athlete's own goals and
// written paths once, shapes the written ones into the same ProgressionPath the
// shipped catalog uses, and hands the pure resolver in progression-goals.ts
// everything it needs. What comes back is plain data, so it drops straight
// into a client component.

import { prisma } from "@/lib/db";
import { normalizeExerciseName } from "@/lib/exercise-presets";
import type { LastResult } from "@/lib/exercise-progression";
import type { Discipline } from "@/lib/constants";
import {
  readiness,
  resolveGoal,
  type GoalChoice,
  type Readiness,
  type ResolvedGoal,
} from "@/lib/progression-goals";
import type {
  PathPlace,
  ProgressionPath,
  ProgressionTarget,
} from "@/lib/progressions";

export const CUSTOM_PREFIX = "custom:";

export type ProgressionView = {
  athleteId: string;
  exerciseName: string;
  goal: ResolvedGoal;
  // Every other path this movement sits on, for "See all paths".
  others: PathPlace[];
  // Whether the result being judged — last time's on a session still being
  // logged, this one's on a finished one — meets the current step's target.
  readiness: Readiness | null;
};

type StepRow = {
  name: string;
  how: string | null;
  when: string | null;
  weeks: string | null;
  targetSets: number | null;
  targetReps: number | null;
  targetSeconds: number | null;
};

function targetOf(step: StepRow): ProgressionTarget | undefined {
  const sets = step.targetSets ?? 1;
  if (step.targetSeconds != null) return { sets, seconds: step.targetSeconds };
  if (step.targetReps != null) return { sets, reps: step.targetReps };
  return undefined;
}

export function customPathOf(row: {
  id: string;
  goal: string;
  blurb: string | null;
  steps: StepRow[];
}): ProgressionPath {
  return {
    id: `${CUSTOM_PREFIX}${row.id}`,
    goal: row.goal,
    family: "custom",
    blurb: row.blurb ?? "",
    steps: row.steps.map((s) => ({
      name: s.name,
      how: s.how ?? "",
      when: s.when ?? undefined,
      target: targetOf(s),
      weeks: s.weeks ?? undefined,
    })),
  };
}

// The athlete's written paths and goal choices, newest first — the order
// resolveGoal wants both in.
export async function getProgressionContext(athleteId: string): Promise<{
  customPaths: ProgressionPath[];
  choices: GoalChoice[];
}> {
  const [paths, goals] = await Promise.all([
    prisma.progressionPath.findMany({
      where: { athleteId },
      orderBy: { updatedAt: "desc" },
      include: { steps: { orderBy: { order: "asc" } } },
    }),
    prisma.progressionGoal.findMany({
      where: { athleteId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    customPaths: paths.map(customPathOf),
    choices: goals.map((g) => ({
      exerciseKey: g.exerciseKey,
      pathId: g.builtinPath ?? `${CUSTOM_PREFIX}${g.customPathId}`,
      // A goal whose setter's account is gone reads as the athlete's own: it
      // was chosen for them, and nobody is left to attribute it to.
      byCoach: g.setById != null && g.setById !== athleteId,
    })),
  };
}

// One entry per movement that sits on any path, keyed by normalized name. A
// movement on no path is simply absent, and its card draws no panel.
export async function getProgressions(
  athleteId: string,
  exercises: { name: string; result?: LastResult }[],
  discipline?: Discipline,
): Promise<Map<string, ProgressionView>> {
  const context = await getProgressionContext(athleteId);
  const views = new Map<string, ProgressionView>();

  for (const { name, result } of exercises) {
    const key = normalizeExerciseName(name);
    if (!key || views.has(key)) continue;
    const { goal, others } = resolveGoal(name, { ...context, discipline });
    if (!goal) continue;
    views.set(key, {
      athleteId,
      exerciseName: name,
      goal,
      others,
      readiness: readiness(goal.path.steps[goal.index]?.target, result),
    });
  }

  return views;
}
