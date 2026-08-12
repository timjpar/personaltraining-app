"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUniqueViolation, prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requireAdmin, requireOwner, isOwnerEmail, isAdminUser } from "@/lib/admin";
import { newTrainerEmail, sendMail } from "@/lib/mail";
import { generatePassword } from "@/lib/password";
import { requestOrigin } from "@/lib/request-origin";
import { ROLES, SIGNUP_SOURCE } from "@/lib/constants";

export type ResetPasswordState = {
  error?: string;
  password?: string;
};

export type DeleteUserState = {
  error?: string;
};

export type AdminAccessState = {
  error?: string;
};

export type UpdateAccountState = {
  error?: string;
  ok?: string;
};

// Every mutation here reloads the target from the database rather than trusting
// what the form said about it. The form was rendered from a page the admin may
// have had open for a while, and these are the decisions where being one edit
// behind matters.
async function loadTarget(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export type AddTrainerState = {
  error?: string;
  // Mirrors AddClientState in (trainer)/clients/actions.ts, including the
  // `emailed` flag: false means the account exists but nothing reached them, so
  // the password on screen is the only way in and the form keeps showing it.
  created?: {
    name: string;
    email: string;
    password: string;
    emailed: boolean;
  };
};

// The only way a coach account comes into existence. Self-registration is gone
// (see (auth)/actions.ts), so this is the top of the tree: an admin makes
// coaches, coaches make their own clients, and nobody makes themselves
// anything.
//
// requireAdmin rather than requireOwner, deliberately, and it's worth saying
// why given how carefully setAdminAccess below is owner-only. That guard exists
// because minting admins turns one compromised account into permanent access.
// A coach is not an escalation: they get a workspace of their own and reach
// nothing outside it. Onboarding is the job a promoted admin is *for*, and
// making it owner-only would leave admins unable to do the one thing they were
// promoted to do.
export async function addTrainer(
  _prev: AddTrainerState,
  formData: FormData,
): Promise<AddTrainerState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  let password = String(formData.get("password") ?? "").trim();

  if (!name || !email) {
    return { error: "Add a name and an email for the coach." };
  }
  // Same floor as every other password path in the app.
  if (password && password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

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
        role: ROLES.TRAINER,
        passwordHash: await hashPassword(password),
        signupSource: SIGNUP_SOURCE.ADMIN,
      },
    });
  } catch (err) {
    // The check above and this insert aren't atomic. The unique index settles
    // it, and the loser reads the same sentence rather than a 500.
    if (isUniqueViolation(err)) {
      return { error: "Someone already uses that email." };
    }
    throw err;
  }

  // Best effort, exactly as addClient does it: sendMail returns false rather
  // than throwing, so a mail outage can't undo an account already written. The
  // result goes back to the form because the admin is then the delivery
  // mechanism.
  const emailed = await sendMail({
    ...newTrainerEmail(await requestOrigin(), name, email, password),
    to: email,
  });

  revalidatePath("/admin");

  return { created: { name, email, password, emailed } };
}

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const admin = await requireAdmin();

  const typed = String(formData.get("password") ?? "").trim();

  // Same floor as /register — an admin-set password shouldn't be weaker than
  // one the account holder could have chosen themselves.
  if (typed && typed.length < 8) {
    return { error: "Use at least 8 characters." };
  }

  const user = await loadTarget(formData);
  if (!user) return { error: "That account no longer exists." };

  // Setting someone's password is taking their account. A promoted admin doing
  // that to an owner would be a way around every owner-only guard below, so
  // admins reach ordinary accounts only.
  if (isAdminUser(user) && !isOwnerEmail(admin.email)) {
    return { error: "Only an owner can reset another admin's password." };
  }

  const password = typed || generatePassword();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      // Every path that sets a password bumps this, or the reset is cosmetic:
      // session tokens are stateless and last thirty days, so without it an
      // admin locking someone out leaves them signed in for a month.
      sessionEpoch: { increment: 1 },
    },
  });

  revalidatePath(`/admin/users/${user.id}`);

  // Returned once, to be read off the screen and passed on. Nothing stores the
  // plaintext, so closing the page is the end of it.
  return { password };
}

