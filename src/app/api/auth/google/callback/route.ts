// Step two of Google sign-in: Google sends the browser back here with a code.
// Nothing in this request is trusted until the state matches the cookie set in
// ../route.ts and the ID token verifies against Google's keys.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { User } from "@/generated/prisma/client";
import { prisma, isUniqueViolation } from "@/lib/db";
import { sessionCookie } from "@/lib/auth";
import { recordLoginSafely } from "@/lib/login-log";
import { googleWelcomeEmail, sendMail } from "@/lib/mail";
import { LOGIN_METHOD, LOGIN_OUTCOME, ROLES, SIGNUP_SOURCE } from "@/lib/constants";
import {
  OAUTH_COOKIE,
  fetchIdentity,
  googleConfig,
  redirectUri,
  verifyHandshake,
  type GoogleError,
  type GoogleIdentity,
} from "@/lib/google";

export async function GET(req: NextRequest) {
  const config = googleConfig();
  if (!config) return fail(req, "unconfigured");

  // Google reports a refusal (usually "the user pressed cancel") as a query
  // param on an otherwise normal callback, not as an HTTP error.
  if (req.nextUrl.searchParams.get("error")) return fail(req, "cancelled");

  const handshake = await verifyHandshake(req.cookies.get(OAUTH_COOKIE)?.value);
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  // One check, several causes: an expired or missing cookie, a tampered state,
  // or a callback the user never started. They're indistinguishable from here
  // and the answer to all of them is to start again.
  if (!handshake || !code || !state || state !== handshake.state) {
    return fail(req, "handshake");
  }

  const identity = await fetchIdentity(
    config,
    code,
    redirectUri(req.nextUrl.origin),
    handshake,
  );
  if (!identity) return fail(req, "exchange");

  // Matching on an unverified address would let anyone who can get Google to
  // mint a token for someone else's email walk into that account.
  //
  // This is the first failure with an email attached, so it's the first one
  // worth auditing. The refusals above — cancelled, handshake, exchange — all
  // happen before any identity exists, and a row naming no account and no
  // address would be noise rather than a record of an attempt.
  if (!identity.emailVerified) {
    await recordLoginSafely({
      email: identity.email,
      method: LOGIN_METHOD.GOOGLE,
      outcome: LOGIN_OUTCOME.GOOGLE_UNVERIFIED,
    });
    return fail(req, "unverified");
  }

  const { user, created } = await resolveUser(identity);

  // Only on the sign-in that brought the account into existence. Best effort and
  // deliberately unawaited-on for its result: a mail failure must not turn a
  // successful sign-in into an error page.
  if (created) {
    await sendMail({
      ...googleWelcomeEmail(req.nextUrl.origin, user.name, user.email),
      to: user.email,
    });
  }

  await recordLoginSafely({
    email: user.email,
    method: LOGIN_METHOD.GOOGLE,
    outcome: LOGIN_OUTCOME.SUCCESS,
    userId: user.id,
  });

  const res = NextResponse.redirect(
    new URL(user.role === ROLES.TRAINER ? "/dashboard" : "/my", req.nextUrl),
  );
  const session = await sessionCookie(user);
  res.cookies.set(session.name, session.value, session.options);
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}

// Finds the account this Google identity belongs to, creating one if it's new.
// `created` is true only on the branch that actually inserted a row — the
// welcome email hangs off it, and every other branch is someone signing back
// into an account they already had.
async function resolveUser(
  identity: GoogleIdentity,
): Promise<{ user: User; created: boolean }> {
  const linked = await prisma.user.findUnique({
    where: { googleId: identity.googleId },
  });
  if (linked) return { user: linked, created: false };

  // First Google sign-in for an email we already know: link the two. This is
  // only safe because the address is verified above — it's what lets a client
  // whose trainer created their account sign in with Google and stay a client,
  // and what lets a trainer who registered with a password switch over.
  const byEmail = await prisma.user.findUnique({
    where: { email: identity.email },
  });
  if (byEmail) {
    const user = await prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId: identity.googleId },
    });
    return { user, created: false };
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: identity.email,
        // Google always sends a name for a real account, but the claim is
        // scope-dependent, so fall back rather than store an empty string.
        name: identity.name ?? identity.email.split("@")[0],
        googleId: identity.googleId,
        // Same as /register: signing yourself up means you're a coach. Clients
        // arrive as rows their trainer created, so they match by email above.
        role: ROLES.TRAINER,
        passwordHash: null,
        signupSource: SIGNUP_SOURCE.GOOGLE,
      },
    });
    return { user, created: true };
  } catch (err) {
    // Two sign-ins for a brand-new account at once: the loser reads back the
    // row the winner wrote instead of failing. `created: false` is what keeps
    // that race to one welcome email rather than two.
    if (isUniqueViolation(err)) {
      const existing = await prisma.user.findUnique({
        where: { googleId: identity.googleId },
      });
      if (existing) return { user: existing, created: false };
    }
    throw err;
  }
}

function fail(req: NextRequest, error: GoogleError) {
  const res = NextResponse.redirect(
    new URL(`/login?error=${error}`, req.nextUrl),
  );
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}
