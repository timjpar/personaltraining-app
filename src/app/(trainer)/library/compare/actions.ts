"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { WORKOUT_STATUS } from "@/lib/constants";
import { boardWeek, boardWorkouts } from "@/lib/board-load";
import { exerciseColumns, parseBoardSave } from "@/lib/board-form";
import { MAX_COLUMNS, type BoardWeek, type BoardWorkout } from "@/lib/board-order";
import { recordExerciseNamesSafely } from "@/lib/exercise-catalog";
import { syncAfterMutation } from "@/lib/calendar-sync";
import { revalidateAssignedWorkouts } from "@/lib/assignees";

// Reads for the board, as actions so adding a column or stepping a week doesn't
// reload the page and lose what's unsaved on it. They change nothing, so they
// revalidate nothing.
export async function loadBoardWorkouts(keys: string[]): Promise<BoardWorkout[]> {
  const trainer = await requireTrainer();
  if (!Array.isArray(keys)) return [];
  return boardWorkouts(trainer.id, keys.slice(0, MAX_COLUMNS).map(String));
}

export async function loadBoardWeek(
  src: string,
  week: string | null,
): Promise<{ week: BoardWeek; workouts: BoardWorkout[] } | null> {
  const trainer = await requireTrainer();
  return boardWeek(trainer.id, String(src ?? ""), week == null ? null : String(week));
}

// The board's exercise shelf, saved to the coach's account as it changes so
// it's still there next time. Names only, trimmed, de-duplicated, and capped
// so a runaway client can't store an essay.
const SHELF_LIMIT = 60;
export async function saveBoardShelf(names: unknown): Promise<{ ok: boolean }> {
  const trainer = await requireTrainer();
  if (!Array.isArray(names)) return { ok: false };
  const seen = new Set<string>();
  const shelf: string[] = [];
  for (const raw of names) {
    if (typeof raw !== "string") continue;
    const name = raw.trim().slice(0, 120);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    shelf.push(name);
    if (shelf.length >= SHELF_LIMIT) break;
  }
  await prisma.user.update({ where: { id: trainer.id }, data: { boardShelf: shelf } });
  return { ok: true };
}

export type BoardSaveState =
  | { ok: true; workouts: BoardWorkout[] }
  | { ok: false; error?: string; errors?: Record<string, string> };

const CHANGED_ELSEWHERE =
  "This workout was changed somewhere else after you opened it. Reload the page to get the latest, then make your change again.";

