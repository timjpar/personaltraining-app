// Step two of Google sign-in: Google sends the browser back here with a code.
// Nothing in this request is trusted until the state matches the cookie set in
// ../route.ts and the ID token verifies against Google's keys.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { sessionCookie } from "@/lib/auth";
import { recordLoginSafely } from "@/lib/login-log";
import {
  isArchivedClient,
  LOGIN_METHOD,
  LOGIN_OUTCOME,
  ROLES,
} from "@/lib/constants";
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

  const user = await resolveUser(identity);

  // No account for this Google identity. The app is invite-only, so this is the
  // door the missing sign-up form would otherwise have left wide open — a
  // Google button that creates an account is a sign-up form with fewer fields.
  //
  // Audited like any other failed attempt, and for the same reason a wrong
  // password is: an address turning up here repeatedly is someone trying to get
  // in, which is precisely what the log is for.
  if (!user) {
    await recordLoginSafely({
      email: identity.email,
      method: LOGIN_METHOD.GOOGLE,
      outcome: LOGIN_OUTCOME.NO_ACCOUNT,
    });
    return fail(req, "noaccount");
  }

  // Same rule the password form applies, at the same point in the sequence:
  // the identity has already been proved, so the real reason is safe to give.
  if (isArchivedClient(user)) {
    await recordLoginSafely({
      email: user.email,
      method: LOGIN_METHOD.GOOGLE,
      outcome: LOGIN_OUTCOME.ARCHIVED,
      userId: user.id,
    });
    return fail(req, "archived");
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

// Finds the account this Google identity belongs to, or null. It never creates
// one: accounts are made by an admin or by a coach, and this is a sign-in
// route, not the third way in.
//
// What it does still do is *link* — which is the whole reason Google sign-in
// survives a closed beta. Someone whose account was created for them, with a
// password they never chose, can press the Google button and be recognised, and
// from then on they have nothing to remember.
async function resolveUser(identity: GoogleIdentity): Promise<User | null> {
  const linked = await prisma.user.findUnique({
    where: { googleId: identity.googleId },
  });
  if (linked) return linked;

  // First Google sign-in for an email we already know: link the two. Only safe
  // because the address is verified above — that check is what stands between
  // this and handing an account to anyone who can get Google to mint a token
  // naming somebody else's address.
  const byEmail = await prisma.user.findUnique({
    where: { email: identity.email },
  });
  if (!byEmail) return null;

  return prisma.user.update({
    where: { id: byEmail.id },
    data: { googleId: identity.googleId },
  });
}

function fail(req: NextRequest, error: GoogleError) {
  const res = NextResponse.redirect(
    new URL(`/login?error=${error}`, req.nextUrl),
  );
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}
