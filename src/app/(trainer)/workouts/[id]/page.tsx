import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, Badge, ButtonLink } from "@/components/ui";
import {
  PrescriptionCard,
  SectionHeading,
  exerciseMetrics,
  loggedResult,
} from "@/components/PrescriptionCard";
import { groupBySection, usesSections } from "@/lib/workout-form";
import { DISCIPLINE_LABELS, toDiscipline, toCoachReaction } from "@/lib/constants";
import { CoachFeedbackForm } from "@/components/CoachFeedbackForm";
import { getExerciseMedia } from "@/lib/exercise-catalog";
import { normalizeExerciseName } from "@/lib/exercise-presets";
import { RpeMeter } from "@/components/RpeMeter";
import { DeleteWorkoutForm } from "@/components/DeleteWorkoutForm";
import { deleteWorkout } from "@/app/(trainer)/workout-actions";
import { formatDate, relativeTime } from "@/lib/format";
import { formatTime } from "@/lib/calendar";

export default async function WorkoutReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainer = await requireTrainer();

  const workout = await prisma.workout.findFirst({
    where: { id, trainerId: trainer.id },
    include: {
      client: true,
      exercises: { orderBy: { order: "asc" } },
    },
  });
  if (!workout) notFound();

  const isCompleted = workout.status === "COMPLETED";
  const showSections = usesSections(workout.exercises);

  // The coach sees their own attached demos here too — otherwise there's
  // nowhere to check that a link actually plays before a client meets it.
  const media = await getExerciseMedia(
    trainer.id,
    workout.exercises.map((e) => e.name),
  );

  // Opening a completed session clears its unread flag on the feed.
  if (isCompleted) {
    await prisma.feedItem.updateMany({
      where: { workoutId: workout.id, read: false },
      data: { read: true },
    });
  }

  return (
    <Container className="max-w-3xl">
      <Link
        href={`/clients/${workout.clientId}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {workout.client.name}
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
          action={
            <div className="flex items-center gap-2">
              {!isCompleted ? (
                <ButtonLink
                  href={`/workouts/${workout.id}/edit`}
                  variant="outline"
                  size="sm"
                >
                  Edit
                </ButtonLink>
              ) : null}
              <DeleteWorkoutForm action={deleteWorkout.bind(null, workout.id)} />
            </div>
          }
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="metric">{workout.client.name}</span>
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
                    demo={(() => {
                      const own = media.get(normalizeExerciseName(ex.name));
                      return own ? { own: true, url: own.url } : undefined;
                    })()}
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

      {/* Last, and deliberately not next to the effort card it answers. A coach
          writing this has just read the session; putting the form above the
          exercises means scrolling past a compose box to reach the thing being
          responded to. The athlete's copy makes the opposite call for the same
          reason — see CoachResponseCard — because a reply is news to them and
          old news to whoever wrote it. */}
      {isCompleted ? (
        <div className="mt-6">
          <CoachFeedbackForm
            workoutId={workout.id}
            clientName={workout.client.name}
            reaction={toCoachReaction(workout.coachReaction)}
            note={workout.coachNote}
          />
        </div>
      ) : null}
    </Container>
  );
}
