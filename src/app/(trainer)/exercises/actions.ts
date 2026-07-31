"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { normalizeExerciseName, PRESET_SLUGS } from "@/lib/exercise-presets";

export type ExerciseFormState = { error?: string };

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
