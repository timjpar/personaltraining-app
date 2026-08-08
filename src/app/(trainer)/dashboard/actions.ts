"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";

export async function markAllRead() {
  const trainer = await requireTrainer();
  await prisma.feedItem.updateMany({
    where: { trainerId: trainer.id, read: false },
    data: { read: true },
  });
  revalidatePath("/dashboard");
}

export type NotifyState = { error?: string; ok?: string };

export async function saveNotificationPrefs(
  _prev: NotifyState,
  formData: FormData,
): Promise<NotifyState> {
  const trainer = await requireTrainer();

  // The checkbox is what decides whether the digest runs at all; the hour only
  // means anything once it's on. Reading it in that order is also what makes
  // the card's disabled select safe — a disabled control submits nothing, so an
  // opted-out trainer sends no hour, and there is nothing here to validate.
  //
  // Turning it off forgets the hour, because null *is* off in the column. Back
  // on, the select shows the 8 PM default again. Storing a remembered hour
  // beside the null would be a second source of truth for one setting.
  let digestHour: number | null = null;
  if (formData.get("digest") != null) {
    const n = Number(String(formData.get("digestHour") ?? "").trim());
    if (!Number.isInteger(n) || n < 0 || n > 23) {
      return { error: "Pick a time between midnight and 11 PM." };
    }
    digestHour = n;
  }

  await prisma.user.update({
    where: { id: trainer.id },
    data: {
      digestHour,
      instantWorkoutEmail: formData.get("instant") != null,
      instantNutritionEmail: formData.get("instantNutrition") != null,
    },
  });

  revalidatePath("/dashboard");
  return { ok: "Saved." };
}
