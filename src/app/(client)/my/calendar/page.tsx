import Link from "next/link";
import { after } from "next/server";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading } from "@/components/ui";
import { GoogleCalendarCard } from "@/components/GoogleCalendarCard";
import { googleCalendarState, syncIfStale } from "@/lib/calendar-sync";
import {
  CLIENT_LINKS,
  eventItem,
  formatMonthLabel,
  formatTime,
  gridRange,
  groupByDay,
  isToday,
  monthGrid,
  monthKey,
  parseMonthKey,
  shiftMonth,
  startOfMonth,
  workoutItem,
  type CalendarItem,
} from "@/lib/calendar";
import { toDateInput } from "@/lib/format";
import { cn } from "@/lib/cn";

// The athlete's half of the trainer calendar: the same month maths, the same
// merged CalendarItem, the same two layouts. What differs is scope and intent —
// this shows only what's theirs, and it is entirely read-only. Nothing here
// creates, edits or deletes; programming is the coach's job.

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

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
  const grid = monthGrid(monthStart);
  const { start, end } = gridRange(grid);

  const [workouts, events] = await Promise.all([
    prisma.workout.findMany({
      where: { clientId: client.id, scheduledDate: { gte: start, lt: end } },
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        startMinute: true,
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

  const month = monthStart.getMonth();
  const inMonthCount = grid.reduce(
    (n, d) =>
      d.getMonth() === month ? n + (byDay.get(toDateInput(d))?.length ?? 0) : n,
    0,
  );

  const agenda = grid
    .filter((d) => d.getMonth() === month)
    .map((day) => ({ day, items: byDay.get(toDateInput(day)) ?? [] }))
    .filter(({ items }) => items.length > 0);

  return (
    <Container>
      <PageHeading eyebrow="Calendar" title={formatMonthLabel(monthStart)}>
        Your sessions and everything your coach has booked with you.
      </PageHeading>

      <GoogleCalendarCard state={gcal} notice={google} />

      {/* No "New event" button beside the month stepper — the trainer's version
          has one and this deliberately doesn't, so the row is just the stepper. */}
      <div className="mt-5">
        <div className="metric inline-flex items-center overflow-hidden rounded-[var(--radius-sm)] border border-line text-xs text-ink-soft">
          <Link
            href={`/my/calendar?m=${monthKey(shiftMonth(monthStart, -1))}`}
            aria-label="Previous month"
            className="grid h-10 w-11 place-items-center transition-colors hover:bg-card hover:text-ink sm:h-8"
          >
            ‹
          </Link>
          <Link
            href="/my/calendar"
            className="grid h-10 place-items-center border-x border-line px-4 transition-colors hover:bg-card hover:text-ink sm:h-8"
          >
            Today
          </Link>
          <Link
            href={`/my/calendar?m=${monthKey(shiftMonth(monthStart, 1))}`}
            aria-label="Next month"
            className="grid h-10 w-11 place-items-center transition-colors hover:bg-card hover:text-ink sm:h-8"
          >
            ›
          </Link>
        </div>
      </div>

      {/* Agenda on phones, month grid from sm: — same reasoning as the trainer
          calendar, and if anything more so here: this is the view most likely
          to be opened one-handed in a gym. */}
      <ol className="mt-3 flex flex-col gap-2 sm:hidden">
        {agenda.map(({ day, items }) => {
          const key = toDateInput(day);
          const today = isToday(day);
          return (
            <li key={key}>
              <Link
                href={`/my/calendar/${key}`}
                className={cn(
                  "flex gap-3.5 rounded-[var(--radius-card)] border bg-card p-3 transition-colors active:bg-jade-wash/40",
                  today ? "border-jade" : "border-line",
                )}
              >
                <span
                  className={cn(
                    "metric flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)] leading-none",
                    today
                      ? "bg-jade text-white"
                      : "border border-line bg-paper text-ink",
                  )}
                >
                  <span className="text-[0.5625rem] uppercase tracking-[0.14em] opacity-70">
                    {WEEKDAYS[(day.getDay() + 6) % 7]}
                  </span>
                  <span className="mt-1 text-base font-semibold">
                    {day.getDate()}
                  </span>
                </span>

                <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                  {items.map((item) => (
                    <Chip key={`${item.source}-${item.id}`} item={item} />
                  ))}
                </span>

                <span className="self-center text-ink-soft">›</span>
              </Link>
            </li>
          );
        })}

        {agenda.length === 0 ? (
          <li className="rounded-[var(--radius-card)] border border-line bg-card px-4 py-10 text-center">
            <p className="text-sm text-ink-soft">
              Nothing scheduled in {formatMonthLabel(monthStart)}.
            </p>
          </li>
        ) : null}
      </ol>

      <div className="mt-3 hidden grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-card px-2 py-1.5">
            <span className="eyebrow text-ink-soft/70">{d}</span>
          </div>
        ))}

        {grid.map((day) => {
          const key = toDateInput(day);
          const items = byDay.get(key) ?? [];
          const outside = day.getMonth() !== month;
          const today = isToday(day);

          return (
            <Link
              key={key}
              href={`/my/calendar/${key}`}
              className={cn(
                "flex min-h-28 flex-col gap-1 p-1.5 transition-colors",
                outside ? "bg-paper" : "bg-card",
                today ? "ring-1 ring-inset ring-jade" : "",
                "hover:bg-jade-wash/40",
              )}
            >
              <span
                className={cn(
                  "metric grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs",
                  today
                    ? "bg-jade font-medium text-white"
                    : outside
                      ? "text-ink-soft/60"
                      : "text-ink-soft",
                )}
              >
                {day.getDate()}
              </span>

              {items.slice(0, MAX_CHIPS).map((item) => (
                <Chip key={`${item.source}-${item.id}`} item={item} />
              ))}
              {items.length > MAX_CHIPS ? (
                <span className="metric px-0.5 text-[0.625rem] text-ink-soft/70">
                  +{items.length - MAX_CHIPS} more
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {inMonthCount === 0 ? (
        <p className="mt-4 hidden text-sm text-ink-soft sm:block">
          Nothing scheduled in {formatMonthLabel(monthStart)}.
        </p>
      ) : null}
    </Container>
  );
}

// The trainer's chip with the client name left out — on your own calendar
// that's your own name on every row.
function Chip({ item }: { item: CalendarItem }) {
  return (
    <span className="flex items-center gap-1 rounded-[4px] px-0.5 text-[0.6875rem] leading-tight">
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          item.source === "workout" ? "bg-jade" : "border border-line",
        )}
      />
      {item.startMinute != null ? (
        <span className="metric shrink-0 text-[0.625rem] text-ink-soft">
          {formatTime(item.startMinute)}
        </span>
      ) : null}
      <span
        className={cn(
          "min-w-0 truncate",
          item.completed ? "text-ink-soft line-through" : "text-ink",
        )}
      >
        {item.title}
      </span>
    </span>
  );
}
