"use server";

import { revalidatePath } from "next/cache";
import { isUniqueViolation, prisma } from "@/lib/db";
import { requireTrainer, hashPassword } from "@/lib/auth";
import { newClientEmail, sendMail } from "@/lib/mail";
import { generatePassword } from "@/lib/password";
import { requestOrigin } from "@/lib/request-origin";
import { checkRoom } from "@/lib/roster";
import { addSessionCredits, balanceFor } from "@/lib/sessions";
import type { InviteState } from "@/components/InviteForm";
import {
  CLIENT_STAGE,
  CLIENT_STAGE_LABELS,
  MAX_SESSION_CREDITS,
  ROLES,
  SESSION_CREDIT_KIND,
  SIGNUP_SOURCE,
  toClientStage,
} from "@/lib/constants";

export type AddClientState = InviteState;

export async function addClient(
  _prev: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  const trainer = await requireTrainer();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  let password = String(formData.get("password") ?? "").trim();
  // Coerced rather than trusted — an unrecognised value reads as ACTIVE, which
  // is what the form shows by default and what the column defaults to.
  const stage = toClientStage(formData.get("stage"));

  if (!name || !email) {
    return { error: "Add a name and an email for your client." };
  }
  // The form never offers this, so reaching it means a hand-made request. An
  // account created straight into the archive would be one that has never been
  // used and already can't sign in.
  if (stage === CLIENT_STAGE.ARCHIVED) {
    return { error: "New clients can't be added as old clients." };
  }
  if (password && password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // The cap, checked here rather than only in the form: the form disables a
  // full option, and a disabled option is a courtesy to whoever is looking at
  // it, not a control. Counted fresh on every add, so two tabs can't both slip
  // past a check made when the page was rendered.
  const full = await checkRoom(trainer.id, stage);
  if (full) return { error: full };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Someone already uses that email." };
  }

  if (!password) password = generatePassword();

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        role: ROLES.CLIENT,
        stage,
        trainerId: trainer.id,
        passwordHash: await hashPassword(password),
        signupSource: SIGNUP_SOURCE.TRAINER,
      },
    });
  } catch (err) {
    // The lookup above and this insert aren't atomic; the unique index is what
    // actually settles two coaches adding the same address at once.
    if (isUniqueViolation(err)) {
      return { error: "Someone already uses that email." };
    }
    throw err;
  }

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

export type SetStageState = { error?: string; ok?: string };

// Move someone between "client" and "prospect".
//
// The interesting part is that the destination has its own cap, so promoting a
// prospect can fail on a full client roster. That's the check doing its job
// rather than a rough edge: the two allowances exist precisely so a coach can
// court twenty people without any of them silently becoming a forty-first
// client.
//
// Nothing else about the account changes. A prospect's sessions, plans, weigh-
// ins and messages all belong to the same row, so someone who trials for a
// month and signs up keeps every bit of their history — which is the whole
// reason stage is a column and not a separate kind of record.
export async function setClientStage(
  clientId: string,
  _prev: SetStageState,
  formData: FormData,
): Promise<SetStageState> {
  const trainer = await requireTrainer();

  const stage = toClientStage(formData.get("stage"));

  // Reloaded and ownership-checked in one query rather than trusting the form,
  // the same guard resetClientPassword makes below.
  const client = await prisma.user.findFirst({
    where: { id: clientId, trainerId: trainer.id, role: ROLES.CLIENT },
    select: { id: true, stage: true },
  });
  if (!client) return { error: "That client no longer exists." };

  if (toClientStage(client.stage) === stage) {
    return { ok: `Already a ${CLIENT_STAGE_LABELS[stage].toLowerCase()}.` };
  }

  const full = await checkRoom(trainer.id, stage);
  if (full) return { error: full };

  const archiving = stage === CLIENT_STAGE.ARCHIVED;

  await prisma.user.update({
    where: { id: client.id },
    data: {
      stage,
      // Archiving ends their access now, not in thirty days. getCurrentUser
      // already refuses an archived account, and bumping the epoch retires the
      // cookie itself — the same mechanism a password reset uses, for the same
      // reason: a stateless session would otherwise outlive the decision.
      ...(archiving ? { sessionEpoch: { increment: 1 } } : {}),
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${client.id}`);
  revalidatePath("/dashboard");

  return {
    ok: archiving
      ? `Now an old client — signed out, and their records are kept.`
      : `Now a ${CLIENT_STAGE_LABELS[stage].toLowerCase()}.`,
  };
}

export type SessionCreditState = { error?: string; ok?: string };

// Put paid sessions on a client's account, or take them off.
//
// One action for both directions rather than an add and a subtract: the ledger
// entry is signed either way (see SessionCredit in schema.prisma), and a coach
// correcting a miscount is doing the same thing as a coach selling a block,
// with a different sign and a different label on it.
export async function addClientSessions(
  clientId: string,
  _prev: SessionCreditState,
  formData: FormData,
): Promise<SessionCreditState> {
  const trainer = await requireTrainer();

  const raw = String(formData.get("count") ?? "").trim();
  const delta = Number(raw);
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!raw || !Number.isInteger(delta) || delta === 0) {
    return { error: "Enter a whole number of sessions." };
  }
  // Bounded in both directions. Refused rather than clamped, for the reason
  // toSessionLength gives: a silently corrected number is an entry nobody
  // chose, on the one record in the app with money behind it.
  if (Math.abs(delta) > MAX_SESSION_CREDITS) {
    return { error: `That's more than ${MAX_SESSION_CREDITS} at once.` };
  }

  const client = await prisma.user.findFirst({
    where: { id: clientId, trainerId: trainer.id, role: ROLES.CLIENT },
    select: { id: true },
  });
  if (!client) return { error: "That client no longer exists." };

  await addSessionCredits({
    clientId: client.id,
    trainerId: trainer.id,
    delta,
    // A debit typed in by hand is a correction; adding is a sale. The kind is
    // the label on the statement, and SESSION is reserved for the app's own
    // entries so "used" always means somebody trained.
    kind: delta > 0 ? SESSION_CREDIT_KIND.PURCHASE : SESSION_CREDIT_KIND.ADJUSTMENT,
    note,
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${client.id}`);
  revalidatePath("/dashboard");

  const { balance } = await balanceFor(client.id);
  return {
    ok: `${delta > 0 ? "Added" : "Removed"} ${Math.abs(delta)} session${Math.abs(delta) === 1 ? "" : "s"} — balance ${balance}.`,
  };
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
