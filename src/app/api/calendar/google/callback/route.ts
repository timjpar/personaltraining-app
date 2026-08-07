// Step two of connecting Google Calendar. Mirrors the sign-in callback's
// shape — verify the handshake, exchange the code, trust only what the ID token
// says — and then does the two things that flow needs and sign-in doesn't:
// keeps the refresh token, and creates the calendar we'll write to.
import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { googleConfig, redirectUri, verifyHandshake } from "@/lib/google";
import { exchangeCode, seal } from "@/lib/google-tokens";
import {
  CALENDAR_SCOPE,
  createCalendar,
  type GcalMessage,
} from "@/lib/google-calendar";
import { syncGoogleCalendarSafely } from "@/lib/calendar-sync";
import { ROLES } from "@/lib/constants";
import { GCAL_COOKIE, GCAL_CALLBACK_PATH } from "../route";

export async function GET(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/login", req.nextUrl));

  const home = session.role === ROLES.TRAINER ? "/calendar" : "/my/calendar";

  const config = googleConfig();
  if (!config) return done(req, home, "unconfigured");

  if (req.nextUrl.searchParams.get("error")) return done(req, home, "cancelled");

  const handshake = await verifyHandshake(
    req.cookies.get(GCAL_COOKIE)?.value,
    "gcal",
  );
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!handshake || !code || !state || state !== handshake.state) {
    return done(req, home, "handshake");
  }

  const grant = await exchangeCode(
    config,
    code,
    redirectUri(req.nextUrl.origin, GCAL_CALLBACK_PATH),
    handshake.verifier,
    handshake.nonce,
  );
  if (!grant) return done(req, home, "exchange");

  // Without a refresh token the connection is good for an hour and then dead,
  // which is worse than not connecting: it would look like it worked. Refusing
  // at the door is the only honest option.
  if (!grant.refreshToken) return done(req, home, "norefresh");

  // What Google *granted*, not what we asked for — the consent screen lets
  // people untick individual permissions, and discovering that on the first
  // push means a connection that exists but never works.
  if (!grant.scope.split(" ").includes(CALENDAR_SCOPE)) {
    return done(req, home, "noscope");
  }

  // Reused rather than deleted and recreated, so a reconnect keeps calendarId
  // and every mapping row — otherwise reconnecting would orphan the old
  // calendar and duplicate every event into a new one.
  const connection = await prisma.googleCalendarConnection.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      googleId: grant.googleId,
      email: grant.email,
      refreshToken: await seal(grant.refreshToken),
      accessToken: await seal(grant.accessToken),
      accessTokenExpiresAt: new Date(Date.now() + grant.expiresIn * 1000),
      scope: grant.scope,
      status: "ACTIVE",
    },
    update: {
      googleId: grant.googleId,
      email: grant.email,
      refreshToken: await seal(grant.refreshToken),
      accessToken: await seal(grant.accessToken),
      accessTokenExpiresAt: new Date(Date.now() + grant.expiresIn * 1000),
      scope: grant.scope,
      status: "ACTIVE",
      lastError: null,
    },
  });

  if (!connection.calendarId) {
    try {
      const calendarId = await createCalendar(grant.accessToken);
      await prisma.googleCalendarConnection.update({
        where: { id: connection.id },
        data: { calendarId },
      });
    } catch (err) {
      console.error("Failed to create the Chalkline calendar", err);
      // Not "exchange": the grant is already stored above, so the connection
      // exists and only the calendar is missing. googleCalendarState reports
      // that row as `incomplete` and the card offers to finish the job, which
      // lands back here to run exactly this block again.
      return done(req, home, "nocalendar");
    }
  }

  // The backfill, off the response path — a year of history can be hundreds of
  // events and nobody should watch a spinner for it.
  const userId = session.userId;
  after(() => syncGoogleCalendarSafely(userId, { full: true }));

  return done(req, home, "connected");
}

function done(req: NextRequest, home: string, code: GcalMessage) {
  const res = NextResponse.redirect(
    new URL(`${home}?google=${code}`, req.nextUrl),
  );
  res.cookies.delete(GCAL_COOKIE);
  return res;
}
