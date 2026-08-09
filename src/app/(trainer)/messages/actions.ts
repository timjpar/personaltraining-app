"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { requestOrigin } from "@/lib/request-origin";
import {
  createGroupThread,
  deliverMessage,
  findOrCreateDirectThread,
} from "@/lib/messaging";
import {
  BROADCAST_AUDIENCES,
  MAX_MESSAGE_LENGTH,
  parseHour,
  parseWeekdays,
  toBroadcastAudience,
} from "@/lib/constants";

// Both inboxes and both badges move when anything here runs. The client's
// paths are revalidated from the trainer's action deliberately: the athlete's
// unread count is rendered in their layout, and a message they haven't
// refreshed to see is the whole point of a badge.
function revalidateMessaging() {
  revalidatePath("/messages");
  revalidatePath("/my/messages");
  revalidatePath("/my");
}

// sentAt is a nonce, not a timestamp anyone reads: useActionState can't tell a
// successful `{}` from the initial `{}`, so the composer needs a value that
// changes on every send to know when to clear the box.
export type SendMessageState = { error?: string; sentAt?: number };

export async function sendMessage(
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const trainer = await requireTrainer();

  const threadId = String(formData.get("threadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) return { error: "Write something first." };
  if (body.length > MAX_MESSAGE_LENGTH) {
    return { error: "That message is too long to send." };
  }

  // requestOrigin() calls headers(), so it's awaited out here rather than
  // inside deliverMessage's after() callback — the same ordering rule
  // completeWorkout follows, kept identical so there's one habit to remember.
  const origin = await requestOrigin();
  const sent = await deliverMessage(origin, trainer, threadId, body);

  // Null is "you aren't in that thread", which for an id out of a URL is the
  // same answer as "no such thread" and says as little.
  if (!sent) return { error: "That conversation isn't available." };

  revalidateMessaging();
  revalidatePath(`/messages/${threadId}`);
  return { sentAt: Date.now() };
}

export type StartThreadState = { error?: string };

export async function startThread(
  _prev: StartThreadState,
  formData: FormData,
): Promise<StartThreadState> {
  const trainer = await requireTrainer();

  const clientIds = formData.getAll("clientId").map(String).filter(Boolean);
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (clientIds.length === 0) {
    return { error: "Pick at least one person." };
  }
  if (body.length > MAX_MESSAGE_LENGTH) {
    return { error: "That message is too long to send." };
  }

  // The ownership check, and the only reason the ids from the form are safe to
  // write: whatever was posted, only this coach's own clients come back.
  const clients = await prisma.user.findMany({
    where: { id: { in: clientIds }, trainerId: trainer.id, role: "CLIENT" },
    select: { id: true },
  });
  if (clients.length === 0) {
    return { error: "Pick at least one of your clients." };
  }

  const group = clients.length > 1;
  if (group && !title) {
    return { error: "Give the group a name." };
  }

  const thread = group
    ? await createGroupThread(
        trainer.id,
        title,
        clients.map((c) => c.id),
      )
    : await findOrCreateDirectThread(trainer.id, clients[0].id);

  if (body) {
    const origin = await requestOrigin();
    await deliverMessage(origin, trainer, thread.id, body);
  }

  revalidateMessaging();
  // Before the redirect, which signals by throwing — anything after it is
  // unreachable.
  redirect(`/messages/${thread.id}`);
}

export type BroadcastState = { error?: string; ok?: string };

export async function saveBroadcast(
  _prev: BroadcastState,
  formData: FormData,
): Promise<BroadcastState> {
  const trainer = await requireTrainer();

  // Present when editing, absent when creating. Never trusted as more than a
  // candidate — the update below is scoped by trainerId.
  const id = String(formData.get("id") ?? "").trim();

  const label = String(formData.get("label") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const hour = parseHour(formData.get("hour"));
  const weekdays = parseWeekdays(formData.getAll("weekday"));
  const audience = toBroadcastAudience(formData.get("audience"));
  const alsoEmail = formData.get("alsoEmail") === "on";
  const active = formData.get("active") === "on";

  if (!label) return { error: "Give it a name so you can find it later." };
  if (!body) return { error: "Write the message." };
  if (body.length > MAX_MESSAGE_LENGTH) {
    return { error: "That message is too long to send." };
  }
  if (hour == null) return { error: "Pick an hour." };
  if (weekdays.length === 0) return { error: "Pick at least one day." };

  let clientIds: string[] = [];
  if (audience === BROADCAST_AUDIENCES.PICKED) {
    const ids = formData.getAll("clientId").map(String).filter(Boolean);
    const clients = await prisma.user.findMany({
      where: { id: { in: ids }, trainerId: trainer.id, role: "CLIENT" },
      select: { id: true },
    });
    if (clients.length === 0) {
      return { error: "Pick who it goes to, or send it to everyone." };
    }
    clientIds = clients.map((c) => c.id);
  }

  const data = { label, body, hour, weekdays, audience, alsoEmail, active };

  if (id) {
    // updateMany, not update: it scopes by trainerId in the same statement, so
    // a forged id matches nothing instead of editing another coach's message.
    const { count } = await prisma.broadcast.updateMany({
      where: { id, trainerId: trainer.id },
      data,
    });
    if (count === 0) return { error: "That scheduled message isn't available." };

    // Wholesale replace, the same pattern updateNutritionTemplate uses — these
    // rows carry no identity worth preserving across an edit.
    await prisma.broadcastRecipient.deleteMany({ where: { broadcastId: id } });
    if (clientIds.length) {
      await prisma.broadcastRecipient.createMany({
        data: clientIds.map((clientId) => ({ broadcastId: id, clientId })),
      });
    }
    revalidatePath("/messages/scheduled");
    revalidatePath(`/messages/scheduled/${id}`);
    return { ok: "Saved." };
  }

  const created = await prisma.broadcast.create({
    data: {
      ...data,
      trainerId: trainer.id,
      recipients: { create: clientIds.map((clientId) => ({ clientId })) },
    },
  });

  revalidatePath("/messages/scheduled");
  redirect(`/messages/scheduled/${created.id}`);
}

export async function deleteBroadcast(formData: FormData) {
  const trainer = await requireTrainer();
  const id = String(formData.get("id") ?? "");

  // Scoped by trainerId for the same reason the update above is.
  await prisma.broadcast.deleteMany({ where: { id, trainerId: trainer.id } });

  revalidatePath("/messages/scheduled");
  redirect("/messages/scheduled");
}
