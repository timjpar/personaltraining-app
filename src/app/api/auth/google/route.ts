// Step one of Google sign-in: mint the handshake, stash it in a cookie, and
// send the browser to Google. Step two is ./callback.
//
// This lives under /api, which proxy.ts deliberately doesn't match — a visitor
// starting sign-in has no session, and bouncing them to /login here would make
// the flow impossible to enter.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  OAUTH_COOKIE,
  OAUTH_MAX_AGE,
  authorizationUrl,
  createHandshake,
  googleConfig,
  redirectUri,
  signHandshake,
} from "@/lib/google";

export async function GET(req: NextRequest) {
  const config = googleConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL("/login?error=unconfigured", req.nextUrl),
    );
  }

  const handshake = await createHandshake();
  const url = await authorizationUrl(
    config,
    redirectUri(req.nextUrl.origin),
    handshake,
  );

  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, await signHandshake(handshake), {
    httpOnly: true,
    // Must be lax, not strict: the browser arrives back at the callback as a
    // top-level navigation *from Google*, and a strict cookie wouldn't be sent
    // with it — every sign-in would fail the state check.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_MAX_AGE,
  });
  return res;
}
