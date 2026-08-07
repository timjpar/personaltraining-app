import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { ROLES } from "@/lib/constants";

// /reset is listed as a bare prefix, which isPublic() extends to /reset/<token>.
// Reaching a reset link is by definition something you do while signed out —
// gating it behind a session would send everyone who needs it to the very page
// they can't get past.
const PUBLIC_PATHS = ["/login", "/register", "/forgot", "/reset"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  // Not signed in: allow the auth pages, redirect everything else to login.
  if (!session) {
    if (isPublic(pathname)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // The auth pages stay reachable even with a session cookie. The cookie only
  // proves the token was signed by us, not that the account still exists, so
  // bouncing signed-in visitors away from /login here would trap anyone holding
  // a stale cookie in a redirect loop: the page checks the database, finds no
  // user, and sends them straight back. That check belongs in the (auth) layout,
  // which can actually look the account up.
  if (isPublic(pathname)) return NextResponse.next();

  const home = session.role === ROLES.TRAINER ? "/dashboard" : "/my";

  // Signed in and on the root: send to the role's home.
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  // Keep each role inside its own area.
  const trainerArea =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/workouts") ||
    pathname.startsWith("/library") ||
    pathname.startsWith("/programs") ||
    pathname.startsWith("/nutrition");
  const clientArea = pathname.startsWith("/my");

  // /admin, /exercises and /climbing are in neither list on purpose, so both
  // roles fall through to the page — that is the whole reason each has its own
  // route group. /admin is granted by email and the isAdmin column (see
  // src/lib/admin.ts) while the session token carries only the role, so this is
  // the wrong layer to judge it from; requireAdmin() in the (admin) layout is
  // the actual gate. /exercises and /climbing are simply for everyone —
  // /exercises used to be trainer-only and listing it here again would redirect
  // every client away from the movement library. Adding any of these prefixes
  // to a list below would send half the app's users somewhere else.

  if (session.role === ROLES.CLIENT && trainerArea) {
    const url = req.nextUrl.clone();
    url.pathname = "/my";
    return NextResponse.redirect(url);
  }
  if (session.role === ROLES.TRAINER && clientArea) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next internals, and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
