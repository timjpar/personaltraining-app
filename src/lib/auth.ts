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
export async function sessionCookie(user: { id: string; role: string }) {
  const token = await signSession({
    userId: user.id,
    role: user.role as (typeof ROLES)[keyof typeof ROLES],
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

export async function setSession(user: { id: string; role: string }) {
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

  return user;
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
