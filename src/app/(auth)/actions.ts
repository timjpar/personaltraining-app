"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, setSession } from "@/lib/auth";
import { recordLoginSafely } from "@/lib/login-log";
import {
  googleOnlyEmail,
  mailConfig,
  resetEmail,
  sendMail,
} from "@/lib/mail";
import { requestOrigin } from "@/lib/request-origin";
import { consumeResetToken, createResetToken } from "@/lib/reset-token";
import {
  isArchivedClient,
  LOGIN_METHOD,
  LOGIN_OUTCOME,
  ROLES,
} from "@/lib/constants";

export type AuthState = { error?: string };

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  // An empty form isn't an attempt at anything, so it isn't worth an audit row.
  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  const log = (outcome: (typeof LOGIN_OUTCOME)[keyof typeof LOGIN_OUTCOME]) =>
    recordLoginSafely({
      email,
      method: LOGIN_METHOD.PASSWORD,
      outcome,
      userId: user?.id,
    });

  // A Google-only account has no password to be wrong about. The generic
  // mismatch message would send someone off to reset a password that doesn't
  // exist; /register already reveals whether an email is taken, so naming the
  // provider here gives an attacker nothing it didn't already have.
  if (user && !user.passwordHash) {
    await log(LOGIN_OUTCOME.GOOGLE_ONLY);
    return {
      error: "That account signs in with Google — use the button above.",
    };
  }

  // The log separates "no such account" from "wrong password"; the message
  // deliberately does not. Telling the two apart on screen would turn the form
  // into an oracle for which emails have accounts.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await log(user ? LOGIN_OUTCOME.BAD_PASSWORD : LOGIN_OUTCOME.NO_ACCOUNT);
    return { error: "That email and password don't match." };
  }

  // Deliberately after the password check, not before it. Refusing an archived
  // account on sight would make the form an oracle for which addresses belong
  // to closed accounts — the same reason the mismatch message above declines to
  // separate "no such account" from "wrong password". Once the password is
  // right, the person asking is the account holder and is owed the real reason.
  if (isArchivedClient(user)) {
    await log(LOGIN_OUTCOME.ARCHIVED);
    return {
      error:
        "This account has been closed by your coach. Your records are kept — ask them to reopen it if you need access.",
    };
  }

  await log(LOGIN_OUTCOME.SUCCESS);
  await setSession(user);
  redirect(user.role === ROLES.TRAINER ? "/dashboard" : "/my");
}

// There is no register action, and that absence is the closed beta.
//
// Accounts are made *for* people: an admin creates a coach from /admin, and a
// coach creates their clients from /clients. Both of those already existed —
// what changed is that they became the only two ways in. /register is a notice
// now, and the Google callback refuses an identity it doesn't already know
// (see api/auth/google/callback), because leaving that open would have made
// "no sign-up form" a formality anyone could walk around.

export type ResetRequestState = { error?: string; sent?: boolean };

export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address." };

  // /forgot already says so before rendering the form, so reaching this is
  // either a stale page or a direct post. Either way, claiming a mail was sent
  // when the server can't send any would be a lie someone waits on.
  if (!mailConfig()) {
    return {
      error:
        "Password resets by email aren't set up on this server. Ask your trainer to reset it for you.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const origin = await requestOrigin();
    if (!user.passwordHash) {
      // A Google-only account has no password to reset. Saying so by email
      // rather than on screen keeps the form from confirming which addresses
      // have accounts, while still ending the wait for a link that would be
      // useless — the same trade the login action makes in the other
      // direction, where the account is already proven to exist.
      await sendMail({ ...googleOnlyEmail(user.name), to: user.email });
    } else {
      const token = await createResetToken(user.id);
      // Null means they've tripped the rate limit. Nothing is sent and nothing
      // is said — the neutral response below covers it.
      if (token) {
        await sendMail({ ...resetEmail(origin, user.name, token), to: user.email });
      }
    }
  }

  // One answer for a match, a miss, a Google-only account and a rate limit
  // alike. Anything else turns this form into a directory of who has an account
  // here, which is precisely what the login action's generic error exists to
  // avoid — a second oracle on the next page over would undo it.
  return { sent: true };
}

export async function completePasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  // Every check that can fail happens before the token is spent. A mistyped
  // confirmation must not burn the link and send them back to the start.
  if (!password) return { error: "Choose a new password." };
  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }
  if (password !== confirm) return { error: "Those passwords don't match." };

  const target = await consumeResetToken(token);
  if (!target) {
    return {
      error: "That link has expired or has already been used. Request a new one.",
    };
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash: await hashPassword(password),
      // Retires every session in existence — including whoever's presence
      // prompted this. The one set immediately below carries the new epoch.
      sessionEpoch: { increment: 1 },
    },
  });

  // Its own method, not a PASSWORD success: an account taken over through the
  // mail flow is exactly what the audit log is for, and it's invisible if a
  // reset looks like an ordinary sign-in.
  await recordLoginSafely({
    email: user.email,
    method: LOGIN_METHOD.RESET,
    outcome: LOGIN_OUTCOME.SUCCESS,
    userId: user.id,
  });

  await setSession(user);
  redirect(user.role === ROLES.TRAINER ? "/dashboard" : "/my");
}
