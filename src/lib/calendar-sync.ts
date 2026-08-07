// Pushing the app's calendar into Google, one way.
//
// The mechanism is reconcile-from-snapshot, not per-mutation deltas, and that
// is the central decision here. Five separate places create Workout rows —
// workout-actions.ts, library/actions.ts twice, programs/actions.ts, and
// my/actions.ts flips one to COMPLETED — and hanging a push off each is a
// maintenance trap that the sixth call site will quietly break. A reconcile
// derives what changed by comparing a content hash, and gets idempotency,
// retry and first-connect backfill from the same code path. The per-action
// triggers elsewhere exist only to make it feel instant; correctness does not
// depend on any of them firing.
//
// Nothing here ever throws at a caller. A Google push that fails must never be
// the reason a coach loses the session they just wrote — same contract as
// recordLoginSafely and recordExerciseNamesSafely, which the repo already
// states twice.
import { after } from "next/server";
import { prisma } from "./db";
import { appUrl } from "./app-url";
import { addDays, toDateInput } from "./format";
import { sha256Hex } from "./random";
import { zoneFor } from "./time-zone";
import { googleConfig } from "./google";
import { accessTokenFor, markRevoked } from "./google-tokens";
import type { GoogleCalendarState } from "@/components/GoogleCalendarCard";
import {
  deleteEvent,
  GoogleApiError,
  googleEventId,
  insertEvent,
  patchEvent,
  PAYLOAD_VERSION,
  toGoogleTimes,
  type GoogleEvent,
} from "./google-calendar";
import { WORKOUT_STATUS } from "./constants";

// The window a normal pass reconciles. A week back so a just-completed session
// still gets its tick, and four months forward, which is past any program
// anyone is writing today.
const BACK_DAYS = 7;
const FORWARD_DAYS = 120;

// First connect looks wider — a year of history is what makes the calendar feel
// populated rather than empty until the next session.
const FULL_BACK_DAYS = 30;
const FULL_FORWARD_DAYS = 365;

// How stale a connection has to be before a page render bothers re-syncing.
const STALE_MINUTES = 10;

type SyncItem = {
  source: "WORKOUT" | "EVENT";
  sourceId: string;
  date: Date;
  startMinute: number | null;
  endMinute: number | null;
  summary: string;
  description: string;
  href: string;
};

function windowFor(full: boolean): { start: Date; end: Date } {
  const today = new Date();
  return full
    ? { start: addDays(today, -FULL_BACK_DAYS), end: addDays(today, FULL_FORWARD_DAYS) }
    : { start: addDays(today, -BACK_DAYS), end: addDays(today, FORWARD_DAYS) };
}

// What this user's calendar should contain, read entirely from our own
// database. Trainers see everything they've programmed or booked; clients see
// what's theirs. A trainer who is also somebody's client would get both, which
// is right — but the role split in this app means that doesn't happen today.
async function snapshot(
  userId: string,
  isTrainer: boolean,
  origin: string,
  start: Date,
  end: Date,
): Promise<SyncItem[]> {
  const base = appUrl(origin);

  const [workouts, events] = await Promise.all([
    prisma.workout.findMany({
      where: isTrainer
        ? { trainerId: userId, scheduledDate: { gte: start, lt: end } }
        : { clientId: userId, scheduledDate: { gte: start, lt: end } },
      select: {
        id: true,
        title: true,
        notes: true,
        scheduledDate: true,
        startMinute: true,
        status: true,
        client: { select: { name: true } },
      },
    }),
    prisma.calendarEvent.findMany({
      where: isTrainer
        ? { trainerId: userId, date: { gte: start, lt: end } }
        : { clientId: userId, date: { gte: start, lt: end } },
      select: {
        id: true,
        title: true,
        notes: true,
        date: true,
        startMinute: true,
        endMinute: true,
      },
    }),
  ]);

  const items: SyncItem[] = [];

  for (const w of workouts) {
    const done = w.status === WORKOUT_STATUS.COMPLETED;
    items.push({
      source: "WORKOUT",
      sourceId: w.id,
      date: w.scheduledDate,
      startMinute: w.startMinute,
      endMinute: null,
      // On a coach's calendar a bare title is useless — six clients can all
      // have "Upper Body A" on the same Tuesday. On the athlete's own calendar
      // their name on every row is noise.
      summary: [
        done ? "✓" : null,
        w.title,
        isTrainer && w.client?.name ? `· ${w.client.name}` : null,
      ]
        .filter(Boolean)
        .join(" "),
      description: w.notes ?? "",
      href: `${base}${isTrainer ? "/workouts" : "/my/workouts"}/${w.id}`,
    });
  }

  for (const e of events) {
    items.push({
      source: "EVENT",
      sourceId: e.id,
      date: e.date,
      startMinute: e.startMinute,
      endMinute: e.endMinute,
      summary: e.title,
      // The coach's own notes, and only ever on the coach's own calendar. The
      // client calendar page withholds these for the same reason.
      description: isTrainer ? (e.notes ?? "") : "",
      href: `${base}${isTrainer ? `/calendar/${toDateInput(e.date)}` : "/my/calendar"}`,
    });
  }

  return items;
}

