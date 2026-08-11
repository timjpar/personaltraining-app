"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { normalizeExerciseName, PRESET_SLUGS } from "@/lib/exercise-presets";
import { toDiscipline } from "@/lib/constants";
import { parseVideoUrl } from "@/lib/video-embed";

// Every action here opens with requireTrainer(). The page above it is now
// trainer-gated by the (trainer) layout too, but these are POST endpoints in
// their own right — the layout that renders the form is not what protects them.

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

// Shared by the two places a trainer can paste a demo link — the manager on the
// list page and the new-exercise form. Both check the link before writing
// anything, so a typo costs one corrected field rather than a half-made row.
function checkMediaLink(raw: string): { url: string } | { error: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { error: "That doesn't look like a link." };
  }
  if (parsed.protocol !== "https:") {
    return { error: "Links must start with https://" };
  }
  return { url: parsed.toString() };
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

  const link = checkMediaLink(url);
  if ("error" in link) return link;

  // Recorded for the label on the manage list. Playback always re-derives from
  // the URL, so a link saved before the parser understood its format starts
  // embedding the moment the parser learns it.
  const { provider, embedUrl, label } = parseVideoUrl(link.url);

  await upsertMedia(trainer.id, name, { url: link.url, kind: provider });

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

// The deliberate way to add a movement. Programming an unknown name still
// creates one on its own (recordExerciseNames), and that stays the common path —
// this is for the coach who wants the entry to exist *before* they write a
// session around it, and who has no workout open to type it into.
export async function createCustomExercise(
  _prev: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const trainer = await requireTrainer();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the exercise a name." };

  // A demo link is optional here — the same one can be added later from the
  // list page. Taking it now saves the coach a second trip for the common case
  // where they already have the video open.
  const url = String(formData.get("url") ?? "").trim();
  const link = url ? checkMediaLink(url) : null;
  if (link && "error" in link) return link;

  const nameKey = normalizeExerciseName(name);
  // Adding one of the built-ins would produce a row that the custom list
  // filters straight back out — an entry that vanishes on save reads as a bug.
  if (PRESET_SLUGS.has(nameKey)) {
    return { error: "That's already a built-in exercise — it's in the picker." };
  }

  try {
    await prisma.trainerExercise.create({
      data: {
        trainerId: trainer.id,
        name,
        nameKey,
        discipline: toDiscipline(formData.get("discipline")),
        // Same shape upsertMedia writes: the pasted URL, plus the provider we
        // recognised it as for the label on the list.
        mediaUrl: link?.url ?? null,
        mediaKind: link ? parseVideoUrl(link.url).provider : null,
      },
    });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      return { error: "You already have an exercise with that name." };
    }
    throw err;
  }

  revalidatePath("/exercises");
  // Back to the list, which is where the movement can be renamed, given a demo
  // video, or deleted.
  redirect("/exercises");
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
