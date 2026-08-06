import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ButtonLink, Container, PageHeading } from "@/components/ui";
import {
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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Chips per cell. Fixed at every breakpoint on purpose: a count that changed
// with the viewport would make the "+N more" label wrong at one of them.
const MAX_CHIPS = 3;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const trainer = await requireTrainer();

  const monthStart = parseMonthKey(m) ?? startOfMonth(new Date());
  const grid = monthGrid(monthStart);
  // The whole visible grid, not the month — the leading and trailing cells
  // belong to the neighbouring months and would otherwise come back empty.
  const { start, end } = gridRange(grid);

  const [workouts, events] = await Promise.all([
    prisma.workout.findMany({
      where: { trainerId: trainer.id, scheduledDate: { gte: start, lt: end } },
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        startMinute: true,
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
    ...workouts.map(workoutItem),
    ...events.map(eventItem),
  ]);

  const month = monthStart.getMonth();
  const inMonthCount = grid.reduce(
    (n, d) =>
      d.getMonth() === month ? n + (byDay.get(toDateInput(d))?.length ?? 0) : n,
    0,
  );

  // Days of *this* month that have something on them, in order. The grid's
  // leading and trailing cells belong to the neighbouring months, so they are
  // dropped here — on the grid they give the weeks their shape, but in a list
  // they would just be someone else's appointments.
  const agenda = grid
    .filter((d) => d.getMonth() === month)
    .map((day) => ({ day, items: byDay.get(toDateInput(day)) ?? [] }))
    .filter(({ items }) => items.length > 0);

  return (
    <Container>
      <PageHeading eyebrow="Calendar" title={formatMonthLabel(monthStart)}>
        Workouts you&rsquo;ve programmed, plus everything else on your week.
      </PageHeading>

      {/* Month stepping and "new event" belong on one row — they are both
          "operate on the month you're looking at", and stacking them cost a
          third of the screen above the first date on a phone.

          Segmented control rather than three bare words: at 16px tall those
          were the smallest targets on the page, and stepping months is the
          thing you do repeatedly here. */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="metric inline-flex items-center overflow-hidden rounded-[var(--radius-sm)] border border-line text-xs text-ink-soft">
          <Link
            href={`/calendar?m=${monthKey(shiftMonth(monthStart, -1))}`}
            aria-label="Previous month"
            className="grid h-10 w-11 place-items-center transition-colors hover:bg-card hover:text-ink sm:h-8"
          >
            ‹
          </Link>
          <Link
            href="/calendar"
            className="grid h-10 place-items-center border-x border-line px-4 transition-colors hover:bg-card hover:text-ink sm:h-8"
          >
            Today
          </Link>
          <Link
            href={`/calendar?m=${monthKey(shiftMonth(monthStart, 1))}`}
            aria-label="Next month"
            className="grid h-10 w-11 place-items-center transition-colors hover:bg-card hover:text-ink sm:h-8"
          >
            ›
          </Link>
        </div>

        <ButtonLink href={`/calendar/${toDateInput(new Date())}`} size="sm">
          New event
        </ButtonLink>
      </div>

      {/* ---- Agenda (phones) -------------------------------------------------
          A 7-column month grid at 375px gives each day about 47px, which
          truncated every title to a letter and an ellipsis ("Fu…", "G…") while
          padding four empty weeks down the screen. A month grid answers "what
          shape is my month"; on a phone the question is "what's next", so the
          phone gets the days that actually have something on them. */}
      <ol className="mt-3 flex flex-col gap-2 sm:hidden">
        {agenda.map(({ day, items }) => {
          const key = toDateInput(day);
          const today = isToday(day);
          return (
            <li key={key}>
              <Link
                href={`/calendar/${key}`}
                className={cn(
                  "flex gap-3.5 rounded-[var(--radius-card)] border bg-card p-3 transition-colors active:bg-jade-wash/40",
                  today ? "border-jade" : "border-line",
                )}
              >
                {/* Date block, mono — the same tabular treatment the
                    prescription numbers get. */}
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
            <ButtonLink
              href={`/calendar/${toDateInput(new Date())}`}
              size="sm"
              variant="outline"
              className="mt-4"
            >
              Add an event
            </ButtonLink>
          </li>
        ) : null}
      </ol>

      {/* gap-px over a line-coloured container draws the hairline separators,
          so no cell needs a border of its own and nothing doubles up. */}
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
              href={`/calendar/${key}`}
              // One link for the whole cell: chips can't be links inside a
              // link, the touch target is bigger this way, and the per-item
              // detail belongs on the day page anyway.
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

      {/* The agenda carries its own empty state, so this is the grid's. */}
      {inMonthCount === 0 ? (
        <p className="mt-4 hidden text-sm text-ink-soft sm:block">
          Nothing scheduled in {formatMonthLabel(monthStart)}.
        </p>
      ) : null}
    </Container>
  );
}

function Chip({ item }: { item: CalendarItem }) {
  return (
    <span className="flex items-center gap-1 rounded-[4px] px-0.5 text-[0.6875rem] leading-tight">
      {/* Filled dot = a programmed workout, hollow = everything else. Kind
          never gets its own colour: the accent tokens change meaning with the
          trainer's theme, and amber is spoken for by effort. */}
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
