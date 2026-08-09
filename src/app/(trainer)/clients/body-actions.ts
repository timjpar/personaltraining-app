"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import {
  parseMeasurementForm,
  parseProfileForm,
  type BodyState,
} from "@/lib/body-form";
import { suggestTargets, targetInputsFrom } from "@/lib/body";
import { MEASUREMENT_SOURCE } from "@/lib/constants";

// The body half of a client's file: their intake profile, their weigh-ins, and
// the one action that accepts a derived target into a nutrition plan.
//
// Its own file rather than an addition to clients/actions.ts, which is account
// admin — adding a client, resetting a password. The repo already splits
// actions by subject this way (workout-actions.ts, library/actions.ts).

// Every action here reloads the client with the trainer scope in the where
// clause rather than trusting the posted id, exactly as resetClientPassword
// does. A client id from another coach's roster has to find nothing.
async function ownedClient(clientId: string, trainerId: string) {
  return prisma.user.findFirst({
    where: { id: clientId, trainerId, role: "CLIENT" },
    select: { id: true, name: true, units: true },
  });
}

// The suggestion depends on the profile *and* the newest weigh-in, so writing
// either has to refresh both the page that shows the numbers and the page that
// shows the derivation.
function revalidateBody(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/profile`);
  revalidatePath(`/clients/${clientId}/measurements`);
  revalidatePath("/my/body");
}

export async function saveClientProfile(
  clientId: string,
  _prev: BodyState,
  formData: FormData,
): Promise<BodyState> {
  const trainer = await requireTrainer();
  const client = await ownedClient(clientId, trainer.id);
  if (!client) return { error: "That client no longer exists." };

  const { data, error } = parseProfileForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  // Upserted rather than created alongside the account. Eager creation would
  // need a backfill for every client that already exists and would stop the
  // migration being purely additive — and "has this client been intaked yet"
  // stays a truthful nullable relation this way.
  await prisma.clientProfile.upsert({
    where: { userId: client.id },
    create: { userId: client.id, ...data },
    update: data,
  });

  revalidateBody(client.id);
  return { ok: "Profile saved." };
}

export async function saveMeasurement(
  clientId: string,
  _prev: BodyState,
  formData: FormData,
): Promise<BodyState> {
  const trainer = await requireTrainer();
  const client = await ownedClient(clientId, trainer.id);
  if (!client) return { error: "That client no longer exists." };

  const { data, error } = parseMeasurementForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  // One row per client per day, so re-recording a date edits it instead of
  // stacking a second entry — the same move saveNutritionLog makes.
  //
  // `update` deliberately leaves `source` alone: a coach correcting a figure
  // an athlete weighed themselves for shouldn't erase who stood on the scale.
  await prisma.measurement.upsert({
    where: { clientId_date: { clientId: client.id, date: data.date } },
    create: { ...data, clientId: client.id, source: MEASUREMENT_SOURCE.TRAINER },
    update: data,
  });

  revalidateBody(client.id);
  return { ok: "Measurement saved." };
}

export async function deleteMeasurement(
  clientId: string,
  _prev: BodyState,
  formData: FormData,
): Promise<BodyState> {
  const trainer = await requireTrainer();
  const client = await ownedClient(clientId, trainer.id);
  if (!client) return { error: "That client no longer exists." };

  const id = String(formData.get("measurementId") ?? "");
  if (!id) return { error: "That measurement no longer exists." };

  // clientId in the where is the ownership check, not a redundancy: it is what
  // stops a posted id from another roster deleting a row.
  await prisma.measurement.deleteMany({ where: { id, clientId: client.id } });

  revalidateBody(client.id);
  return { ok: "Measurement deleted." };
}

// Accepts the derived targets into the client's assigned nutrition plan.
//
// The numbers are recomputed here from the profile and the newest weigh-in,
// and deliberately never read off the form. Not as a security measure — a
// coach can type anything into the plan builder anyway — but for truth: the
// profile may have changed in another tab since this page rendered, and
// "apply" has to apply what the file currently says rather than what a stale
// render happened to show. The message names what was actually written, so a
// divergence is visible instead of silent.
export async function applyTargetsToPlan(
  clientId: string,
  _prev: BodyState,
  formData: FormData,
): Promise<BodyState> {
  const trainer = await requireTrainer();
  const client = await ownedClient(clientId, trainer.id);
  if (!client) return { error: "That client no longer exists." };

  // The one thing read off the form: which plan the button named. The targets
  // themselves are recomputed below rather than posted, but the *destination*
  // has to be the plan the coach saw on the button — if they assigned a
  // different one in another tab since this rendered, silently writing to that
  // instead would be the wrong plan edited under a label promising the old one.
  const planId = String(formData.get("planId") ?? "");
  if (!planId) {
    return {
      error: `${client.name.split(/\s+/)[0]} has no plan assigned yet. Start one from these numbers instead.`,
    };
  }

  const [profile, latest, plan] = await Promise.all([
    prisma.clientProfile.findUnique({ where: { userId: client.id } }),
    prisma.measurement.findFirst({
      where: { clientId: client.id, weightKg: { not: null } },
      orderBy: { date: "desc" },
      select: { weightKg: true },
    }),
    // Scoped to an assigned snapshot of this client's, so a posted id can only
    // ever reach a plan that is already theirs. A library template (clientId
    // null) can't match: writing one athlete's derived calories into a
    // reusable template would leak them into every future assignment of it.
    prisma.nutritionPlan.findFirst({
      where: { id: planId, clientId: client.id, trainerId: trainer.id },
      select: { id: true, title: true },
    }),
  ]);

  if (!plan) {
    return {
      error: "That plan is no longer assigned to them. Reload and try again.",
    };
  }

  const { inputs } = targetInputsFrom(profile, latest);
  if (!inputs) {
    return { error: "Their profile is missing something these numbers need." };
  }

  const targets = suggestTargets(inputs);

  await prisma.nutritionPlan.updateMany({
    where: { id: plan.id, trainerId: trainer.id, clientId: client.id },
    data: {
      targetCalories: targets.calories,
      targetProtein: targets.protein,
      targetCarbs: targets.carbs,
      targetFat: targets.fat,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/profile`);
  revalidatePath("/clients/[id]/nutrition/[date]", "page");
  revalidatePath("/nutrition");
  revalidatePath(`/nutrition/${plan.id}`);
  // The athlete reads these targets under their own day's totals.
  revalidatePath("/my");
  revalidatePath("/my/nutrition");
  revalidatePath("/my/nutrition/[date]", "page");

  return {
    ok: `${plan.title}: ${targets.calories.toLocaleString()} kcal · ${targets.protein}P / ${targets.carbs}C / ${targets.fat}F`,
  };
}