function buildEvent(
  item: SyncItem,
  id: string,
  timeZone: string,
): GoogleEvent {
  const { start, end } = toGoogleTimes(
    item.date,
    item.startMinute,
    item.endMinute,
    timeZone,
  );
  return {
    id,
    summary: item.summary,
    description: [item.description, item.href].filter(Boolean).join("\n\n"),
    start,
    end,
    source: { title: "Chalkline", url: item.href },
    // Queryable via privateExtendedProperty on events.list, which is the way
    // back if the mapping table is ever lost.
    extendedProperties: {
      private: { chalklineSource: item.source, chalklineId: item.sourceId },
    },
    reminders: { useDefault: true },
  };
}

// What we compare against the last push. Includes the zone and the calendar,
// so moving either forces a re-push rather than leaving stale times behind.
async function payloadHash(
  item: SyncItem,
  timeZone: string,
  calendarId: string,
): Promise<string> {
  return sha256Hex(
    JSON.stringify([
      PAYLOAD_VERSION,
      calendarId,
      timeZone,
      item.summary,
      item.description,
      item.href,
      toDateInput(item.date),
      item.startMinute,
      item.endMinute,
    ]),
  );
}

export type SyncOptions = { full?: boolean; origin?: string };

async function syncGoogleCalendar(
  userId: string,
  options: SyncOptions = {},
): Promise<void> {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
    include: { user: { select: { role: true, timeZone: true } } },
  });

  // The cheap exit, and the reason calling this speculatively after every
  // mutation costs nothing: one indexed lookup and we're done for the ~all of
  // users who have never connected anything.
  if (!connection || connection.status !== "ACTIVE" || !connection.calendarId) {
    return;
  }

  const timeZone = zoneFor(connection.user);
  const calendarId = connection.calendarId;
  const isTrainer = connection.user.role === "TRAINER";
  const { start, end } = windowFor(options.full ?? false);

  const items = await snapshot(
    userId,
    isTrainer,
    options.origin ?? "",
    start,
    end,
  );
  const mapped = await prisma.googleCalendarItem.findMany({
    where: { connectionId: connection.id, date: { gte: start, lt: end } },
  });

  const mappedByKey = new Map(mapped.map((m) => [`${m.source}:${m.sourceId}`, m]));
  const seen = new Set<string>();

  type Job =
    | { kind: "upsert"; item: SyncItem; hash: string; existing: boolean }
    | { kind: "delete"; googleEventId: string; mappingId: string };

  const jobs: Job[] = [];

  for (const item of items) {
    const key = `${item.source}:${item.sourceId}`;
    seen.add(key);
    const hash = await payloadHash(item, timeZone, calendarId);
    const existing = mappedByKey.get(key);
    // The common case by a wide margin: nothing changed, so nothing is pushed
    // and no access token is even fetched.
    if (existing && existing.hash === hash) continue;
    jobs.push({ kind: "upsert", item, hash, existing: Boolean(existing) });
  }

  for (const [key, m] of mappedByKey) {
    if (seen.has(key)) continue;
    // Deleted locally, or moved out of the window. The date column on the
    // mapping row is what made this findable at all.
    jobs.push({ kind: "delete", googleEventId: m.googleEventId, mappingId: m.id });
  }

  if (jobs.length === 0) {
    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: { syncedAt: new Date() },
    });
    return;
  }

  const token = await accessTokenFor(connection);
  // Null means the connection is already marked REVOKED, or credentials are
  // gone. Either way there is nothing useful to do this pass.
  if (!token) return;

  let lastError: string | null = null;

  for (const job of jobs) {
    try {
      if (job.kind === "delete") {
        await deleteEvent(token, calendarId, job.googleEventId);
        await prisma.googleCalendarItem.delete({ where: { id: job.mappingId } });
        continue;
      }

      const { item, hash } = job;
      const eventId = await googleEventId(item.source, item.sourceId);
      const payload = buildEvent(item, eventId, timeZone);

      if (job.existing) {
        await patchEvent(token, calendarId, eventId, payload);
      } else {
        try {
          await insertEvent(token, calendarId, payload);
        } catch (err) {
          // Our id is deterministic, so a 409 means the event is already there:
          // a concurrent pass, or one we deleted the mapping for. Patching it
          // is the correct outcome either way.
          if (err instanceof GoogleApiError && err.isConflict) {
            await patchEvent(token, calendarId, eventId, payload);
          } else {
            throw err;
          }
        }
      }

      // Written after each item rather than batched at the end: a serverless
      // invocation that dies part-way through a 300-event backfill leaves the
      // completed half durably recorded, and the next pass resumes instead of
      // starting over.
      await prisma.googleCalendarItem.upsert({
        where: {
          connectionId_source_sourceId: {
            connectionId: connection.id,
            source: item.source,
            sourceId: item.sourceId,
          },
        },
        create: {
          connectionId: connection.id,
          source: item.source,
          sourceId: item.sourceId,
          googleEventId: eventId,
          date: item.date,
          hash,
        },
        update: { googleEventId: eventId, date: item.date, hash, syncedAt: new Date() },
      });
    } catch (err) {
      if (err instanceof GoogleApiError) {
        if (err.isAuthError) {
          await markRevoked(connection.id, "Google revoked access.");
          return;
        }
        if (err.isMissing) {
          // They deleted it in Google. Drop our mapping; if it still exists
          // locally the next pass re-inserts it, and if it doesn't, good.
          if (job.kind === "delete") {
            await prisma.googleCalendarItem.delete({
              where: { id: job.mappingId },
            });
          } else {
            await prisma.googleCalendarItem
              .delete({
                where: {
                  connectionId_source_sourceId: {
                    connectionId: connection.id,
                    source: job.item.source,
                    sourceId: job.item.sourceId,
                  },
                },
              })
              .catch(() => {});
          }
          continue;
        }
      }
      // Anything else: note it, leave the mapping alone, keep going. One bad
      // event must not stop the other two hundred.
      lastError = err instanceof Error ? err.message : String(err);
      console.error("Google Calendar sync item failed", err);
    }
  }

  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: { syncedAt: new Date(), lastError },
  });
}

