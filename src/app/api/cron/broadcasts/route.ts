// Scheduled messages, driven by the same hourly tick as the digest.
//
// A route handler rather than a server action for the reason the digest route
// spells out: an action is the page asking the server a question, and a handler
// exists when something *outside* the app has to reach a URL. Both are pinged
// by .github/workflows/digest.yml, and both authenticate with the same bearer
// secret through authorizeCron.
//
// The shape below is deliberately the digest's, statement for statement: check
// the hour in the trainer's own zone, claim the day through a unique index,
// then send. What differs is only what gets sent, and that a broadcast writes
// real Message rows before it emails anything — an athlete can reply to one of
// these, which is the whole reason it isn't a mailshot.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma, isUniqueViolation } from "@/lib/db";
import { authorizeCron } from "@/lib/cron-auth";
import {
  findOrCreateDirectThread,
  postMessage,
  sendBroadcastEmailSafely,
} from "@/lib/messaging";
import { localDay, localHour, localWeekday, zoneFor } from "@/lib/time-zone";
import { appUrl } from "@/lib/app-url";
import { BROADCAST_AUDIENCES, ROLES, toBroadcastAudience } from "@/lib/constants";

// Without this a GET that touches no request API can be evaluated at build
// time and served static — the schedule would "run" once, during the build.
export const dynamic = "force-dynamic";
// A coach with a full roster is one thread lookup and one email per athlete.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = await authorizeCron(req);
  if (!auth.ok) {
    if (auth.reason === "unconfigured") {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const origin = appUrl(req.nextUrl.origin);

  const broadcasts = await prisma.broadcast.findMany({
    where: { active: true },
    include: {
      trainer: {
        select: { id: true, name: true, email: true, timeZone: true },
      },
      recipients: { select: { clientId: true } },
    },
  });

  let claimed = 0;
  let sent = 0;
  let skipped = 0;

  for (const broadcast of broadcasts) {
    const zone = zoneFor(broadcast.trainer);

    if (!broadcast.weekdays.includes(localWeekday(now, zone))) {
      skipped += 1;
      continue;
    }
    // `>=`, not `===`, for the reason the digest route gives: GitHub's
    // scheduled runs routinely slip five to twenty minutes, and an exact hour
    // match would silently drop a day's message whenever the runner was busy.
    // The claim below is what makes the looser comparison safe.
    if (localHour(now, zone) < broadcast.hour) {
      skipped += 1;
      continue;
    }

    const day = localDay(now, zone);

    // Claim, then send. The unique index on (broadcastId, day) is the mutex:
    // create() either wins the day or throws P2002. Without it, a scheduler
    // that retries sends the same motivational message twice.
    let runId: string;
    try {
      const run = await prisma.broadcastRun.create({
        data: { broadcastId: broadcast.id, day },
      });
      runId = run.id;
      claimed += 1;
    } catch (err) {
      if (isUniqueViolation(err)) {
        skipped += 1;
        continue;
      }
      throw err;
    }

    // ALL is resolved here rather than expanded into recipient rows when the
    // broadcast was saved, which is what makes "everyone" keep meaning
    // everyone as the roster changes. PICKED still goes through trainerId, so
    // a client who left the roster stops receiving it.
    const audience = toBroadcastAudience(broadcast.audience);
    const clients = await prisma.user.findMany({
      where: {
        trainerId: broadcast.trainerId,
        role: ROLES.CLIENT,
        ...(audience === BROADCAST_AUDIENCES.PICKED
          ? { id: { in: broadcast.recipients.map((r) => r.clientId) } }
          : {}),
      },
      select: { id: true, name: true, email: true, role: true },
    });

    let delivered = 0;
    for (const client of clients) {
      const thread = await findOrCreateDirectThread(
        broadcast.trainerId,
        client.id,
      );
      const message = await postMessage({
        threadId: thread.id,
        senderId: broadcast.trainerId,
        body: broadcast.body,
      });
      delivered += 1;

      if (broadcast.alsoEmail) {
        // Awaited, not in after(): after() belongs to a request whose response
        // this loop is still building, and the run row below has to record
        // what actually happened. Its own failures are caught internally, so
        // one bad address can't abandon the rest of the roster.
        await sendBroadcastEmailSafely(
          origin,
          {
            id: message.id,
            threadId: thread.id,
            body: broadcast.body,
            coachName: broadcast.trainer.name,
            coachEmail: broadcast.trainer.email,
          },
          client,
        );
      }
    }

    // ok is about the *messages*, which are written and cannot fail silently —
    // unlike the digest, where ok tracks a single email. A day with no
    // recipients is a real, successful, empty send: the claim stands so this
    // broadcast isn't reconsidered every hour until midnight.
    await prisma.broadcastRun.update({
      where: { id: runId },
      data: { sentAt: now, ok: true, sent: delivered },
    });
    sent += delivered;
  }

  // Counts only. Anyone holding the secret can read this, including whoever
  // can see a CI log, so no names and no addresses.
  return NextResponse.json({
    checked: broadcasts.length,
    claimed,
    sent,
    skipped,
  });
}

// Both verbs, so any scheduler works: GitHub Actions posts, Vercel Cron gets.
export const POST = GET;
