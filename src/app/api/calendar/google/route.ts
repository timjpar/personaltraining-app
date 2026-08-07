// Step one of connecting Google Calendar. Deliberately a separate flow from
// signing in: bolting the calendar scope onto the sign-in button would make
// every new account face a scary consent screen for a feature most won't use,
// and every account that already signed in with Google has a grant with no
// refresh token in it anyway.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import {
  authorizationUrl,
  createHandshake,
  googleConfig,
  redirectUri,
  signHandshake,
} from "@/lib/google";
import { CONNECT_SCOPE } from "@/lib/google-calendar";
import { ROLES } from "@/lib/constants";

export const GCAL_COOKIE = "pt_gcal";
export const GCAL_MAX_AGE = 60 * 10;
export const GCAL_CALLBACK_PATH = "/api/calendar/google/callback";

export async function GET(req: NextRequest) {
  // src/proxy.ts does not match /api, so nothing has checked a session before
  // this line. Unlike the sign-in routes — which are legitimately reachable
  // signed-out — this one mutates a signed-in account, and leaving it open
  // would make it a CSRF-able "attach my Google account to whoever clicks it".
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const home = session.role === ROLES.TRAINER ? "/calendar" : "/my/calendar";

  const config = googleConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL(`${home}?google=unconfigured`, req.nextUrl),
    );
  }

  const handshake = await createHandshake();
  const url = await authorizationUrl(
    config,
    redirectUri(req.nextUrl.origin, GCAL_CALLBACK_PATH),
    handshake,
    {
      scope: CONNECT_SCOPE,
      // Both of these are load-bearing, not decoration. Google issues a refresh
      // token only on a *first* grant unless the consent screen is forced —
      // and everyone who has already signed in with Google has an existing
      // grant, so without "consent" this succeeds and silently returns nothing
      // we can use tomorrow.
      accessType: "offline",
      prompt: "consent",
      // Keeps the sign-in scopes attached rather than replacing them.
      includeGrantedScopes: true,
    },
  );

  const res = NextResponse.redirect(url);
  res.cookies.set(GCAL_COOKIE, await signHandshake(handshake, "gcal"), {
    httpOnly: true,
    // Not "strict": the return from Google is a top-level cross-site
    // navigation, and strict would drop the cookie exactly when it's needed.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GCAL_MAX_AGE,
  });
  return res;
}
