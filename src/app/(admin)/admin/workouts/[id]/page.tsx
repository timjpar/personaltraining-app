// An owner reading a session someone else programmed. Its own page rather than
// a link to /workouts/[id], because that one scopes its lookup by the *signed-in*
// trainer's id — the whole authorization model here is `trainerId: trainer.id` in
// the where clause — so it notFound()s on another coach's work, and src/proxy.ts
// fences /workouts into the trainer area besides. Same reasoning as the comment
// on the account page that links here: everything an account owns is read
// through /admin, never by borrowing a trainer-facing route.
//
// Read-only in three specific ways, each deliberate:
//   - no Edit or Delete. An admin reads; programming stays with the coach.
//   - no unread-clearing. /workouts/[id] marks the feed item read on open, which
//     is right for the coach whose queue it is and wrong for anyone else — an
//     owner glancing at a session must not empty the coach's "to review" count.
//   - no demo media. getExerciseMedia is scoped to the viewing trainer's own
//     library, so it would return nothing here and imply the coach attached
//     nothing, which isn't the same statement.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, Badge } from "@/components/ui";
import {
  PrescriptionCard,
  SectionHeading,
  exerciseMetrics,
  loggedResult,
} from "@/components/PrescriptionCard";
import { RpeMeter } from "@/components/RpeMeter";
import { groupBySection, usesSections } from "@/lib/workout-form";
import { DISCIPLINE_LABELS, toDiscipline, WORKOUT_STATUS } from "@/lib/constants";
import { formatDate, relativeTime } from "@/lib/format";
import { formatTime } from "@/lib/calendar";

export default async function AdminWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  // No trainerId filter, and that's the point: requireAdmin() above is the
  // authorization, so scoping the lookup as well would defeat the page.
  const workout = await prisma.workout.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      trainer: { select: { id: true, name: true } },
      exercises: { orderBy: { order: "asc" } },
    },
  });
  if (!workout) notFound();

  const isCompleted = workout.status === WORKOUT_STATUS.COMPLETED;
  const showSections = usesSections(workout.exercises);

  return (
    <Container className="max-w-3xl">
      {/* Back to the account you came from. The trainer is the likelier origin
          — this page is reached from their "Assigned workouts" list — but both
          accounts are one tap away either way. */}
      <Link
        href={`/admin/users/${workout.trainerId}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {workout.trainer.name}
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow={
            isCompleted
              ? `Completed ${relativeTime(workout.completedAt ?? workout.scheduledDate)}`
              : `Scheduled ${formatDate(workout.scheduledDate)}${
                  workout.startMinute == null
                    ? ""
                    : `, ${formatTime(workout.startMinute)}`
                }`
          }
          title={workout.title}
        >
          <span className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/users/${workout.clientId}`}
              className="metric hover:text-jade-strong"
            >
              {workout.client.name}
            </Link>
            <Badge>{DISCIPLINE_LABELS[toDiscipline(workout.discipline)]}</Badge>
          </span>
        </PageHeading>
      </div>

      {isCompleted ? (
        <Card className="mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow text-ink-soft">Session effort</p>
              <div className="mt-2">
                {workout.rpe != null ? (
                  <RpeMeter value={workout.rpe} />
                ) : (
                  <span className="text-sm text-ink-soft">Not rated</span>
                )}
              </div>
            </div>
            <Badge tone="jade">Logged</Badge>
          </div>
          {workout.clientComment ? (
            <p className="mt-4 border-l-2 border-jade/30 pl-3.5 text-sm leading-relaxed text-ink">
              {workout.clientComment}
            </p>
          ) : null}
        </Card>
      ) : null}

      {workout.notes ? (
        <p className="mt-6 rounded-[var(--radius-sm)] border border-line bg-card px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {workout.notes}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-6">
        {groupBySection(workout.exercises).map((group) => (
          <div key={group.section}>
            {showSections ? (
              <SectionHeading label={group.label} count={group.rows.length} />
            ) : null}
            <ul className="flex flex-col gap-3">
              {group.rows.map((ex) => (
                <li key={ex.id}>
                  <PrescriptionCard
                    index={ex.order}
                    name={ex.name}
                    metrics={exerciseMetrics(ex)}
                    notes={ex.notes}
                    logged={isCompleted && ex.done}
                    footer={
                      isCompleted
                        ? loggedResult({
                            sets: ex.resultSets,
                            reps: ex.resultReps,
                            load: ex.resultLoad,
                          })
                        : null
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Container>
  );
}
