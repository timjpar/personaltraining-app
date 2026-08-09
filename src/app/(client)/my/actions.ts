"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { syncAfterMutation } from "@/lib/calendar-sync";
import { sendWorkoutEmailSafely } from "@/lib/digest";
import { requestOrigin } from "@/lib/request-origin";

export type CompleteState = { error?: string };

export async function completeWorkout(
  workoutId: string,
  _prev: CompleteState,
  formData: FormData,
): Promise<CompleteState> {
  const client = await requireClient();

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, clientId: client.id },
    include: {
      exercises: true,
      // Along for the ride rather than a second query: the lookup runs either
      // way, and instantWorkoutEmail is one boolean on a row we're loading.
      trainer: {
        select: { name: true, email: true, instantWorkoutEmail: true },
      },
    },
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
        resultSets: String(formData.get(`res_${ex.id}_sets`) ?? "").trim() || null,
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

  // Trainers who opted out of this still get the session in that evening's
  // digest — this is about latency, not about whether they hear at all.
  //
  // Two orderings matter here and both are load-bearing. requestOrigin() calls
  // headers(), and it is awaited out here rather than inside the callback:
  // that's required in a Server Component and merely clearer in a Server
  // Function, so doing it the same way in both keeps one rule to remember.
  // And redirect() below signals by throwing, so the after() has to be
  // registered before it — the callback still runs, but only if it was
  // scheduled first.
  if (workout.trainer.instantWorkoutEmail) {
    const origin = await requestOrigin();
    after(() =>
      sendWorkoutEmailSafely(origin, workout.trainer, client.name, {
        id: workout.id,
        title: workout.title,
        rpe,
        clientComment: comment,
      }),
    );
  }

  revalidatePath("/my");
  revalidatePath("/my/history");
  revalidatePath("/my/calendar");
  revalidatePath("/dashboard");
  redirect(`/my/workouts/${workoutId}?done=1`);
}
