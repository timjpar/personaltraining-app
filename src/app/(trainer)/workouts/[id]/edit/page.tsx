import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPickerCatalog } from "@/lib/exercise-catalog";
import { Container, PageHeading } from "@/components/ui";
import { WorkoutBuilder } from "@/components/WorkoutBuilder";
import { updateWorkout } from "@/app/(trainer)/workout-actions";
import { toDateInput } from "@/lib/format";

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
        className="metric text-xs text-ink-soft hover:text-ink"
      >
        ‹ Back to session
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="Edit session" title={workout.title}>
          Programming for {workout.client.name}.
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
            scheduledDate: toDateInput(workout.scheduledDate),
            exercises: workout.exercises.map((ex) => ({
              id: ex.id,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
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
