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

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function setSession(user: { id: string; role: string }) {
  const token = await signSession({
    userId: user.id,
    role: user.role as (typeof ROLES)[keyof typeof ROLES],
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
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
  return prisma.user.findUnique({ where: { id: session.userId } });
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
