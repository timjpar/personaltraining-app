"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizeExerciseName } from "@/lib/exercise-presets";
import { PATHS_BY_ID, stepIndex } from "@/lib/progressions";
import { CUSTOM_PREFIX, customPathOf } from "@/lib/progression-view";

// Goals and written paths for one athlete. Both roles call these: the athlete
// for themselves, and their coach for them — which is the whole of who may.
// Everything is keyed on athleteId rather than on a workout, because a goal
// belongs to the person and follows the movement into every session.

export type ProgressionResult = { error?: string };

const NOT_YOURS = "You can only set progressions for yourself or your clients.";

// The person acting, if they may act for this athlete: the athlete, or the
// coach the athlete belongs to.
async function actorFor(athleteId: string) {
  const actor = await requireUser();
  if (actor.id === athleteId) return actor;
  const client = await prisma.user.findFirst({
    where: { id: athleteId, trainerId: actor.id },
    select: { id: true },
  });
  return client ? actor : null;
}

function customId(pathId: string) {
  return pathId.startsWith(CUSTOM_PREFIX) ? pathId.slice(CUSTOM_PREFIX.length) : null;
}

export async function chooseProgressionPath(
  athleteId: string,
  exerciseName: string,
  pathId: string,
): Promise<ProgressionResult> {
  const actor = await actorFor(athleteId);
  if (!actor) return { error: NOT_YOURS };
  const exerciseKey = normalizeExerciseName(exerciseName);
  if (!exerciseKey) return { error: "That movement has no name." };

  // The path has to exist for this athlete and include the movement — a goal
  // that names a path it isn't on is one resolveGoal would silently skip.
  const custom = customId(pathId);
  let path = custom ? null : PATHS_BY_ID.get(pathId) ?? null;
  if (custom) {
    const row = await prisma.progressionPath.findFirst({
      where: { id: custom, athleteId },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    path = row ? customPathOf(row) : null;
  }
  if (!path) return { error: "That path is gone. Refresh and try again." };
  if (stepIndex(path, exerciseName) < 0) {
    return { error: `${exerciseName} isn't a step on that path.` };
  }

  const fields = {
    builtinPath: custom ? null : pathId,
    customPathId: custom,
    setById: actor.id,
  };
  await prisma.progressionGoal.upsert({
    where: { athleteId_exerciseKey: { athleteId, exerciseKey } },
    create: { athleteId, exerciseKey, ...fields },
    update: fields,
  });
  refresh();
  return {};
}

// Back to the app's pick: no row is the automatic state.
export async function resetProgressionGoal(
  athleteId: string,
  exerciseName: string,
): Promise<ProgressionResult> {
  const actor = await actorFor(athleteId);
  if (!actor) return { error: NOT_YOURS };
  await prisma.progressionGoal.deleteMany({
    where: { athleteId, exerciseKey: normalizeExerciseName(exerciseName) },
  });
  refresh();
  return {};
}

export type StepInput = {
  name: string;
  how?: string;
  when?: string;
  weeks?: string;
  targetSets?: number | null;
  targetReps?: number | null;
  targetSeconds?: number | null;
};

const MAX_STEPS = 20;
const MAX_TEXT = 600;

const text = (v: unknown, max = MAX_TEXT) =>
  typeof v === "string" ? v.trim().slice(0, max) || null : null;

const count = (v: unknown, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= max ? v : null;

// Writes a path for this athlete — a new one, or an edit to one of theirs —
// and, when it includes `chooseFor`, makes it that movement's goal in the same
// step, since writing a path on a movement is choosing it there.
export async function saveProgressionPath(
  athleteId: string,
  input: {
    pathId?: string;
    goal: string;
    blurb?: string;
    steps: StepInput[];
  },
  chooseFor?: string,
): Promise<ProgressionResult & { pathId?: string }> {
  const actor = await actorFor(athleteId);
  if (!actor) return { error: NOT_YOURS };

  const steps = input.steps
    .map((s) => {
      const targetReps = count(s.targetReps, 999);
      const targetSeconds = targetReps ? null : count(s.targetSeconds, 3600);
      return {
        name: text(s.name, 120),
        how: text(s.how),
        when: text(s.when),
        weeks: text(s.weeks, 60),
        targetSets: targetReps || targetSeconds ? count(s.targetSets, 20) ?? 1 : null,
        targetReps,
        targetSeconds,
      };
    })
    .filter((s): s is typeof s & { name: string } => Boolean(s.name));
  if (steps.length < 2) return { error: "A path needs at least two steps." };
  if (steps.length > MAX_STEPS) {
    return { error: `A path can have up to ${MAX_STEPS} steps.` };
  }
  const goal = text(input.goal, 120) ?? steps[steps.length - 1].name;
  const blurb = text(input.blurb);
  const rows = steps.map((s, order) => ({ ...s, order }));

  const existing = input.pathId ? customId(input.pathId) : null;
  let id: string;
  if (existing) {
    const owned = await prisma.progressionPath.findFirst({
      where: { id: existing, athleteId },
      select: { id: true },
    });
    if (!owned) return { error: "That path is gone. Refresh and try again." };
    // Steps are replaced wholesale, as the workout builder does exercise rows.
    await prisma.$transaction([
      prisma.progressionStep.deleteMany({ where: { pathId: existing } }),
      prisma.progressionPath.update({
        where: { id: existing },
        data: { goal, blurb, steps: { create: rows } },
      }),
    ]);
    id = existing;
  } else {
    const created = await prisma.progressionPath.create({
      data: { athleteId, authorId: actor.id, goal, blurb, steps: { create: rows } },
      select: { id: true },
    });
    id = created.id;
  }

  const exerciseKey = chooseFor ? normalizeExerciseName(chooseFor) : "";
  if (exerciseKey && steps.some((s) => normalizeExerciseName(s.name) === exerciseKey)) {
    const fields = { builtinPath: null, customPathId: id, setById: actor.id };
    await prisma.progressionGoal.upsert({
      where: { athleteId_exerciseKey: { athleteId, exerciseKey } },
      create: { athleteId, exerciseKey, ...fields },
      update: fields,
    });
  }

  refresh();
  return { pathId: `${CUSTOM_PREFIX}${id}` };
}

// Deleting a path cascades its goals away, so the movements it was chosen on
// fall back to their automatic goal.
export async function deleteProgressionPath(
  athleteId: string,
  pathId: string,
): Promise<ProgressionResult> {
  const actor = await actorFor(athleteId);
  if (!actor) return { error: NOT_YOURS };
  const id = customId(pathId);
  if (!id) return { error: "Only a path somebody wrote can be deleted." };
  await prisma.progressionPath.deleteMany({ where: { id, athleteId } });
  refresh();
  return {};
}
