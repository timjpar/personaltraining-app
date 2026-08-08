// The daily digest, driven by a scheduler rather than a visitor.
//
// A route handler and not a server action, which is the line the rest of the
// app draws: an action is the page asking the server a question, and a handler
// exists when something *outside* the app has to reach a URL. A cron is exactly
// that, and it arrives with no cookies, so it authenticates with a bearer
// secret instead of a session.
//
// src/proxy.ts needs no entry for this — its matcher already excludes /api, the
// same reason api/calendar/google/route.ts notes that nothing has checked a
// session before its first line.
//
// Scheduler-agnostic on purpose. Vercel's Hobby plan refuses any cron more
// frequent than daily, so this is driven from .github/workflows/digest.yml;
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically, so
// moving to a vercel.json entry on a paid plan is a config change and no code
// change at all.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db";
import { buildDigest, sendDigest } from "@/lib/digest";
import { localDay, localHour, zoneFor } from "@/lib/time-zone";
import { sha256Hex } from "@/lib/random";
import { appUrl } from "@/lib/app-url";
import { ROLES } from "@/lib/constants";

// A GET handler that touches no request API can be evaluated at build time and
// served as a static response — which would mean the digest "ran" once, during
// the build, and never again.
export const dynamic = "force-dynamic";
// Sending to every trainer whose hour has come can outlast the default.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;

  // 404 rather than 401 when the secret isn't configured. Direct precedent:
  // /admin is a 404 for everyone when ADMIN_EMAILS is blank, because an
  // endpoint nobody has switched on shouldn't announce that it exists.
  if (!expected) return new NextResponse(null, { status: 404 });

  const header = req.headers.get("authorization") ?? "";
  const provided = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : (req.headers.get("x-cron-secret") ?? "");

  // Compared as digests, not with ===. Both sides become fixed-length hex, so
  // the comparison's timing says nothing about how much of the secret matched
  // or how long it is. sha256Hex is Web Crypto, so this stays runtime-agnostic
  // rather than being the first node:crypto import in the app.
  if ((await sha256Hex(provided)) !== (await sha256Hex(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const origin = appUrl(req.nextUrl.origin);

  const trainers = await prisma.user.findMany({
    where: { role: ROLES.TRAINER, digestHour: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      timeZone: true,
      digestHour: true,
    },
  });

  let claimed = 0;
  let sent = 0;
  let skipped = 0;

  for (const trainer of trainers) {
    const zone = zoneFor(trainer);
    const hour = localHour(now, zone);
    const day = localDay(now, zone);

    // `>=`, not `===`. GitHub's scheduled runs are best-effort and routinely
    // slip five to twenty minutes; an exact hour match would silently drop a
    // day's digest whenever the runner was busy. The claim below is what makes
    // the looser comparison safe — it can still only fire once per day.
    if (trainer.digestHour == null || hour < trainer.digestHour) {
      skipped += 1;
      continue;
    }

    // Claim, then send. The unique index on (trainerId, day) is the mutex:
    // create() either wins the day or throws P2002, which isUniqueViolation()
    // already exists to recognise. No read-then-write window for a retry or a
    // second scheduler to slip through.
    let runId: string;
    try {
      const run = await prisma.digestRun.create({
        data: { trainerId: trainer.id, day },
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

    // Everything since the last digest that actually went out, so a day the
    // send failed is picked up by the next one rather than lost.
    const previous = await prisma.digestRun.findFirst({
      where: { trainerId: trainer.id, ok: true, sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    });
    const since = previous?.sentAt ?? new Date(now.getTime() - 86_400_000);

    const data = await buildDigest(trainer.id, since);
    if (!data) {
      // Nothing happened. The claim still stands so we don't reconsider this
      // trainer every hour until midnight.
      await prisma.digestRun.update({
        where: { id: runId },
        data: { sentAt: now, ok: true },
      });
      continue;
    }

    const ok = await sendDigest(origin, trainer, data);
    await prisma.digestRun.update({
      where: { id: runId },
      data: {
        sentAt: ok ? now : null,
        ok,
        workouts: data.workouts.length,
        logs: data.logs.length,
      },
    });

    if (ok) sent += 1;
    else {
      // The day is burned: the claim is already written and won't be retried.
      // That's the deliberate trade — a missed digest beats a duplicate one,
      // and ok:false is what makes the miss visible rather than silent.
      console.error("Digest send failed", trainer.id, day);
    }
  }

  // Counts only. Anyone holding the secret can read this response, including
  // whoever can see a CI log, so no names and no addresses.
  return NextResponse.json({
    checked: trainers.length,
    claimed,
    sent,
    skipped,
  });
}

// Both verbs, so any scheduler works: GitHub Actions posts, Vercel Cron gets.
export const POST = GET;
