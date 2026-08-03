"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { normalizeExerciseName, PRESET_SLUGS } from "@/lib/exercise-presets";

export type ExerciseFormState = { error?: string };
export type MediaFormState = { error?: string; ok?: string };

// Deletes the underlying blob when we're the ones who put it there. Never
// touches LINK media — that URL belongs to someone else.
async function releaseBlob(row: { mediaUrl: string | null; mediaKind: string | null }) {
  if (row.mediaKind !== "UPLOAD" || !row.mediaUrl) return;
  try {
    await del(row.mediaUrl);
  } catch (err) {
    // An orphaned blob costs a little storage; failing the user's action over
    // it would cost them their change.
    console.error("Failed to delete blob", err);
  }
}

// Media can attach to any exercise, including a preset the trainer has never
// programmed — so the catalog row is created on demand.
async function upsertMedia(
  trainerId: string,
  name: string,
  media: { url: string; kind: "UPLOAD" | "LINK" } | null,
) {
  const nameKey = normalizeExerciseName(name);
  const existing = await prisma.trainerExercise.findUnique({
    where: { trainerId_nameKey: { trainerId, nameKey } },
  });

  // Replacing or clearing media frees the blob we previously owned.
  if (existing) await releaseBlob(existing);

  const data = { mediaUrl: media?.url ?? null, mediaKind: media?.kind ?? null };

  if (existing) {
    await prisma.trainerExercise.update({ where: { id: existing.id }, data });
  } else {
    await prisma.trainerExercise.create({
      data: { trainerId, name: name.trim(), nameKey, ...data },
    });
  }
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

  await upsertMedia(trainer.id, name, { url: parsed.toString(), kind: "LINK" });

  revalidatePath("/exercises");
  return { ok: `Linked a demo for “${name}”.` };
}

// Called after the browser has already sent the file straight to Blob storage.
export async function attachUploadedMedia(name: string, url: string) {
  const trainer = await requireTrainer();
  if (!name.trim() || !url) return;

  await upsertMedia(trainer.id, name, { url, kind: "UPLOAD" });

  revalidatePath("/exercises");
}

export async function removeExerciseMedia(id: string) {
  const trainer = await requireTrainer();

  const row = await prisma.trainerExercise.findFirst({
    where: { id, trainerId: trainer.id },
  });
  if (!row) return;

  await releaseBlob(row);
  await prisma.trainerExercise.update({
    where: { id: row.id },
    data: { mediaUrl: null, mediaKind: null },
  });

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

export async function renameCustomExercise(
  id: string,
  _prev: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const trainer = await requireTrainer();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the exercise a name." };

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
      data: { name, nameKey },
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
