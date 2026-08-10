// Reads and writes the trainer's own exercise names (the TrainerExercise
// table). Server-only — it talks to Prisma — and deliberately returns plain
// strings, so the results drop straight into a client component.

import { prisma } from "@/lib/db";
import { normalizeExerciseName, PRESET_SLUGS } from "@/lib/exercise-presets";
import { parseVideoUrl } from "@/lib/video-embed";

// What the picker needs: the trainer's most recent names, and the ones that
// aren't shipped presets. Both come from a single query.
export type PickerCatalog = {
  recent: string[];
  custom: string[];
  // nameKey → the demo URL saved against it, for every movement that has one.
  // Carried with the picker so the workout builder can tell a coach that the
  // movement they just typed already has a video, without a request per row.
  media: Record<string, string>;
};

export const RECENT_LIMIT = 10;

export const EMPTY_CATALOG: PickerCatalog = { recent: [], custom: [], media: {} };

export async function getPickerCatalog(
  trainerId: string,
): Promise<PickerCatalog> {
  const rows = await prisma.trainerExercise.findMany({
    where: { trainerId },
    orderBy: { lastUsedAt: "desc" },
    select: { name: true, nameKey: true, mediaUrl: true },
  });

  return {
    recent: rows.slice(0, RECENT_LIMIT).map((r) => r.name),
    media: Object.fromEntries(
      rows.filter((r) => r.mediaUrl).map((r) => [r.nameKey, r.mediaUrl as string]),
    ),
    // Custom is computed, not stored: a name promoted into the preset list in a
    // later release should leave "My exercises" on its own rather than showing
    // up in both places forever.
    custom: rows
      .map((r) => r.name)
      .filter((n) => !PRESET_SLUGS.has(normalizeExerciseName(n)))
      .sort((a, b) => a.localeCompare(b)),
  };
}

// Just the URL the trainer pasted. Which platform it is, and whether it can be
// embedded at all, is derived at render by parseVideoUrl — so nothing here goes
// stale when that parser learns a new format.
export type ExerciseMedia = { url: string };

// Resolves the trainer's own demo media for a whole session in one query,
// keyed by normalized name. Callers do a Map lookup per exercise rather than
// a query per exercise.
export async function getExerciseMedia(
  trainerId: string,
  names: string[],
): Promise<Map<string, ExerciseMedia>> {
  const keys = [...new Set(names.map(normalizeExerciseName).filter(Boolean))];
  if (keys.length === 0) return new Map();

  const rows = await prisma.trainerExercise.findMany({
    where: { trainerId, nameKey: { in: keys }, mediaUrl: { not: null } },
    select: { nameKey: true, mediaUrl: true },
  });

  return new Map(rows.map((r) => [r.nameKey, { url: r.mediaUrl as string }]));
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

// Demo links pasted onto builder rows. Media belongs to the *name*, not to the
// session that happened to carry the link, so this writes the trainer's catalog
// entry — the same row and column the Exercises page manages.
//
// Runs after recordExerciseNames, which guarantees a row exists for every name
// in the session; the upsert's create branch is only there for the ordering to
// stop mattering. A blank field is not a removal: taking media off a movement
// is its own deliberate act on /exercises, and inferring it from an empty box
// would let one re-saved session quietly strip a demo off every other one.
export async function saveExerciseMedia(
  trainerId: string,
  media: { name: string; url: string }[],
): Promise<void> {
  const seen = new Map<string, { name: string; url: string }>();
  for (const m of media) {
    const nameKey = normalizeExerciseName(m.name);
    if (!nameKey || !m.url) continue;
    seen.set(nameKey, { name: m.name.trim(), url: m.url });
  }
  if (seen.size === 0) return;

  for (const [nameKey, { name, url }] of seen) {
    await prisma.trainerExercise.upsert({
      where: { trainerId_nameKey: { trainerId, nameKey } },
      // Kind is recorded for the label on the manage list; playback always
      // re-derives from the URL, so this never goes stale.
      update: { mediaUrl: url, mediaKind: parseVideoUrl(url).provider },
      create: {
        trainerId,
        name,
        nameKey,
        mediaUrl: url,
        mediaKind: parseVideoUrl(url).provider,
      },
    });
  }
}

// Same bargain recordExerciseNamesSafely strikes, for the same reason: a demo
// link that failed to attach is a far better outcome than losing the session it
// was pasted into.
export async function saveExerciseMediaSafely(
  trainerId: string,
  media: { name: string; url: string }[],
): Promise<void> {
  try {
    await saveExerciseMedia(trainerId, media);
  } catch (err) {
    console.error("Failed to save exercise media", err);
  }
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
