import { after } from "next/server";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ButtonLink, Container, PageHeading } from "@/components/ui";
import { GoogleCalendarCard } from "@/components/GoogleCalendarCard";
import { MonthCalendar } from "@/components/MonthCalendar";
import { googleCalendarState, syncIfStale } from "@/lib/calendar-sync";
import {
  eventItem,
  formatMonthLabel,
  gridRange,
  groupByDay,
  monthGrid,
  parseMonthKey,
  startOfMonth,
  workoutItem,
  TRAINER_LINKS,
} from "@/lib/calendar";
import { toDateInput } from "@/lib/format";
import { ATTENDANCE } from "@/lib/constants";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; google?: string }>;
}) {
  const { m, google } = await searchParams;
  const trainer = await requireTrainer();

  const gcal = await googleCalendarState(trainer);

  // The safety net for every path that doesn't push on its own — bulk program
  // assignment, a direct database edit, a push that failed while Google was
  // down. Throttled inside syncIfStale, so opening the calendar twice in a
  // minute doesn't sync twice.
  //
  // The id is read out here, before the callback: a Server Component may not
  // call cookies() or headers() inside an after() callback.
  const trainerId = trainer.id;
  after(() => syncIfStale(trainerId));

  const monthStart = parseMonthKey(m) ?? startOfMonth(new Date());
  // The whole visible grid, not the month — the leading and trailing cells
  // belong to the neighbouring months and would otherwise come back empty.
  const { start, end } = gridRange(monthGrid(monthStart));

  const [workouts, events] = await Promise.all([
    // Only the sessions this coach is actually in the room for. A program
    // assigned to twelve athletes is twelve commitments, but it is none of the
    // coach's hours, and a calendar carrying both answers neither "what am I
    // doing today" nor "what did I set". The athlete's own calendar is where
    // every session shows up regardless — see /my/calendar, which does not
    // filter — and a client's whole schedule is on their client page.
    prisma.workout.findMany({
      where: {
        trainerId: trainer.id,
        attendance: ATTENDANCE.IN_PERSON,
        scheduledDate: { gte: start, lt: end },
      },
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
    prisma.calendarEvent.findMany({
      where: { trainerId: trainer.id, date: { gte: start, lt: end } },
      include: { client: { select: { id: true, name: true } } },
    }),
  ]);

  const byDay = groupByDay([
    ...workouts.map((w) => workoutItem(w, TRAINER_LINKS)),
    ...events.map((e) => eventItem(e, TRAINER_LINKS)),
  ]);

  return (
    <Container>
      <PageHeading eyebrow="Calendar" title={formatMonthLabel(monthStart)}>
        The sessions you&rsquo;re coaching in person, plus everything else on
        your week.
      </PageHeading>

      <GoogleCalendarCard state={gcal} notice={google} />

      <div className="mt-5">
        <MonthCalendar
          monthStart={monthStart}
          byDay={byDay}
          monthHref={(key) => `/calendar?m=${key}`}
          todayHref="/calendar"
          dayHref={(key) => `/calendar/${key}`}
          action={
            <ButtonLink href={`/calendar/${toDateInput(new Date())}`} size="sm">
              New event
            </ButtonLink>
          }
          emptyAction={
            <ButtonLink
              href={`/calendar/${toDateInput(new Date())}`}
              size="sm"
              variant="outline"
            >
              Add an event
            </ButtonLink>
          }
        />
      </div>
    </Container>
  );
}
