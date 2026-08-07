"use server";

import { redirect } from "next/navigation";
import { prisma, isUniqueViolation } from "@/lib/db";
import { hashPassword, verifyPassword, setSession } from "@/lib/auth";
import { recordLoginSafely } from "@/lib/login-log";
import {
  googleOnlyEmail,
  mailConfig,
  resetEmail,
  sendMail,
  welcomeEmail,
} from "@/lib/mail";
import { requestOrigin } from "@/lib/request-origin";
import { consumeResetToken, createResetToken } from "@/lib/reset-token";
import { LOGIN_METHOD, LOGIN_OUTCOME, ROLES, SIGNUP_SOURCE } from "@/lib/constants";

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

  await log(LOGIN_OUTCOME.SUCCESS);
  await setSession(user);
  redirect(user.role === ROLES.TRAINER ? "/dashboard" : "/my");
}

export async function register(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Fill in every field to continue." };
  }
  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  // The check above and the insert below aren't atomic, so two simultaneous
  // signups for one email can both get past it. Let the unique index settle it
  // and report the loser the same way, rather than surfacing a 500.
  let user;
  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: ROLES.TRAINER,
        signupSource: SIGNUP_SOURCE.SELF,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "An account with that email already exists." };
    }
    throw err;
  }

  // Registering signs you in, so it belongs in the log as a sign-in too —
  // otherwise an account's first appearance there is its *second* visit.
  await recordLoginSafely({
    email,
    method: LOGIN_METHOD.PASSWORD,
    outcome: LOGIN_OUTCOME.SUCCESS,
    userId: user.id,
  });

  // Confirms which address the account answers to. The result is ignored on
  // purpose: nothing about having registered depends on the email arriving, and
  // sendMail already logs its own failures.
  await sendMail({
    ...welcomeEmail(await requestOrigin(), user.name, user.email),
    to: user.email,
  });

  // Kept outside the try: redirect() signals by throwing, and catching it here
  // would swallow the navigation.
  await setSession(user);
  redirect("/dashboard");
}

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
