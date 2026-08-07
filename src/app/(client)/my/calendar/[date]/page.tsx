import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, Card, Container, PageHeading } from "@/components/ui";
import {
  CLIENT_LINKS,
  compareItems,
  eventItem,
  formatMonthLabel,
  formatTime,
  monthKey,
  parseDayParam,
  workoutItem,
} from "@/lib/calendar";
import { EVENT_KIND_LABELS } from "@/lib/constants";
import { addDays, formatDateLong, toDateInput } from "@/lib/format";

// The read-only counterpart to the trainer's day page. No event form, no edit
// links, no delete — an athlete's day is something to look at, not operate on.
export default async function MyCalendarDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const client = await requireClient();

  const day = parseDayParam(date);
  if (!day) notFound();
  const next = addDays(day, 1);

  const [workouts, events] = await Promise.all([
    prisma.workout.findMany({
      where: { clientId: client.id, scheduledDate: { gte: day, lt: next } },
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
      where: { clientId: client.id, date: { gte: day, lt: next } },
      include: { client: { select: { id: true, name: true } } },
    }),
  ]);

  // CalendarEvent.notes is deliberately not read here, and this is not an
  // oversight to be tidied up later. Those are the coach's own notes on a
  // consult or a check-in, written with no reader in mind — the trainer's day
  // page is the right place for them and the only place they belong.
  const items = [
    ...workouts.map((w) => workoutItem(w, CLIENT_LINKS)),
    ...events.map((e) => eventItem(e, CLIENT_LINKS)),
  ].sort(compareItems);

  return (
    <Container className="max-w-3xl">
      <Link
        href={`/my/calendar?m=${monthKey(day)}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {formatMonthLabel(day)}
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow="Schedule"
          title={formatDateLong(day)}
          action={
            <div className="metric flex items-center gap-3 text-xs text-ink-soft">
              <Link
                href={`/my/calendar/${toDateInput(addDays(day, -1))}`}
                className="hover:text-ink"
              >
                ‹ Prev
              </Link>
              <Link
                href={`/my/calendar/${toDateInput(next)}`}
                className="hover:text-ink"
              >
                Next ›
              </Link>
            </div>
          }
        >
          <span className="metric">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </PageHeading>
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        {items.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing scheduled this day.</p>
        ) : (
          items.map((item) => (
            <Card
              key={`${item.source}-${item.id}`}
              className="flex items-start gap-3 p-4"
            >
              <span
                aria-hidden
                className={
                  item.source === "workout"
                    ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-jade"
                    : "mt-1.5 h-2 w-2 shrink-0 rounded-full border border-line"
                }
              />
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-ink-soft/70">
                  {item.source === "workout"
                    ? "Workout"
                    : EVENT_KIND_LABELS[item.kind ?? "SESSION"]}
                </p>
                <p className="mt-0.5 font-medium text-ink">
                  {/* Only a workout goes anywhere — it's the one thing on this
                      page there's something to *do* with. */}
                  {item.source === "workout" ? (
                    <Link href={item.href} className="hover:text-jade-strong">
                      {item.title}
                    </Link>
                  ) : (
                    item.title
                  )}
                </p>
                <p className="metric mt-1 text-xs text-ink-soft">
                  {item.startMinute == null
                    ? "All day"
                    : item.endMinute == null
                      ? formatTime(item.startMinute)
                      : `${formatTime(item.startMinute)} – ${formatTime(item.endMinute)}`}
                </p>
              </div>

              {item.completed ? <Badge tone="jade">Done</Badge> : null}
            </Card>
          ))
        )}
      </div>
    </Container>
  );
}
