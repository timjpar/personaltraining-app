import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPickerCatalog } from "@/lib/exercise-catalog";
import { Container, PageHeading } from "@/components/ui";
import { WorkoutBuilder } from "@/components/WorkoutBuilder";
import { updateTemplate } from "../../actions";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainer = await requireTrainer();

  const template = await prisma.workoutTemplate.findFirst({
    where: { id, trainerId: trainer.id },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!template) notFound();

  const catalog = await getPickerCatalog(trainer.id);

  return (
    <Container className="max-w-3xl">
      <Link
        href={`/library/${template.id}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {template.title}
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="Edit workout" title={template.title}>
          Changes here don&rsquo;t touch sessions you&rsquo;ve already assigned.
        </PageHeading>
      </div>

      <div className="mt-7">
        <WorkoutBuilder
          action={updateTemplate.bind(null, template.id)}
          submitLabel="Save changes"
          cancelHref={`/library/${template.id}`}
          showDate={false}
          catalog={catalog}
          initial={{
            title: template.title,
            notes: template.notes,
            discipline: template.discipline,
            exercises: template.exercises.map((e) => ({
              id: e.id,
              name: e.name,
              sets: e.sets,
              reps: e.reps,
              weight: e.weight,
              load: e.load,
              tempo: e.tempo,
              rest: e.rest,
              notes: e.notes,
              section: e.section,
            })),
          }}
        />
      </div>
    </Container>
  );
}
