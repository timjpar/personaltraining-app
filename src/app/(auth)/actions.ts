"use server";

import { redirect } from "next/navigation";
import { prisma, isUniqueViolation } from "@/lib/db";
import { hashPassword, verifyPassword, setSession } from "@/lib/auth";
import { recordLoginSafely } from "@/lib/login-log";
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

  // Kept outside the try: redirect() signals by throwing, and catching it here
  // would swallow the navigation.
  await setSession(user);
  redirect("/dashboard");
}
