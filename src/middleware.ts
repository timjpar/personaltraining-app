import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { ROLES } from "@/lib/constants";

const PUBLIC_PATHS = ["/login", "/register"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function middleware(req: NextRequest) {
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

  const home = session.role === ROLES.TRAINER ? "/dashboard" : "/my";

  // Signed in but on an auth page or the root: send to the role's home.
  if (isPublic(pathname) || pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  // Keep each role inside its own area.
  const trainerArea =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/workouts");
  const clientArea = pathname.startsWith("/my");

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
