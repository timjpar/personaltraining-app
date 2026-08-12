"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { parseWorkoutForm } from "@/lib/workout-form";
import {
  recordExerciseNamesSafely,
  saveExerciseMediaSafely,
} from "@/lib/exercise-catalog";
import { syncAfterMutation } from "@/lib/calendar-sync";
import {
  WORKOUT_STATUS,
  toAttendance,
  toCoachReaction,
  type Attendance,
} from "@/lib/constants";

export type WorkoutFormState = { error?: string };

export async function createWorkout(
  clientId: string,
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const trainer = await requireTrainer();

  const client = await prisma.user.findFirst({
    where: { id: clientId, trainerId: trainer.id, role: "CLIENT" },
  });
  if (!client) return { error: "That client wasn't found." };

  const { data, error } = parseWorkoutForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  await prisma.workout.create({
    data: {
      title: data.title,
      notes: data.notes,
      discipline: data.discipline,
      scheduledDate: data.scheduledDate,
      startMinute: data.startMinute,
      durationMinutes: data.durationMinutes,
      attendance: data.attendance,
      status: "ASSIGNED",
      clientId,
      trainerId: trainer.id,
      exercises: { create: data.exercises },
    },
  });

  await recordExerciseNamesSafely(trainer.id, data.exercises.map((e) => e.name));
  // After the names, so every movement in the session already has a catalog
  // row for the demo to attach to.
  await saveExerciseMediaSafely(trainer.id, data.media);
  // The list that manages demos is a different page and would otherwise
  // keep showing the movement as having none.
  if (data.media.length) revalidatePath("/exercises");

  syncAfterMutation(trainer.id, clientId);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  redirect(`/clients/${clientId}`);
}

export async function updateWorkout(
  workoutId: string,
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const trainer = await requireTrainer();

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, trainerId: trainer.id },
  });
  if (!workout) return { error: "Workout not found." };

  const { data, error } = parseWorkoutForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  // Editing replaces the prescription. (Meant for not-yet-completed sessions.)
  await prisma.$transaction([
    prisma.exercise.deleteMany({ where: { workoutId } }),
    prisma.workout.update({
      where: { id: workoutId },
      data: {
        title: data.title,
        notes: data.notes,
        discipline: data.discipline,
        scheduledDate: data.scheduledDate,
        startMinute: data.startMinute,
        durationMinutes: data.durationMinutes,
        attendance: data.attendance,
        exercises: { create: data.exercises },
      },
    }),
  ]);

  await recordExerciseNamesSafely(trainer.id, data.exercises.map((e) => e.name));
  // After the names, so every movement in the session already has a catalog
  // row for the demo to attach to.
  await saveExerciseMediaSafely(trainer.id, data.media);
  // The list that manages demos is a different page and would otherwise
  // keep showing the movement as having none.
  if (data.media.length) revalidatePath("/exercises");

  syncAfterMutation(trainer.id, workout.clientId);

  revalidatePath(`/workouts/${workoutId}`);
  revalidatePath(`/clients/${workout.clientId}`);
  revalidatePath("/calendar");
  redirect(`/workouts/${workoutId}`);
}

// Flip a session between "I'm coaching this" and "homework", and nothing else.
//
// Its own action rather than a trip through updateWorkout, for the reason that
// one already gives about saveCoachFeedback: updateWorkout replaces the whole
// prescription, so re-marking a finished session through it would delete every
// set the athlete logged. This writes one column.
//
// It also has to be one click, because re-marking is the common case and not
// the rare one: a session becomes homework when someone cancels, and becomes
// yours when they ask to be walked through it. If either meant opening the
// builder and re-saving the whole prescription, neither would happen. Rows
// written while SOLO was briefly the default are the other caller.
export async function setWorkoutAttendance(
  workoutId: string,
  next: Attendance,
) {
  const trainer = await requireTrainer();

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, trainerId: trainer.id },
    select: { id: true, clientId: true },
  });
  if (!workout) redirect("/dashboard");

  await prisma.workout.update({
    where: { id: workout.id },
    // Coerced rather than trusted: `next` is bound into a form action, which
    // means it arrives over the wire and is as forgeable as any other field.
    data: { attendance: toAttendance(next) },
  });

  // Both calendars, because this is exactly the column that decides whether the
  // session appears on the coach's — in Google as much as in the app.
  syncAfterMutation(trainer.id, workout.clientId);

  revalidatePath(`/workouts/${workoutId}`);
  revalidatePath(`/clients/${workout.clientId}`);
  revalidatePath("/calendar");
}

export type CoachFeedbackState = { error?: string; ok?: string };

// The coach's response to a finished session: a reaction, a note, or both.
//
// Not folded into updateWorkout, which replaces the prescription and is meant
// for sessions nobody has done yet. This one deliberately touches nothing the
// athlete logged — it only ever writes the three coach* columns, so responding
// to a session can't rewrite the session being responded to.
export async function saveCoachFeedback(
  workoutId: string,
  _prev: CoachFeedbackState,
  formData: FormData,
): Promise<CoachFeedbackState> {
  const trainer = await requireTrainer();

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, trainerId: trainer.id },
    select: { id: true, clientId: true, status: true },
  });
  if (!workout) return { error: "Workout not found." };
  if (workout.status !== WORKOUT_STATUS.COMPLETED) {
    return { error: "There's nothing to respond to until this is finished." };
  }

  // An unrecognised value reads as no reaction rather than an error: the only
  // way to send one is a forged post, and the honest result of "that isn't a
  // reaction" is the same as not picking one.
  const reaction = toCoachReaction(formData.get("reaction"));
  const note = String(formData.get("note") ?? "").trim() || null;

  // Clearing both clears the timestamp too, so the athlete's page stops
  // announcing a response that no longer exists.
  const responded = reaction != null || note != null;

  await prisma.workout.update({
    where: { id: workout.id },
    data: {
      coachReaction: reaction,
      coachNote: note,
      coachRespondedAt: responded ? new Date() : null,
    },
  });

  revalidatePath(`/workouts/${workoutId}`);
  // The athlete's own copy of the session, which is where this is actually
  // read. The dynamic route needs the "page" form — a literal path wouldn't
  // match the cache entry it's stored under.
  revalidatePath("/my/workouts/[id]", "page");
  revalidatePath(`/clients/${workout.clientId}`);

  return { ok: responded ? "Sent." : "Cleared." };
}

export async function deleteWorkout(workoutId: string) {
  const trainer = await requireTrainer();

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, trainerId: trainer.id },
  });
  if (!workout) redirect("/dashboard");

  const own = workout.clientId === trainer.id;

  await prisma.workout.delete({ where: { id: workout.id } });

  syncAfterMutation(trainer.id, workout.clientId);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");

  // A session the coach assigned themselves has no client page to go back to —
  // /clients/<id> refuses anyone who isn't on the roster, so the old redirect
  // would land a coach on a 404 after deleting their own workout.
  if (own) {
    revalidatePath("/me");
    revalidatePath("/me/workouts");
    redirect("/me/workouts");
  }

  revalidatePath(`/clients/${workout.clientId}`);
  redirect(`/clients/${workout.clientId}`);
}
