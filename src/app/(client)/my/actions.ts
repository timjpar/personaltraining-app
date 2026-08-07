"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { syncAfterMutation } from "@/lib/calendar-sync";

export type CompleteState = { error?: string };

export async function completeWorkout(
  workoutId: string,
  _prev: CompleteState,
  formData: FormData,
): Promise<CompleteState> {
  const client = await requireClient();

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, clientId: client.id },
    include: { exercises: true },
  });
  if (!workout) return { error: "We couldn't find that workout." };
  if (workout.status === "COMPLETED") {
    redirect(`/my/workouts/${workoutId}`);
  }

  const rpeRaw = Number(formData.get("rpe"));
  const rpe =
    Number.isFinite(rpeRaw) && rpeRaw >= 1 && rpeRaw <= 10
      ? Math.round(rpeRaw)
      : null;
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const exerciseUpdates = workout.exercises.map((ex) =>
    prisma.exercise.update({
      where: { id: ex.id },
      data: {
        resultReps: String(formData.get(`res_${ex.id}_reps`) ?? "").trim() || null,
        resultLoad: String(formData.get(`res_${ex.id}_load`) ?? "").trim() || null,
        done: formData.get(`res_${ex.id}_done`) != null,
      },
    }),
  );

  // Complete the session and drop a note in the trainer's feed — the loop.
  await prisma.$transaction([
    ...exerciseUpdates,
    prisma.workout.update({
      where: { id: workoutId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        rpe,
        clientComment: comment,
      },
    }),
    prisma.feedItem.create({
      data: {
        type: "WORKOUT_COMPLETED",
        trainerId: workout.trainerId,
        clientId: workout.clientId,
        workoutId,
      },
    }),
  ]);

  // Runs as the client but touches the *trainer's* calendar too: completing a
  // session changes its summary (it gains a ✓), so the coach's Google calendar
  // should show what actually got done, not just what was planned.
  syncAfterMutation(workout.trainerId, workout.clientId);

  revalidatePath("/my");
  revalidatePath("/my/history");
  revalidatePath("/my/calendar");
  revalidatePath("/dashboard");
  redirect(`/my/workouts/${workoutId}?done=1`);
}
