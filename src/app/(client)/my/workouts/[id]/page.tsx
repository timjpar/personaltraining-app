import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { completeWorkout } from "@/app/(client)/my/actions";
import { Container, PageHeading, Card, Badge } from "@/components/ui";
import { PrescriptionCard, exerciseMetrics } from "@/components/PrescriptionCard";
import { RpeMeter } from "@/components/RpeMeter";
import { WorkoutLogForm } from "@/components/WorkoutLogForm";
import { formatDate, relativeTime } from "@/lib/format";

export default async function ClientWorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { id } = await params;
  const { done } = await searchParams;
  const client = await requireClient();

  const workout = await prisma.workout.findFirst({
    where: { id, clientId: client.id },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!workout) notFound();

  const isCompleted = workout.status === "COMPLETED";

  return (
    <Container className="max-w-3xl">
      <Link href="/my" className="metric text-xs text-ink-soft hover:text-ink">
        ‹ Today
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow={
            isCompleted
              ? `Completed ${relativeTime(workout.completedAt ?? new Date())}`
              : `Scheduled ${formatDate(workout.scheduledDate)}`
          }
          title={workout.title}
        />
      </div>

      {done ? (
        <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-card)] border border-jade/30 bg-jade-wash/50 p-4">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-jade text-white">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M4 11 L8 15 L16 5"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Nice work — logged.</p>
            <p className="text-sm text-ink-soft">
              Your coach has been notified that you finished.
            </p>
          </div>
        </div>
      ) : null}

      {isCompleted ? (
        <div className="mt-6 flex flex-col gap-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="eyebrow text-ink-soft">Your effort</p>
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

          <ul className="flex flex-col gap-3">
            {workout.exercises.map((ex) => (
              <li key={ex.id}>
                <PrescriptionCard
                  index={ex.order}
                  name={ex.name}
                  metrics={exerciseMetrics(ex)}
                  notes={ex.notes}
                  logged={ex.done}
                  footer={
                    ex.resultReps || ex.resultLoad ? (
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[var(--radius-sm)] bg-jade-wash/60 px-3.5 py-2.5">
                        <span className="eyebrow text-jade-strong">You logged</span>
                        {ex.resultReps ? (
                          <span className="metric text-sm text-ink">
                            {ex.resultReps} reps
                          </span>
                        ) : null}
                        {ex.resultLoad ? (
                          <span className="metric text-sm text-ink">
                            @ {ex.resultLoad}
                          </span>
                        ) : null}
                      </div>
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-6">
          <WorkoutLogForm
            action={completeWorkout.bind(null, workout.id)}
            notes={workout.notes}
            exercises={workout.exercises}
          />
        </div>
      )}
    </Container>
  );
}
