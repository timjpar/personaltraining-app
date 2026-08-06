import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPickerCatalog } from "@/lib/exercise-catalog";
import { Container, PageHeading } from "@/components/ui";
import { WorkoutBuilder } from "@/components/WorkoutBuilder";
import { createWorkout } from "@/app/(trainer)/workout-actions";
import { toDateInput } from "@/lib/format";

export default async function NewWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainer = await requireTrainer();

  const [client, catalog] = await Promise.all([
    prisma.user.findFirst({
      where: { id, trainerId: trainer.id, role: "CLIENT" },
      select: { id: true, name: true },
    }),
    getPickerCatalog(trainer.id),
  ]);
  if (!client) notFound();

  return (
    <Container className="max-w-3xl">
      <Link
        href={`/clients/${client.id}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {client.name}
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="New session" title={`Program for ${client.name}`}>
          Set the day, then add each movement with its prescription.
        </PageHeading>
      </div>

      <div className="mt-7">
        <WorkoutBuilder
          action={createWorkout.bind(null, client.id)}
          submitLabel="Assign workout"
          cancelHref={`/clients/${client.id}`}
          catalog={catalog}
          initial={{ scheduledDate: toDateInput(new Date()) }}
        />
      </div>
    </Container>
  );
}