// Every changed workout on the board, in one transaction: all of them save or
// none do.
//
// Library workouts replace their rows, as updateTemplate does. Sessions don't.
// A session's rows are diffed against what's stored: a row the board already
// knew is updated in place, a new one is created, and one that's gone is
// deleted. Replacing them would delete whatever the athlete has already ticked
// off (see setWorkoutAttendance in workout-actions.ts, which avoids
// updateWorkout for the same reason), and in place is also what lets a ticked
// row move to another of that person's sessions with its tick.
export async function saveBoard(entries: unknown): Promise<BoardSaveState> {
  const trainer = await requireTrainer();

  const parsed = parseBoardSave(entries);
  if (!parsed.data) return { ok: false, error: parsed.error, errors: parsed.errors };
  const workouts = parsed.data;
  const templates = workouts.filter((w) => w.kind === "template");
  const sessions = workouts.filter((w) => w.kind === "session");

  const [ownedTemplates, ownedSessions] = await Promise.all([
    templates.length
      ? prisma.workoutTemplate.findMany({
          where: { id: { in: templates.map((t) => t.id) }, trainerId: trainer.id },
          select: { id: true, updatedAt: true },
        })
      : [],
    sessions.length
      ? prisma.workout.findMany({
          where: { id: { in: sessions.map((s) => s.id) }, trainerId: trainer.id },
          select: {
            id: true,
            status: true,
            clientId: true,
            client: { select: { name: true } },
            exercises: { select: { id: true } },
          },
        })
      : [],
  ]);

  const errors: Record<string, string> = {};
  const templateById = new Map(ownedTemplates.map((t) => [t.id, t]));
  for (const t of templates) {
    const owned = templateById.get(t.id);
    if (!owned) errors[t.key] = "This workout isn't in your library any more.";
    else if (owned.updatedAt.getTime() !== t.version?.getTime()) errors[t.key] = CHANGED_ELSEWHERE;
  }
  const sessionById = new Map(ownedSessions.map((s) => [s.id, s]));
  for (const s of sessions) {
    const owned = sessionById.get(s.id);
    if (!owned) errors[s.key] = "This session has been deleted.";
    else if (owned.status === WORKOUT_STATUS.COMPLETED) {
      errors[s.key] = "This session has been logged since you opened it, so it can't be changed here.";
    }
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  // Whose session each stored row is in. A row keeps its id — and with it any
  // sets the athlete already logged — only within one person's sessions; moved
  // to somebody else's, it arrives as a fresh row, because what one athlete
  // lifted is not another's result.
  const rowOwner = new Map<string, string>();
  for (const s of ownedSessions) for (const e of s.exercises) rowOwner.set(e.id, s.clientId);

  const kept = new Set<string>();
  const updates = [];
  const creates = [];
  for (const s of sessions) {
    const clientId = sessionById.get(s.id)!.clientId;
    for (const e of s.exercises) {
      const exercise = exerciseColumns(e);
      if (rowOwner.get(e.rowId) === clientId) {
        kept.add(e.rowId);
        updates.push(
          prisma.exercise.update({
            where: { id: e.rowId },
            data: { ...exercise, workoutId: s.id },
          }),
        );
      } else {
        creates.push({ ...exercise, workoutId: s.id });
      }
    }
  }
  const gone = [...rowOwner.keys()].filter((id) => !kept.has(id));

  try {
    await prisma.$transaction([
      ...(gone.length ? [prisma.exercise.deleteMany({ where: { id: { in: gone } } })] : []),
      ...updates,
      ...(creates.length ? [prisma.exercise.createMany({ data: creates })] : []),
      // The status and updatedAt filters repeat the checks above inside the
      // transaction, so a session logged or a library workout edited in the
      // moments between them fails the whole save rather than being
      // overwritten.
      ...sessions.map((s) =>
        prisma.workout.update({
          where: { id: s.id, trainerId: trainer.id, status: { not: WORKOUT_STATUS.COMPLETED } },
          data: { title: s.title, notes: s.notes, scheduledDate: s.scheduledDate! },
        }),
      ),
      ...templates.flatMap((t) => [
        prisma.templateExercise.deleteMany({ where: { templateId: t.id } }),
        prisma.workoutTemplate.update({
          where: { id: t.id, trainerId: trainer.id, updatedAt: t.version! },
          data: {
            title: t.title,
            notes: t.notes,
            exercises: { create: t.exercises.map(exerciseColumns) },
          },
        }),
      ]),
    ]);
  } catch (err) {
    // P2025: an update's where clause matched nothing.
    if ((err as { code?: string })?.code === "P2025") {
      return { ok: false, error: CHANGED_ELSEWHERE };
    }
    throw err;
  }

  // Outside the transaction on purpose, as in updateTemplate: the catalog is a
  // convenience index and must never roll back a save.
  await recordExerciseNamesSafely(
    trainer.id,
    workouts.flatMap((w) => w.exercises.map((e) => e.name)),
  );

  if (templates.length) {
    revalidatePath("/library");
    for (const t of templates) revalidatePath(`/library/${t.id}`);
  }
  if (sessions.length) {
    const people = new Map<string, string>();
    for (const s of sessions) {
      const owned = sessionById.get(s.id)!;
      people.set(owned.clientId, owned.client.name);
      revalidatePath(`/workouts/${s.id}`);
      revalidatePath(`/me/workouts/${s.id}`);
    }
    syncAfterMutation(trainer.id, ...people.keys());
    revalidateAssignedWorkouts(
      trainer.id,
      [...people].map(([id, name]) => ({ id, name })),
    );
    // A moved session leaves one day page and lands on another.
    revalidatePath("/calendar/[date]", "page");
  }

  return { ok: true, workouts: await boardWorkouts(trainer.id, workouts.map((w) => w.key)) };
}