// The variant every caller uses. See the module comment: this never throws.
export async function syncGoogleCalendarSafely(
  userId: string,
  options: SyncOptions = {},
): Promise<void> {
  try {
    await syncGoogleCalendar(userId, options);
  } catch (err) {
    console.error("Google Calendar sync failed", err);
  }
}

// Most mutations touch two calendars — a session belongs to the coach who wrote
// it and the athlete it's for — and the ids are frequently the same or null, so
// they're de-duplicated here rather than at each call site.
export async function syncGoogleCalendarsSafely(
  ...userIds: (string | null | undefined)[]
): Promise<void> {
  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  for (const id of unique) {
    await syncGoogleCalendarSafely(id);
  }
}

// The safety net, called from the two calendar page renders. This is what
// catches every path nobody remembered to hook — bulk program assignment, a
// direct database edit, an event whose client changed while a push was failing.
export async function syncIfStale(userId: string): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000);
    // The where-guard is the throttle *and* the lock: two concurrent renders
    // race on this update and exactly one wins, so only one of them syncs.
    const claimed = await prisma.googleCalendarConnection.updateMany({
      where: {
        userId,
        status: "ACTIVE",
        OR: [{ syncedAt: null }, { syncedAt: { lt: cutoff } }],
      },
      data: { syncedAt: new Date() },
    });
    if (claimed.count === 0) return;
    await syncGoogleCalendarSafely(userId);
  } catch (err) {
    console.error("Google Calendar stale check failed", err);
  }
}

// Sugar for the server actions, so a mutation adds one line rather than an
// import of `after` and a de-duplication dance.
export function syncAfterMutation(
  ...userIds: (string | null | undefined)[]
): void {
  after(() => syncGoogleCalendarsSafely(...userIds));
}

// Everything the connect card needs, in one query. Kept here rather than in the
// component so the pages stay the only place that touches the database.
export async function googleCalendarState(user: {
  id: string;
  timeZone: string | null;
}): Promise<GoogleCalendarState> {
  if (!googleConfig()) return { kind: "unconfigured" };

  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId: user.id },
    select: { email: true, status: true, syncedAt: true, calendarId: true },
  });

  if (!connection) return { kind: "disconnected", timeZone: zoneFor(user) };
  if (connection.status !== "ACTIVE") {
    return { kind: "revoked", email: connection.email };
  }
  // An active grant with nothing to write to: createCalendar failed after the
  // tokens were saved. Called out rather than folded into "connected", because
  // every sync takes the cheap exit above on a null calendarId — so this row
  // syncs nothing, forever, while the card claims to be healthy and hides the
  // only button that could repair it.
  if (!connection.calendarId) {
    return {
      kind: "incomplete",
      email: connection.email,
      timeZone: zoneFor(user),
    };
  }
  return {
    kind: "connected",
    email: connection.email,
    timeZone: zoneFor(user),
    syncedAt: connection.syncedAt,
  };
}
