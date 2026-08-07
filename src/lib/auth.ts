// Server-side auth: password hashing, session cookie management, and the
// current-user lookup used by pages and server actions.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { ROLES } from "./constants";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
} from "./session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

// `hash` is null for accounts that only ever signed in with Google. Those have
// no password to be right about, so nothing can match.
export async function verifyPassword(password: string, hash: string | null) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

// The signed cookie as data, for callers that build their own Response —
// the Google callback returns a redirect it constructs itself, so it can't
// rely on the request-scoped cookie store.
export async function sessionCookie(user: {
  id: string;
  role: string;
  sessionEpoch: number;
}) {
  const token = await signSession({
    userId: user.id,
    role: user.role as (typeof ROLES)[keyof typeof ROLES],
    epoch: user.sessionEpoch,
  });
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  } as const;
}

export async function setSession(user: {
  id: string;
  role: string;
  sessionEpoch: number;
}) {
  const { name, value, options } = await sessionCookie(user);
  const store = await cookies();
  store.set(name, value, options);
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;

  // The token carries the role it was minted with, and src/proxy.ts routes off
  // that while the layouts route off this row. Once an admin can change a role
  // (see the admin area), the two can disagree — and a disagreement is a
  // redirect loop: the proxy sends a TRAINER token to /dashboard, the layout
  // reads CLIENT and sends it to /my, the proxy sends it back. Treating the
  // stale token as no session ends it: they sign in again and get a fresh one.
  // The cookie itself is left alone; writing cookies during a render isn't
  // allowed, and an inert token does no harm.
  if (user.role !== session.role) return null;

  // The same mechanism, for the same reason, applied to password changes. A
  // reset is usually someone taking their account back, and a stateless
  // thirty-day cookie would otherwise leave whoever they're locking out signed
  // in the whole time. Every path that sets a password bumps the epoch, so
  // every session but the one the reset itself mints is retired here.
  if (user.sessionEpoch !== session.epoch) return null;

  return user;
}

// The inverse of requireUser, for the signed-out pages. It looks the account up
// rather than trusting the cookie, so a session for a deleted account falls
// through to the form instead of bouncing — signing in replaces the cookie.
//
// Called per page rather than from the (auth) layout, because /reset
// deliberately does *not* want it: forgetting your password on the machine
// you're still signed in on is one of the ordinary ways to end up holding a
// reset link, and bouncing that click to /dashboard makes the link unusable
// exactly when it's needed.
export async function redirectIfSignedIn() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === ROLES.TRAINER ? "/dashboard" : "/my");
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireTrainer() {
  const user = await requireUser();
  if (user.role !== ROLES.TRAINER) redirect("/my");
  return user;
}

export async function requireClient() {
  const user = await requireUser();
  if (user.role !== ROLES.CLIENT) redirect("/dashboard");
  return user;
}
