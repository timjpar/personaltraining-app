"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import {
  parseMeasurementForm,
  parseProfileForm,
  type BodyState,
} from "@/lib/body-form";
import { parseNutritionLogForm, type LogState } from "@/lib/nutrition-form";
import { parseWorkoutForm } from "@/lib/workout-form";
import { parseDayParam } from "@/lib/calendar";
import { MEASUREMENT_SOURCE, WORKOUT_STATUS } from "@/lib/constants";
import {
  recordExerciseNamesSafely,
  saveExerciseMediaSafely,
} from "@/lib/exercise-catalog";
import { syncAfterMutation } from "@/lib/calendar-sync";
import {
  describeSetsDone,
  joinSetValues,
  parseSetCount,
} from "@/lib/exercise-sets";
// The two form-state shapes are the athlete's, imported rather than redeclared:
// WorkoutBuilder and WorkoutLogForm are typed against them, and a structurally
// identical copy here would drift the first time either grows a field.
import type { CompleteState } from "@/app/(client)/my/actions";
import type { WorkoutFormState } from "@/app/(trainer)/workout-actions";

// A coach's own file: their intake facts, their weigh-ins, their food log.
//
// Nothing here is new machinery. Measurement.clientId, NutritionLog.clientId and
// ClientProfile.userId are all plain foreign keys to User with no role attached,
// so a coach tracking themselves is the existing tables holding the existing
// shapes — the reason this shipped without a migration.
//
// What every action below has in common is that requireTrainer() supplies the
// id. There is no bound id to check and no ownership reload, for the reason
// (client)/my/body/actions.ts gives: the [clientId, date] unique key *is* the
// ownership check, so a forged date can only ever address the caller's own row.
//
// Two things the client's versions do are deliberately absent. No FeedItem: the
// dashboard feed answers "what have my athletes done", and a coach's own weigh-in
// is not an answer to that. And no instant email: instantNutritionEmail exists so
// a coach hears about someone else's day, and mailing yourself what you just
// typed is noise rather than notification.

// Every derived figure on these pages is a function of the profile *and* the
// newest weigh-in, so writing either has to refresh all of them. The nutrition
// day uses the "page" form because a literal path wouldn't match the cache entry
// a dynamic route is stored under.
function revalidateMe() {
  revalidatePath("/me");
  revalidatePath("/me/body");
  revalidatePath("/me/profile");
  revalidatePath("/me/nutrition");
  revalidatePath("/me/nutrition/history");
  revalidatePath("/me/nutrition/[date]", "page");
}

// The training half, which touches a different set of pages — including the
// coach's own calendar, since a self-assigned session is on it like any other.
function revalidateMyTraining(workoutId?: string) {
  revalidatePath("/me");
  revalidatePath("/me/workouts");
  if (workoutId) revalidatePath(`/me/workouts/${workoutId}`);
  revalidatePath("/calendar");
}

export async function saveMyProfile(
  _prev: BodyState,
  formData: FormData,
): Promise<BodyState> {
  const trainer = await requireTrainer();

  const { data, error } = parseProfileForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  // Upserted rather than created with the account, the same call
  // saveClientProfile makes: it keeps "has this file been started yet" a
  // truthful nullable relation instead of a table of empty rows.
  await prisma.clientProfile.upsert({
    where: { userId: trainer.id },
    create: { userId: trainer.id, ...data },
    update: data,
  });

  revalidateMe();
  return { ok: "Saved." };
}

export async function saveMyWeighIn(
  _prev: BodyState,
  formData: FormData,
): Promise<BodyState> {
  const trainer = await requireTrainer();

  const { data, error } = parseMeasurementForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  // One row per person per day, so re-recording a date edits it rather than
  // stacking a second entry.
  //
  // CLIENT rather than TRAINER, which reads backwards for a trainer's row and
  // isn't. The column records how a figure was obtained — a coach's tape
  // reading of someone else, or a number the person themselves typed off a
  // bathroom scale — and a coach weighing themselves is the second one. It is
  // never rendered here anyway: the badge exists to say who *else* wrote a row,
  // and on your own file there is nobody else.
  await prisma.measurement.upsert({
    where: { clientId_date: { clientId: trainer.id, date: data.date } },
    create: { ...data, clientId: trainer.id, source: MEASUREMENT_SOURCE.CLIENT },
    update: data,
  });

  revalidateMe();
  return { ok: "Saved." };
}

export async function deleteMyWeighIn(
  _prev: BodyState,
  formData: FormData,
): Promise<BodyState> {
  const trainer = await requireTrainer();

  const id = String(formData.get("measurementId") ?? "");
  if (!id) return { error: "That entry no longer exists." };

  // clientId in the where is what stops a posted id reaching anyone else's row.
  await prisma.measurement.deleteMany({ where: { id, clientId: trainer.id } });

  revalidateMe();
  return { ok: "Deleted." };
}

