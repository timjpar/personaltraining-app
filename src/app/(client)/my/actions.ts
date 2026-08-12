"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { syncAfterMutation } from "@/lib/calendar-sync";
import {
  describeSetsDone,
  joinSetValues,
  parseSetCount,
} from "@/lib/exercise-sets";
import { sendWorkoutEmailSafely } from "@/lib/digest";
import { requestOrigin } from "@/lib/request-origin";
import { consumeSessionCredit } from "@/lib/sessions";
import { ATTENDANCE, toAttendance } from "@/lib/constants";

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

  const exerciseUpdates = workout.exercises.map((ex) => {
    // One pair of boxes per set, posted under repeated names in row order — so
    // the two lists line up by set index without the row number ever reaching
    // the field name. See SetRows in WorkoutLogForm.
    const values = (field: string) =>
      formData.getAll(`res_${ex.id}_${field}`).map((v) => String(v).trim());
    const reps = values("reps");
    const loads = values("load");

    // A row with nothing in either box is a set that didn't happen — the
    // athlete stopped at three of four, or never filled it in. Counting them is
    // what makes the sets figure a fact rather than a second thing to type.
    const logged = reps.filter((r, i) => r || loads[i]).length;

    // A log page left open across this deploy still posts one pair of boxes and
    // its own "sets done" figure. Take that figure over one derived from a
    // single row, which would read as one set of the four they actually did.
    const posted = formData.get(`res_${ex.id}_sets`);

    return prisma.exercise.update({
      where: { id: ex.id },
      data: {
        resultSets:
          posted != null
            ? String(posted).trim() || null
            : describeSetsDone(logged, parseSetCount(ex.sets)),
        resultReps: joinSetValues(reps),
        resultLoad: joinSetValues(loads),
        done: formData.get(`res_${ex.id}_done`) != null,
      },
    });
  });

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

  // One paid session off the account, if this client is on a package at all —
  // consumeSessionCredit decides that, and does nothing for anyone who isn't.
  //
  // Only for a session the coach was actually in the room for. That's what a
  // client buys: homework they do alone is programming, and counting it down
  // would empty a ten-pack in a fortnight of solo work nobody was paid for.
  //
  // Deliberately outside the transaction above. The ledger is the coach's
  // record, and a hiccup writing it must not roll back the session an athlete
  // just logged — a missed debit is visible on the client's file and fixable in
  // one form, where a refused log costs work that only existed in their head.
  if (toAttendance(workout.attendance) === ATTENDANCE.IN_PERSON) {
    await consumeSessionCredit(workout);
  }

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
