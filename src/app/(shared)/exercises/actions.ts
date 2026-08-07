"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { normalizeExerciseName, PRESET_SLUGS } from "@/lib/exercise-presets";
import { toDiscipline } from "@/lib/constants";
import { parseVideoUrl } from "@/lib/video-embed";

// Lives in the (shared) group because /exercises is now a page both roles read.
// Every action here still opens with requireTrainer(), so being reachable from a
// shared route changes who can *see* the page, not who can write to the catalog.

export type ExerciseFormState = { error?: string };
export type MediaFormState = { error?: string; ok?: string };

// Media can attach to any exercise, including a preset the trainer has never
// programmed — so the catalog row is created on demand.
//
// We only ever store the URL the trainer pasted. Nothing is copied or hosted,
// so removing media is a field update with nothing to clean up.
async function upsertMedia(
  trainerId: string,
  name: string,
  media: { url: string; kind: string } | null,
) {
  const nameKey = normalizeExerciseName(name);
  const data = { mediaUrl: media?.url ?? null, mediaKind: media?.kind ?? null };

  await prisma.trainerExercise.upsert({
    where: { trainerId_nameKey: { trainerId, nameKey } },
    update: data,
    create: { trainerId, name: name.trim(), nameKey, ...data },
  });
}

export async function setExerciseMediaLink(
  _prev: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const trainer = await requireTrainer();

  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!name) return { error: "Pick an exercise first." };
  if (!url) return { error: "Paste a link." };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: "That doesn't look like a link." };
  }
  if (parsed.protocol !== "https:") {
    return { error: "Links must start with https://" };
  }

  // Recorded for the label on the manage list. Playback always re-derives from
  // the URL, so a link saved before the parser understood its format starts
  // embedding the moment the parser learns it.
  const { provider, embedUrl, label } = parseVideoUrl(parsed.toString());

  await upsertMedia(trainer.id, name, { url: parsed.toString(), kind: provider });

  revalidatePath("/exercises");
  return {
    ok: embedUrl
      ? `Added a ${label} demo for “${name}”.`
      : `Linked a demo for “${name}”. That URL can't be embedded, so clients get a link out.`,
  };
}

export async function removeExerciseMedia(id: string) {
  const trainer = await requireTrainer();

  // Only ever a URL — nothing hosted, so nothing to clean up.
  const { count } = await prisma.trainerExercise.updateMany({
    where: { id, trainerId: trainer.id },
    data: { mediaUrl: null, mediaKind: null },
  });
  if (count === 0) return;

  revalidatePath("/exercises");
}

export async function deleteCustomExercise(id: string) {
  const trainer = await requireTrainer();

  // Ownership lives in the where clause, so a forged id is a silent no-op
  // rather than a lookup that leaks whether the row exists.
  await prisma.trainerExercise.deleteMany({
    where: { id, trainerId: trainer.id },
  });

  revalidatePath("/exercises");
}

// Edits a trainer's own movement: its name and what kind of training it is.
// Both travel in one form because they're one act — "fix this entry" — and a
// second action would mean a second round trip for a two-field row.
export async function updateCustomExercise(
  id: string,
  _prev: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const trainer = await requireTrainer();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the exercise a name." };

  const discipline = toDiscipline(formData.get("discipline"));

  const nameKey = normalizeExerciseName(name);
  if (PRESET_SLUGS.has(nameKey)) {
    return { error: "That's already a built-in exercise." };
  }

  const existing = await prisma.trainerExercise.findFirst({
    where: { id, trainerId: trainer.id },
  });
  if (!existing) return { error: "Exercise not found." };

  try {
    await prisma.trainerExercise.update({
      where: { id: existing.id },
      data: { name, nameKey, discipline },
    });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      return { error: "You already have an exercise with that name." };
    }
    throw err;
  }

  revalidatePath("/exercises");
  return {};
}