// The coach's own day of food. The day is curried and bound at the call site,
// the same shape saveNutritionLog uses.
export async function saveMyNutritionLog(
  day: string,
  _prev: LogState,
  formData: FormData,
): Promise<LogState> {
  const trainer = await requireTrainer();

  const date = parseDayParam(day);
  if (!date) return { error: "That's not a day we can log against." };

  // Tomorrow's dinner is a typo, not a feature. Compared against the end of
  // today so the caller's own "today" always passes, whatever the hour.
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (date > endOfToday) {
    return { error: "You can't log a day that hasn't happened yet." };
  }

  const { data, error } = parseNutritionLogForm(formData);
  if (error || !data) return { error: error ?? "We couldn't read that log." };

  // Clearing the last food off a day removes the day, rather than leaving an
  // empty row that would keep showing as if something had been logged.
  if (data.entries.length === 0 && !data.notes) {
    await prisma.nutritionLog.deleteMany({
      where: { clientId: trainer.id, date },
    });
    revalidateMe();
    return { ok: "Log cleared." };
  }

  // The array form, not the interactive transaction saveNutritionLog needs:
  // that one exists only because its feed item is keyed on an id the upsert
  // hasn't produced yet, and there is no feed item here. So the log is upserted
  // first and its id read back for the rows.
  const log = await prisma.nutritionLog.upsert({
    where: { clientId_date: { clientId: trainer.id, date } },
    create: { clientId: trainer.id, date, notes: data.notes },
    update: { notes: data.notes },
  });

  // Wholesale replace, the same pattern the athlete's save uses: the rows carry
  // no identity worth preserving across an edit.
  await prisma.$transaction([
    prisma.loggedFood.deleteMany({ where: { logId: log.id } }),
    prisma.loggedFood.createMany({
      data: data.entries.map((e) => ({ ...e, logId: log.id })),
    }),
  ]);

  revalidateMe();
  return { ok: "Saved." };
}

// ---- The coach's own training ---------------------------------------------
// A session a coach assigned to themselves is a Workout with clientId ===
// trainerId, written by the very same assign actions the roster goes through
// (src/lib/assignees.ts). So the two below are the only pieces that had to be
// new: writing a one-off straight to yourself, and logging one.
//
// Both keep the two omissions the file's header comment argues for. No
// FeedItem: the dashboard feed answers "what have my athletes done", and your
// own session is not an answer to that — it would also arrive permanently
// unread, since the only page that marks feed rows read is the client-session
// review the coach never opens for themselves. And no instant email, because
// mailing yourself what you just typed is noise rather than notification.

// A bespoke session for yourself, the /me twin of createWorkout. Its own
// function rather than a `clientId === trainer.id` branch in that one: the
// ownership lookup there is the whole safety check, and an early-out around it
// is the kind of thing that later gets refactored into a hole.
export async function createMyWorkout(
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const trainer = await requireTrainer();

  const { data, error } = parseWorkoutForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  const workout = await prisma.workout.create({
    data: {
      title: data.title,
      notes: data.notes,
      discipline: data.discipline,
      scheduledDate: data.scheduledDate,
      startMinute: data.startMinute,
      durationMinutes: data.durationMinutes,
      attendance: data.attendance,
      status: WORKOUT_STATUS.ASSIGNED,
      // Both ends of the session are this account. Nothing downstream has to
      // know that: it reads as a normal row everywhere, and the places that
      // must not report it back as roster activity filter on exactly this
      // equality — see rosterOnly in src/lib/assignees.ts.
      clientId: trainer.id,
      trainerId: trainer.id,
      exercises: { create: data.exercises },
    },
  });

  await recordExerciseNamesSafely(trainer.id, data.exercises.map((e) => e.name));
  // After the names, so every movement in the session already has a catalog
  // row for the demo to attach to.
  await saveExerciseMediaSafely(trainer.id, data.media);
  if (data.media.length) revalidatePath("/exercises");

  // One id, not two: the coach is both ends of this session, and
  // syncGoogleCalendarsSafely de-duplicates anyway.
  syncAfterMutation(trainer.id);

  revalidateMyTraining();
  redirect(`/me/workouts/${workout.id}`);
}

// Logging a session of your own. The body of this is completeWorkout's, minus
// the feed item and the email — see the note above — and with clientId bound to
// the caller rather than to whoever the session was written for.
export async function completeMyWorkout(
  workoutId: string,
  _prev: CompleteState,
  formData: FormData,
): Promise<CompleteState> {
  const trainer = await requireTrainer();

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, clientId: trainer.id },
    include: { exercises: true },
  });
  if (!workout) return { error: "We couldn't find that workout." };
  if (workout.status === WORKOUT_STATUS.COMPLETED) {
    redirect(`/me/workouts/${workoutId}`);
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

    // A row with nothing in either box is a set that didn't happen.
    const logged = reps.filter((r, i) => r || loads[i]).length;
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

  await prisma.$transaction([
    ...exerciseUpdates,
    prisma.workout.update({
      where: { id: workoutId },
      data: {
        status: WORKOUT_STATUS.COMPLETED,
        completedAt: new Date(),
        rpe,
        clientComment: comment,
      },
    }),
  ]);

  // A finished session gains a ✓ in its Google summary, so the coach's own
  // calendar should show what actually got done.
  syncAfterMutation(trainer.id);

  revalidateMyTraining(workoutId);
  redirect(`/me/workouts/${workoutId}?done=1`);
}
