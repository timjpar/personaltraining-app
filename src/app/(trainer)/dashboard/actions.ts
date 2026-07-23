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
