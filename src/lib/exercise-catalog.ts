// Reads and writes the trainer's own exercise names (the TrainerExercise
// table). Server-only — it talks to Prisma — and deliberately returns plain
// strings, so the results drop straight into a client component.

import { prisma } from "@/lib/db";
import { normalizeExerciseName, PRESET_SLUGS } from "@/lib/exercise-presets";

// What the picker needs: the trainer's most recent names, and the ones that
// aren't shipped presets. Both come from a single query.
export type PickerCatalog = {
  recent: string[];
  custom: string[];
};

export const RECENT_LIMIT = 10;

export const EMPTY_CATALOG: PickerCatalog = { recent: [], custom: [] };

export async function getPickerCatalog(
  trainerId: string,
): Promise<PickerCatalog> {
  const rows = await prisma.trainerExercise.findMany({
    where: { trainerId },
    orderBy: { lastUsedAt: "desc" },
    select: { name: true },
  });

  return {
    recent: rows.slice(0, RECENT_LIMIT).map((r) => r.name),
    // Custom is computed, not stored: a name promoted into the preset list in a
    // later release should leave "My exercises" on its own rather than showing
    // up in both places forever.
    custom: rows
      .map((r) => r.name)
      .filter((n) => !PRESET_SLUGS.has(normalizeExerciseName(n)))
      .sort((a, b) => a.localeCompare(b)),
  };
}

// Records every name a trainer just programmed, presets included — that's what
// keeps "Recent" honest. Two statements regardless of how long the workout is.
export async function recordExerciseNames(
  trainerId: string,
  names: string[],
): Promise<void> {
  // First spelling wins as the display form; the key collapses case and
  // whitespace so "bench press" and "Bench  Press" stay one row.
  const seen = new Map<string, string>();
  for (const name of names) {
    const nameKey = normalizeExerciseName(name);
    if (!nameKey || seen.has(nameKey)) continue;
    seen.set(nameKey, name.trim());
  }
  if (seen.size === 0) return;

  await prisma.trainerExercise.createMany({
    data: [...seen].map(([nameKey, name]) => ({ trainerId, name, nameKey })),
    skipDuplicates: true, // leans on @@unique([trainerId, nameKey])
  });

  await prisma.trainerExercise.updateMany({
    where: { trainerId, nameKey: { in: [...seen.keys()] } },
    data: { lastUsedAt: new Date() },
  });
}

// The variant the actions call. This table is a convenience index, not the
// coach's work — losing a row from "Recent" is a far better outcome than
// failing the save of a session they just spent five minutes writing.
export async function recordExerciseNamesSafely(
  trainerId: string,
  names: string[],
): Promise<void> {
  try {
    await recordExerciseNames(trainerId, names);
  } catch (err) {
    console.error("Failed to record exercise names", err);
  }
}