// Owner-only. A promoted admin managing ordinary accounts is the point; one
// that can mint more admins turns a single compromised account into permanent
// access, so the tier that grants access stays anchored to ADMIN_EMAILS.
export async function setAdminAccess(
  _prev: AdminAccessState,
  formData: FormData,
): Promise<AdminAccessState> {
  const owner = await requireOwner();

  const grant = String(formData.get("grant") ?? "") === "1";

  const user = await loadTarget(formData);
  if (!user) return { error: "That account no longer exists." };

  if (user.id === owner.id) {
    return { error: "You can't change your own access." };
  }
  if (isOwnerEmail(user.email)) {
    return { error: "That's an owner account. Change ADMIN_EMAILS instead." };
  }
  // Admin is an overlay on a coaching account. A client with it would land in
  // an area whose "Coaching" tab points at /dashboard, which the proxy bounces
  // straight back for their role.
  if (grant && user.role !== ROLES.TRAINER) {
    return { error: "Only trainer accounts can be given admin access." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: grant },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/users/${user.id}`);
  return {};
}

export async function updateAccount(
  _prev: UpdateAccountState,
  formData: FormData,
): Promise<UpdateAccountState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  // "" is the "No trainer" option, which is a real choice — it unassigns.
  const trainerId = String(formData.get("trainerId") ?? "").trim() || null;

  if (!name || !email) return { error: "Name and email are both required." };
  if (role !== ROLES.TRAINER && role !== ROLES.CLIENT) {
    return { error: "Pick a role." };
  }

  const user = await loadTarget(formData);
  if (!user) return { error: "That account no longer exists." };

  if (isAdminUser(user) && !isOwnerEmail(admin.email)) {
    return { error: "Only an owner can edit another admin's account." };
  }

  const roleChanged = role !== user.role;

  if (roleChanged) {
    if (user.id === admin.id) {
      return { error: "You can't change your own role." };
    }
    // Their access was granted on the strength of being a coach. Revoking it is
    // a separate, deliberate decision rather than a side effect of this one.
    if (isAdminUser(user)) {
      return { error: "Revoke admin access before changing this role." };
    }
    if (user.role === ROLES.TRAINER) {
      const clients = await prisma.user.count({
        where: { trainerId: user.id },
      });
      if (clients > 0) {
        return {
          error: `Reassign their ${clients} client${clients === 1 ? "" : "s"} to another trainer first.`,
        };
      }
    }
  }

  // A trainer has no trainer of their own, so the column is cleared rather than
  // left pointing at whoever used to coach them.
  const nextTrainerId = role === ROLES.TRAINER ? null : trainerId;

  if (nextTrainerId) {
    if (nextTrainerId === user.id) {
      return { error: "An account can't be its own trainer." };
    }
    const trainer = await prisma.user.findFirst({
      where: { id: nextTrainerId, role: ROLES.TRAINER },
      select: { id: true },
    });
    if (!trainer) return { error: "That trainer no longer exists." };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      // googleId is deliberately untouched: Google matches on that claim, not
      // on the address, so changing the email here doesn't strand a linked
      // account or silently hand it to whoever holds the old one.
      data: { name, email, role, trainerId: nextTrainerId },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Another account already uses that email." };
    }
    throw err;
  }

  revalidatePath("/admin");
  // The reassignment moves a row between two trainers' client lists, and a role
  // change moves it between sections, so every account page can be stale.
  revalidatePath("/admin/users/[id]", "page");

  return {
    ok: roleChanged
      ? "Saved. They'll be signed out and asked to sign in again."
      : "Saved.",
  };
}

export async function deleteUser(
  _prev: DeleteUserState,
  formData: FormData,
): Promise<DeleteUserState> {
  const admin = await requireAdmin();

  const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase();

  const user = await loadTarget(formData);
  if (!user) return { error: "That account no longer exists." };

  if (user.id === admin.id) {
    return { error: "You can't delete the account you're signed in as." };
  }
  // Deleting a peer from a page only admins can reach is a foot-gun with no
  // legitimate use. Owners are an env change; promoted admins get demoted
  // first, which is a decision worth making on its own.
  if (isOwnerEmail(user.email)) {
    return { error: "That's an owner account. Remove it from ADMIN_EMAILS first." };
  }
  if (user.isAdmin) {
    return { error: "That's an admin account. Revoke its access first." };
  }

  // Typing the address is the whole guard, so it has to match exactly.
  if (confirm !== user.email.toLowerCase()) {
    return { error: "Type the account's email exactly to confirm." };
  }

  // Everything the schema cascades goes with this: workouts (as trainer and as
  // client), templates, programs, nutrition plans, calendar events, feed items,
  // and the exercise catalog. Clients of a deleted trainer are *not* deleted —
  // User.trainerId is optional with no onDelete, so they survive with a null
  // trainer. LoginEvent rows survive too, with a null userId.
  await prisma.user.delete({ where: { id: user.id } });

  revalidatePath("/admin");
  redirect("/admin");
}
