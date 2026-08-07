"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTrainer, hashPassword } from "@/lib/auth";
import { newClientEmail, sendMail } from "@/lib/mail";
import { generatePassword } from "@/lib/password";
import { requestOrigin } from "@/lib/request-origin";
import { SIGNUP_SOURCE } from "@/lib/constants";

export type AddClientState = {
  error?: string;
  // `emailed` false means the account exists but nothing reached the client —
  // mail isn't configured, or the send failed. The password below is then the
  // only way in, so the form keeps showing it either way.
  created?: {
    name: string;
    email: string;
    password: string;
    emailed: boolean;
  };
};

export async function addClient(
  _prev: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  const trainer = await requireTrainer();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  let password = String(formData.get("password") ?? "").trim();

  if (!name || !email) {
    return { error: "Add a name and an email for your client." };
  }
  if (password && password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Someone already uses that email." };
  }

  if (!password) password = generatePassword();

  await prisma.user.create({
    data: {
      name,
      email,
      role: "CLIENT",
      trainerId: trainer.id,
      passwordHash: await hashPassword(password),
      signupSource: SIGNUP_SOURCE.TRAINER,
    },
  });

  // Best effort, exactly like recordLoginSafely: sendMail reports failure with
  // `false` and never throws, so a mail outage can't undo an account that has
  // already been written. What it must not do is fail silently — the trainer is
  // the fallback delivery mechanism, so the result goes back to the form.
  const emailed = await sendMail({
    ...newClientEmail(await requestOrigin(), name, email, password),
    to: email,
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return { created: { name, email, password, emailed } };
}

export type ResetClientPasswordState = {
  error?: string;
  password?: string;
};

// The route back in for a client who can't use the emailed link — no inbox
// access, no mail configured on the server, or simply standing in front of
// their coach. The admin area has the same capability over every account
// (see (admin)/admin/actions.ts); this one reaches a trainer's own roster only.
export async function resetClientPassword(
  _prev: ResetClientPasswordState,
  formData: FormData,
): Promise<ResetClientPasswordState> {
  const trainer = await requireTrainer();

  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return { error: "That client no longer exists." };

  // Reloaded and ownership-checked in one query rather than trusting the form.
  // Setting someone's password is taking their account, so "is this actually
  // mine to reset" is the whole guard — a posted id from another trainer's
  // roster has to find nothing here.
  const client = await prisma.user.findFirst({
    where: { id: clientId, trainerId: trainer.id },
    select: { id: true, name: true },
  });
  if (!client) return { error: "That client no longer exists." };

  const password = generatePassword();
  await prisma.user.update({
    where: { id: client.id },
    data: {
      passwordHash: await hashPassword(password),
      // Signs them out everywhere. A coach resetting a password is often doing
      // it because the client lost the device it was saved on.
      sessionEpoch: { increment: 1 },
    },
  });

  revalidatePath(`/clients/${client.id}`);

  // Returned once, to be read off the screen and passed on. Nothing stores the
  // plaintext, so closing the page is the end of it.
  return { password };
}
