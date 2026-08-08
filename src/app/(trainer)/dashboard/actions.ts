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

  // "" is the Off option, and a real choice rather than a missing value — it's
  // how a trainer turns the digest off without a second checkbox to keep in
  // sync with the hour.
  const raw = String(formData.get("digestHour") ?? "").trim();
  let digestHour: number | null = null;
  if (raw !== "") {
    const n = Number(raw);
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
    },
  });

  revalidatePath("/dashboard");
  return { ok: "Saved." };
}
