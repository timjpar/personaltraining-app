"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { requestOrigin } from "@/lib/request-origin";
import { deliverMessage } from "@/lib/messaging";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";

// The athlete's half of the conversation. A near-twin of the trainer's
// sendMessage and deliberately its own function rather than a shared one with a
// role argument: the two differ in which guard they open with, and requireClient
// vs requireTrainer is exactly the line that shouldn't be behind a parameter.
export type SendReplyState = { error?: string; sentAt?: number };

export async function sendReply(
  _prev: SendReplyState,
  formData: FormData,
): Promise<SendReplyState> {
  const client = await requireClient();

  const threadId = String(formData.get("threadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) return { error: "Write something first." };
  if (body.length > MAX_MESSAGE_LENGTH) {
    return { error: "That message is too long to send." };
  }

  // headers() is read out here rather than inside the after() callback that
  // deliverMessage registers — required in a Server Component and clearer
  // here, so the app does it the same way in both.
  const origin = await requestOrigin();
  const sent = await deliverMessage(origin, client, threadId, body);

  // An athlete can only ever reach threads they're in, so this is a forged id.
  // It gets the same answer a missing thread does.
  if (!sent) return { error: "That conversation isn't available." };

  revalidatePath("/my/messages");
  revalidatePath(`/my/messages/${threadId}`);
  // The coach's inbox and their badge.
  revalidatePath("/messages");
  revalidatePath("/dashboard");
  return { sentAt: Date.now() };
}
