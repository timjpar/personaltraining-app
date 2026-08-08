// The user's IANA time zone: validating one, and deciding what to use when we
// don't have one.
//
// Worth being clear about the scope, because it looks like the start of a
// timezone rework and isn't. The app stores a day as a local-midnight date and
// a time as minutes past midnight, deliberately (see the comment on
// CalendarEvent). None of that changes. This value is a *label* that travels
// alongside a wall-clock time when we hand it to Google, which refuses to
// interpret "09:00" without being told whose 09:00 it is.

// Anything unrecognised gets rejected rather than coerced, which is the
// opposite of toEventKind's contract and deliberately so: a wrong-but-valid
// zone is silently wrong — the session simply lands at 9am somewhere else —
// whereas a null falls back to something we can reason about.
export function toTimeZone(value: unknown): string | null {
  const s = String(value ?? "").trim();
  // IANA names are short; anything longer is not a zone and shouldn't be handed
  // to the Intl constructor to find out.
  if (!s || s.length > 64) return null;
  try {
    // The throw *is* the validation. Intl.supportedValuesOf("timeZone") would
    // also work, but it's Node 20+ and allocates a ~600-entry array on every
    // call to answer a yes/no question.
    new Intl.DateTimeFormat("en-US", { timeZone: s });
    return s;
  } catch {
    // RangeError: not a zone this runtime knows.
    return null;
  }
}

// The zone to actually use for a user. The middle rung matters: the server's
// own zone is what every existing formatter in the app already renders in, so
// falling back to it keeps a not-yet-probed user consistent with what they see
// on screen rather than jumping them somewhere new.
export function zoneFor(user: { timeZone: string | null }): string {
  return (
    user.timeZone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    "UTC"
  );
}

// What hour it is for someone right now, 0-23, in their own zone. The digest
// needs this: it fires from an hourly cron on a server that may be anywhere,
// and "is it 8pm for this coach yet" is not a question the server's own clock
// can answer.
//
// formatToParts with hourCycle "h23" rather than hour12: false, which is not
// interchangeable — several ICU versions return "24" for midnight under
// hour12: false, and an hour that reads as 24 matches no digestHour and
// silently drops that trainer's digest for the day. The % 24 is belt to that
// braces on runtimes that still manage it.
export function localHour(at: Date, timeZone: string): number {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "numeric",
  })
    .formatToParts(at)
    .find((p) => p.type === "hour");
  const n = Number(part?.value);
  return Number.isFinite(n) ? n % 24 : 0;
}

// The calendar day it is for someone right now, as "2026-08-07". This is what
// DigestRun.day stores, and the reason that column is a String: the day is
// resolved in the trainer's zone, not the server's, so a local-midnight
// DateTime would be ambiguous about which midnight it meant.
//
// en-CA gives ISO order natively, which beats reassembling parts by hand.
export function localDay(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}
