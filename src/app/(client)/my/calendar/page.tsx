import { after } from "next/server";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading } from "@/components/ui";
import { GoogleCalendarCard } from "@/components/GoogleCalendarCard";
import { MonthCalendar } from "@/components/MonthCalendar";
import { googleCalendarState, syncIfStale } from "@/lib/calendar-sync";
import {
  CLIENT_LINKS,
  eventItem,
  formatMonthLabel,
  gridRange,
  groupByDay,
  monthGrid,
  parseMonthKey,
  startOfMonth,
  workoutItem,
} from "@/lib/calendar";

// The athlete's half of the trainer calendar: the same month maths, the same
// merged CalendarItem, the same component. What differs is scope and intent —
// this shows only what's theirs, and it is entirely read-only. Nothing here
// creates, edits or deletes; programming is the coach's job.
//
// Deliberately unfiltered by attendance, where the coach's calendar isn't. A
// session is on this person's plate whether or not their coach is standing next
// to them for it, so hiding half of them would hide half their training.

export default async function MyCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; google?: string }>;
}) {
  const { m, google } = await searchParams;
  const client = await requireClient();

  const gcal = await googleCalendarState(client);

  // Read out before the callback — a Server Component may not call cookies()
  // or headers() inside after().
  const clientId = client.id;
  after(() => syncIfStale(clientId));

  const monthStart = parseMonthKey(m) ?? startOfMonth(new Date());
  const { start, end } = gridRange(monthGrid(monthStart));

  const [workouts, events] = await Promise.all([
    prisma.workout.findMany({
      where: { clientId: client.id, scheduledDate: { gte: start, lt: end } },
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        startMinute: true,
        durationMinutes: true,
        attendance: true,
        status: true,
        client: { select: { id: true, name: true } },
      },
    }),
    // Scoped on clientId, which also does the excluding for us: a trainer's
    // PERSONAL entries have no clientId at all, so their own time can't leak
    // onto an athlete's calendar by anyone forgetting to filter on kind.
    prisma.calendarEvent.findMany({
      where: { clientId: client.id, date: { gte: start, lt: end } },
      include: { client: { select: { id: true, name: true } } },
    }),
  ]);

  const byDay = groupByDay([
    ...workouts.map((w) => workoutItem(w, CLIENT_LINKS)),
    ...events.map((e) => eventItem(e, CLIENT_LINKS)),
  ]);

  return (
    <Container>
      <PageHeading eyebrow="Calendar" title={formatMonthLabel(monthStart)}>
        Your sessions and everything your coach has booked with you.
      </PageHeading>

      <GoogleCalendarCard state={gcal} notice={google} />

      {/* No "New event" button beside the month stepper — the trainer's version
          passes one and this deliberately doesn't, so the row is just the
          stepper. */}
      <div className="mt-5">
        <MonthCalendar
          monthStart={monthStart}
          byDay={byDay}
          monthHref={(key) => `/my/calendar?m=${key}`}
          todayHref="/my/calendar"
          dayHref={(key) => `/my/calendar/${key}`}
          // Which sessions the coach is actually turning up to is the athlete's
          // question as much as the coach's — it's the difference between a
          // 7am appointment and a note to get it done sometime.
          showAttendance
          attendanceLegend={{
            IN_PERSON: "With your coach",
            SOLO: "On your own",
          }}
        />
      </div>
    </Container>
  );
}
