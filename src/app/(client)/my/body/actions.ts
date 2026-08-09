"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { parseMeasurementForm, type BodyState } from "@/lib/body-form";
import { MEASUREMENT_SOURCE } from "@/lib/constants";

// The athlete's own weigh-ins. Deliberately narrower than the coach's actions
// next door: an athlete writes measurements and nothing else.
//
// The profile is not writable from here on purpose. Sex, date of birth and
// height are intake facts the coach owns, and the goal weight, goal type and
// target rate are coaching decisions — an athlete quietly changing their goal
// weight would move the coach's suggested targets behind their back. The goal
// renders on their page as read-only context, because hiding a number their
// coach discusses at every check-in would be the stranger choice.

// Unlike the trainer's actions there is no bound client id and no ownership
// reload, and the reason is the same one saveNutritionLog gives: requireClient
// supplies the id, so the [clientId, date] unique key *is* the ownership
// check. A forged date can only ever address this athlete's own row.
async function revalidateFor(client: { id: string; trainerId: string | null }) {
  revalidatePath("/my/body");
  if (client.trainerId) {
    revalidatePath(`/clients/${client.id}`);
    revalidatePath(`/clients/${client.id}/measurements`);
    revalidatePath(`/clients/${client.id}/profile`);
  }
}

export async function saveWeighIn(
  _prev: BodyState,
  formData: FormData,
): Promise<BodyState> {
  const client = await requireClient();

  const { data, error } = parseMeasurementForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  // `update` leaves `source` alone, so a coach who has corrected one of these
  // keeps the correction's attribution rather than having it flip back the
  // next time the athlete edits the same day.
  await prisma.measurement.upsert({
    where: { clientId_date: { clientId: client.id, date: data.date } },
    create: { ...data, clientId: client.id, source: MEASUREMENT_SOURCE.CLIENT },
    update: data,
  });

  await revalidateFor(client);
  return { ok: "Saved." };
}

export async function deleteWeighIn(
  _prev: BodyState,
  formData: FormData,
): Promise<BodyState> {
  const client = await requireClient();

  const id = String(formData.get("measurementId") ?? "");
  if (!id) return { error: "That entry no longer exists." };

  // clientId in the where is what stops a posted id reaching anyone else's row.
  await prisma.measurement.deleteMany({ where: { id, clientId: client.id } });

  await revalidateFor(client);
  return { ok: "Deleted." };
}
