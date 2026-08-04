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

  return (
    <Container>
      <PageHeading
        eyebrow="Calendar"
        title={formatMonthLabel(monthStart)}
        action={
          <ButtonLink href={`/calendar/${toDateInput(new Date())}`} size="sm">
            New event
          </ButtonLink>
        }
      >
        Workouts you&rsquo;ve programmed, plus everything else on your week.
      </PageHeading>

      <div className="metric mt-5 flex items-center gap-4 text-xs text-ink-soft">
        <Link
          href={`/calendar?m=${monthKey(shiftMonth(monthStart, -1))}`}
          className="hover:text-ink"
        >
          ‹ Prev
        </Link>
        <Link href="/calendar" className="hover:text-ink">
          Today
        </Link>
        <Link
          href={`/calendar?m=${monthKey(shiftMonth(monthStart, 1))}`}
          className="hover:text-ink"
        >
          Next ›
        </Link>
      </div>

      {/* gap-px over a line-coloured container draws the hairline separators,
          so no cell needs a border of its own and nothing doubles up. */}
      <div className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line">
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

      {inMonthCount === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
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
