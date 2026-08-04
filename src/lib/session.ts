// Edge-safe session helpers (jose only — no next/headers, no DB). Safe to
// import from middleware. Cookie read/write lives in auth.ts.
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./constants";

export const SESSION_COOKIE = "pt_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const ALG = "HS256";

// Also used to sign the short-lived Google sign-in handshake cookie, which has
// the same requirement: a value the browser holds that we must be able to trust
// on the way back in.
export function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { userId: string; role: Role };

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return { userId: payload.sub, role: payload.role as Role };
  } catch {
    return null;
  }
}
