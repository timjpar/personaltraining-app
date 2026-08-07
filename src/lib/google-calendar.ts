// The Google Calendar API, spoken directly with fetch.
//
// Not `googleapis`: this repo's entire dependency list is nine packages and it
// already speaks OIDC by hand. That library is a generated monolith dragging in
// google-auth-library, gaxios, gcp-metadata and gtoken, and its own auth state
// machine would fight the token handling in google-tokens.ts. We need seven
// HTTP calls. What we give up — generated types and built-in backoff — comes
// back as the narrow local types below and one retry helper.
import { sha256 } from "./random";
import { addDays, toDateInput } from "./format";

const BASE = "https://www.googleapis.com/calendar/v3";

// The narrowest scope that exists for this: create secondary calendars, and
// manage events only on calendars this app created. It is structurally
// incapable of touching the user's primary calendar, which is both a better
// consent screen and a far better story if this app is ever breached.
//
// The trade-off, stated plainly: it also forecloses ever *reading* the
// trainer's existing busy times ("don't let a client book over my dentist"). If
// that becomes a feature, swap this one constant for
// ".../auth/calendar.events" and everyone re-consents. Full ".../auth/calendar"
// is unnecessary either way.
export const CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.app.created";

// openid and email cost nothing extra — they're already granted at sign-in, so
// include_granted_scopes makes them free — and they buy a verified id_token
// telling us *which* Google account was connected.
export const CONNECT_SCOPE = `openid email ${CALENDAR_SCOPE}`;

export const CALENDAR_SUMMARY = "Chalkline";

// Every event payload is hashed to decide whether it needs pushing. Bumping
// this invalidates every hash, so a change to the payload shape re-pushes
// everything on the next pass — a one-constant deploy rather than a migration.
export const PAYLOAD_VERSION = "1";

// A timed entry with no end. Google requires an end, and an hour is what a
// session is when nobody said otherwise.
export const DEFAULT_EVENT_MINUTES = 60;

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(`Google Calendar API ${status}: ${detail}`);
    this.name = "GoogleApiError";
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }
  // The event or calendar isn't there — usually because the user deleted it in
  // Google, which is a normal thing to have happened rather than a failure.
  get isMissing() {
    return this.status === 404 || this.status === 410;
  }
  // Our deterministic id already exists on this calendar.
  get isConflict() {
    return this.status === 409;
  }
}

type GoogleTime = { date?: string; dateTime?: string; timeZone?: string };

export type GoogleEvent = {
  id?: string;
  summary?: string;
  description?: string;
  start?: GoogleTime;
  end?: GoogleTime;
  source?: { title: string; url: string };
  extendedProperties?: { private?: Record<string, string> };
  reminders?: { useDefault: boolean };
};

function hhmmss(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

// date + minute-of-day → the shape Google wants, doing no arithmetic on Date at
// all. Google accepts a wall-clock string with *no* offset plus an explicit
// timeZone, which is a byte-for-byte match for how this app already stores
// things — that's the whole reason the storage model didn't have to change.
export function toGoogleTimes(
  date: Date,
  startMinute: number | null,
  endMinute: number | null,
  timeZone: string,
): { start: GoogleTime; end: GoogleTime } {
  if (startMinute == null) {
    // All-day. Google's end is exclusive, so a one-day entry ends tomorrow.
    // addDays is the existing DST-safe helper — millisecond arithmetic would
    // drift across a spring-forward.
    return {
      start: { date: toDateInput(date) },
      end: { date: toDateInput(addDays(date, 1)) },
    };
  }

  const rawEnd = endMinute ?? startMinute + DEFAULT_EVENT_MINUTES;
  // The case that's easy to get wrong and hard to notice: a 23:30 session with
  // no end time runs to 24:30, which is not a time. Roll the date instead.
  const dayOffset = Math.floor(rawEnd / (24 * 60));
  const endInDay = rawEnd - dayOffset * 24 * 60;

  return {
    start: {
      dateTime: `${toDateInput(date)}T${hhmmss(startMinute)}`,
      timeZone,
    },
    end: {
      dateTime: `${toDateInput(addDays(date, dayOffset))}T${hhmmss(endInDay)}`,
      timeZone,
    },
  };
}

// Google's event ids are restricted to base32hex — lowercase a-v and 0-9 — so
// a cuid can't be used raw (it contains letters past 'v'). Hashing gives a
// legal id that is also *deterministic*, which is the idempotency primitive the
// whole sync rests on: two concurrent passes inserting the same item aim at the
// same id, and the loser gets a 409 we treat as success.
//
// Keyed on the source row, not the connection: a trainer and their client each
// write to their own separate calendar, and ids only need to be unique within
// one calendar.
export async function googleEventId(
  source: string,
  sourceId: string,
): Promise<string> {
  const bytes = await sha256(`${PAYLOAD_VERSION}:${source}:${sourceId}`);
  let out = "c"; // must start with a letter for some Google clients
  for (const byte of bytes.slice(0, 20)) {
    out += "0123456789abcdefghijklmnopqrstuv"[byte % 32];
  }
  return out;
}

async function gfetch(
  token: string,
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });

  if (res.ok) {
    // 204 on delete has no body to parse.
    return res.status === 204 ? null : await res.json();
  }

  // One jittered retry on the two statuses that mean "ask again later". Not a
  // loop: this runs inside an after() callback with a platform time limit, and
  // the next scheduled pass is a better place to keep trying than this one.
  if (retry && (res.status === 429 || res.status >= 500)) {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 700));
    return gfetch(token, path, init, false);
  }

  throw new GoogleApiError(res.status, await res.text());
}

