import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPickerCatalog } from "@/lib/exercise-catalog";
import { Container, PageHeading } from "@/components/ui";
import { WorkoutBuilder } from "@/components/WorkoutBuilder";
import { updateWorkout } from "@/app/(trainer)/workout-actions";
import { toDateInput } from "@/lib/format";
import { timeInputFromMinutes } from "@/lib/calendar";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainer = await requireTrainer();

  const workout = await prisma.workout.findFirst({
    where: { id, trainerId: trainer.id },
    include: {
      client: { select: { name: true } },
      exercises: { orderBy: { order: "asc" } },
    },
  });
  if (!workout) notFound();

  const catalog = await getPickerCatalog(trainer.id);

  return (
    <Container className="max-w-3xl">
      <Link
        href={`/workouts/${workout.id}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ Back to session
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="Edit session" title={workout.title}>
          {/* The coach can assign a session to themselves, and this row is
              reached the same way any other is — via /workouts/<id>, which
              bounces a self session on to /me/workouts/<id>. Only the sentence
              changes; the builder doesn't care whose session it is. */}
          {workout.clientId === trainer.id
            ? "Programming for yourself."
            : `Programming for ${workout.client.name}.`}
        </PageHeading>
      </div>

      <div className="mt-7">
        <WorkoutBuilder
          action={updateWorkout.bind(null, workout.id)}
          submitLabel="Save changes"
          cancelHref={`/workouts/${workout.id}`}
          catalog={catalog}
          initial={{
            title: workout.title,
            notes: workout.notes,
            discipline: workout.discipline,
            attendance: workout.attendance,
            durationMinutes: workout.durationMinutes,
            scheduledDate: toDateInput(workout.scheduledDate),
            startTime: timeInputFromMinutes(workout.startMinute),
            exercises: workout.exercises.map((ex) => ({
              id: ex.id,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              load: ex.load,
              tempo: ex.tempo,
              rest: ex.rest,
              notes: ex.notes,
              section: ex.section,
            })),
          }}
        />
      </div>
    </Container>
  );
}
