"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import {
  parseMeasurementForm,
  parseProfileForm,
  type BodyState,
} from "@/lib/body-form";
import { parseNutritionLogForm, type LogState } from "@/lib/nutrition-form";
import { parseDayParam } from "@/lib/calendar";
import { MEASUREMENT_SOURCE } from "@/lib/constants";

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
  revalidatePath("/me/nutrition/[date]", "page");
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
