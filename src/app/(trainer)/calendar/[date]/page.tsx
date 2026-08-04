import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, Card, Container, PageHeading } from "@/components/ui";
import { DeleteWorkoutForm } from "@/components/DeleteWorkoutForm";
import { EventForm } from "@/components/EventForm";
import {
  compareItems,
  eventItem,
  formatMonthLabel,
  formatTime,
  monthKey,
  parseDayParam,
  timeInputFromMinutes,
  workoutItem,
} from "@/lib/calendar";
import { EVENT_KIND_LABELS, toEventKind } from "@/lib/constants";
import { addDays, formatDateLong, toDateInput } from "@/lib/format";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "../actions";

export default async function CalendarDayPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ date }, { edit }] = await Promise.all([params, searchParams]);
  const trainer = await requireTrainer();

  const day = parseDayParam(date);
  if (!day) notFound();
  const next = addDays(day, 1);

  const [workouts, events, clients] = await Promise.all([
    prisma.workout.findMany({
      where: {
        trainerId: trainer.id,
        scheduledDate: { gte: day, lt: next },
      },
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
      where: { trainerId: trainer.id, date: { gte: day, lt: next } },
      include: { client: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { trainerId: trainer.id, role: "CLIENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const items = [...workouts.map(workoutItem), ...events.map(eventItem)].sort(
    compareItems,
  );

  // ?edit=<id> reuses this route for the edit form rather than adding a third
  // page. An id that isn't the trainer's simply falls back to the create form.
  const editing = edit ? events.find((e) => e.id === edit) : undefined;
  const dayValue = toDateInput(day);
  // CalendarItem deliberately carries no notes — only this page shows them.
  const notesById = new Map(events.map((e) => [e.id, e.notes]));

  return (
    <Container className="max-w-3xl">
      <Link
        href={`/calendar?m=${monthKey(day)}`}
        className="metric text-xs text-ink-soft hover:text-ink"
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
                href={`/calendar/${toDateInput(addDays(day, -1))}`}
                className="hover:text-ink"
              >
                ‹ Prev
              </Link>
              <Link href={`/calendar/${toDateInput(next)}`} className="hover:text-ink">
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
          <p className="text-sm text-ink-soft">
            Nothing scheduled. Add something below.
          </p>
        ) : (
          items.map((item) => (
            <Card key={`${item.source}-${item.id}`} className="flex items-start gap-3 p-4">
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
                  {item.clientName ? ` · ${item.clientName}` : ""}
                </p>
                {notesById.get(item.id) ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-soft">
                    {notesById.get(item.id)}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {item.completed ? <Badge tone="jade">Done</Badge> : null}
                {item.source === "event" ? (
                  <>
                    <Link
                      href={`/calendar/${dayValue}?edit=${item.id}`}
                      className="metric text-xs text-ink-soft hover:text-ink"
                    >
                      Edit
                    </Link>
                    <DeleteWorkoutForm
                      action={deleteCalendarEvent.bind(null, item.id)}
                      confirmMessage="Delete this event? This can't be undone."
                    />
                  </>
                ) : null}
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="mt-9">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">
          {editing ? "Edit event" : "Add to this day"}
        </h2>
        <p className="mb-3 text-sm text-ink-soft">
          {editing
            ? "Change the date to move it to another day."
            : "Consults, check-in calls, blocked-out time — anything that isn't a programmed session."}
        </p>
        <EventForm
          // Remounts when you switch between adding and editing, so the
          // uncontrolled defaults actually take.
          key={editing?.id ?? "new"}
          action={
            editing
              ? updateCalendarEvent.bind(null, editing.id)
              : createCalendarEvent
          }
          submitLabel={editing ? "Save event" : "Add event"}
          cancelHref={`/calendar/${dayValue}`}
          clients={clients}
          initial={
            editing
              ? {
                  title: editing.title,
                  notes: editing.notes,
                  date: toDateInput(editing.date),
                  start: timeInputFromMinutes(editing.startMinute),
                  end: timeInputFromMinutes(editing.endMinute),
                  kind: toEventKind(editing.kind),
                  clientId: editing.clientId,
                }
              : { date: dayValue }
          }
        />
      </div>
    </Container>
  );
}