export async function createCalendar(token: string): Promise<string> {
  const body = (await gfetch(token, "/calendars", {
    method: "POST",
    body: JSON.stringify({
      summary: CALENDAR_SUMMARY,
      description:
        "Sessions and events from your Chalkline coaching workspace. " +
        "Chalkline writes to this calendar one way — changes you make here " +
        "won't appear in Chalkline.",
    }),
  })) as { id?: string };
  if (!body?.id) throw new GoogleApiError(500, "calendars.insert returned no id");
  return body.id;
}

export async function deleteCalendar(
  token: string,
  calendarId: string,
): Promise<void> {
  await gfetch(token, `/calendars/${encodeURIComponent(calendarId)}`, {
    method: "DELETE",
  });
}

export async function insertEvent(
  token: string,
  calendarId: string,
  event: GoogleEvent,
): Promise<void> {
  await gfetch(token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function patchEvent(
  token: string,
  calendarId: string,
  eventId: string,
  event: GoogleEvent,
): Promise<void> {
  await gfetch(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: JSON.stringify(event) },
  );
}

export async function deleteEvent(
  token: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  await gfetch(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
}

// A connect that doesn't complete lands back on the calendar with ?google=<code>.
// Separate from GOOGLE_ERRORS in google.ts on purpose: those redirect to /login
// and say things about signing in, and merging the two would put sign-in copy
// on a settings card.
export const GCAL_MESSAGES = {
  unconfigured: "Google isn't set up on this server yet.",
  cancelled: "Connecting Google Calendar was cancelled.",
  handshake: "That took too long. Try connecting again.",
  exchange: "Google couldn't complete that connection. Try again.",
  // The grant landed and the connection is stored; only the calendar we write to
  // is missing. Separate from `exchange` because telling someone their
  // connection failed when it didn't sends them back through the whole consent
  // flow to redo a step that already succeeded.
  nocalendar:
    "Connected, but Chalkline couldn't create the calendar. Finish setup to try again.",
  // The distinctive one. Google only issues a refresh token on the *first*
  // grant unless the consent screen is forced, so this means the forcing
  // didn't take — usually an app permission that needs removing first.
  norefresh:
    "Google didn't grant offline access. Remove Chalkline from your Google account's app permissions, then connect again.",
  noscope:
    "Chalkline needs the calendar permission to sync. Connect again and leave it ticked.",
  connected: "Google Calendar connected.",
} as const;

export type GcalMessage = keyof typeof GCAL_MESSAGES;

// Everything in GCAL_MESSAGES reports a failure except this one, and the card has
// to be able to tell them apart. Dressed in the success colour, "Google couldn't
// complete that connection" reads as reassurance.
const GCAL_OK: GcalMessage = "connected";

export function gcalMessage(
  code: string | undefined,
): { text: string; ok: boolean } | undefined {
  if (!code) return undefined;
  const text = GCAL_MESSAGES[code as GcalMessage];
  if (!text) return undefined;
  return { text, ok: code === GCAL_OK };
}
