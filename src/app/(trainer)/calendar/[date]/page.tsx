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
  TRAINER_LINKS,
} from "@/lib/calendar";
import { ATTENDANCE, EVENT_KIND_LABELS, toEventKind } from "@/lib/constants";
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
    // In-person only, matching the month grid this day page is opened from —
    // a day that shows more than the cell you clicked reads as a bug.
    prisma.workout.findMany({
      where: {
        trainerId: trainer.id,
        attendance: ATTENDANCE.IN_PERSON,
        scheduledDate: { gte: day, lt: next },
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
      where: { trainerId: trainer.id, date: { gte: day, lt: next } },
      include: { client: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { trainerId: trainer.id, role: "CLIENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const items = [
    ...workouts.map((w) => workoutItem(w, TRAINER_LINKS)),
    ...events.map((e) => eventItem(e, TRAINER_LINKS)),
  ].sort(compareItems);

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
            <Card
              key={`${item.source}-${item.id}`}
              // relative + the stretched link below: the whole card is the hit
              // target, but the anchor stays a plain inline link, so the Edit
              // and Delete controls beside it aren't nested inside it.
              className="relative flex items-start gap-3 p-4 transition-colors hover:bg-paper"
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
                  <Link
                    href={item.href}
                    className="after:absolute after:inset-0 hover:text-jade-strong"
                  >
                    {item.title}
                  </Link>
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

              {/* relative, so these sit above the stretched link rather than
                  under it — otherwise the card swallows every click. */}
              <div className="relative flex shrink-0 items-center gap-2">
                {item.completed ? <Badge tone="jade">Done</Badge> : null}
                <Link
                  href={
                    item.source === "workout"
                      ? `/workouts/${item.id}/edit`
                      : `/calendar/${dayValue}?edit=${item.id}`
                  }
                  className="metric inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:px-1.5 sm:py-1"
                >
                  Edit
                </Link>
                {item.source === "event" ? (
                  <DeleteWorkoutForm
                    action={deleteCalendarEvent.bind(null, item.id)}
                    confirmMessage="Delete this event? This can't be undone."
                  />
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
