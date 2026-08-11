// "What did I do last time?" — the athlete's own most recent logged result for
// each movement in a session. Server-only (it talks to Prisma) and returns
// plain strings, so the results drop straight into a client component.

import { prisma } from "@/lib/db";
import { normalizeExerciseName } from "@/lib/exercise-presets";
import type { LastResult } from "@/lib/exercise-progression";

// How far back to look, in completed sessions. Deep enough that a movement
// trained every other week is still found, shallow enough that the query stays
// a fixed, small amount of work no matter how long someone has been training.
// A result from two years ago is not "last time" in any useful sense anyway.
export const LOOKBACK_SESSIONS = 50;

// Matched on the normalized name, because that is the only identity an exercise
// has: Exercise.name is a denormalized string with no foreign key to the
// trainer's catalog (see the TrainerExercise comment in schema.prisma), and row
// ids are not stable — updateWorkout deletes and recreates every row.
//
// Resolves a whole session in one round trip, keyed by normalized name, the
// same bargain getExerciseMedia strikes: a Map lookup per exercise rather than
// a query per exercise.
export async function getLastResults(
  clientId: string,
  excludeWorkoutId: string,
  names: string[],
): Promise<Map<string, LastResult>> {
  const wanted = new Set(names.map(normalizeExerciseName).filter(Boolean));
  if (wanted.size === 0) return new Map();

  const sessions = await prisma.workout.findMany({
    where: {
      clientId,
      status: "COMPLETED",
      // The session being logged right now is excluded rather than assumed
      // absent: this page is also reachable on a workout that was completed and
      // is being looked at again.
      id: { not: excludeWorkoutId },
    },
    // completedAt is nullable and Postgres sorts NULLs first on DESC, which
    // would float every pre-completedAt workout to the top and let the oldest
    // sessions in the database answer "last time". scheduledDate breaks the
    // remaining ties.
    orderBy: [
      { completedAt: { sort: "desc", nulls: "last" } },
      { scheduledDate: "desc" },
    ],
    take: LOOKBACK_SESSIONS,
    select: {
      exercises: {
        select: {
          name: true,
          resultSets: true,
          resultReps: true,
          resultLoad: true,
        },
      },
    },
  });

  const last = new Map<string, LastResult>();
  for (const session of sessions) {
    for (const ex of session.exercises) {
      const key = normalizeExerciseName(ex.name);
      // Sessions arrive newest-first, so the first hit for a name is the most
      // recent one and later sessions must not overwrite it.
      if (!wanted.has(key) || last.has(key)) continue;
      // A row that was skipped, or done without logging anything, has nothing
      // to say — keep walking back to the session that does.
      if (!ex.resultSets && !ex.resultReps && !ex.resultLoad) continue;
      last.set(key, {
        sets: ex.resultSets,
        reps: ex.resultReps,
        load: ex.resultLoad,
      });
    }
    if (last.size === wanted.size) break;
  }

  return last;
}
