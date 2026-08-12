import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Badge, ButtonLink } from "@/components/ui";
import { assignableClients } from "@/lib/assignees";
import { DISCIPLINE_LABELS, toDiscipline } from "@/lib/constants";
import {
  PrescriptionCard,
  SectionHeading,
  exerciseMetrics,
} from "@/components/PrescriptionCard";
import { DeleteWorkoutForm } from "@/components/DeleteWorkoutForm";
import { AssignClients } from "@/components/AssignClients";
import { deleteTemplate, assignTemplate } from "../actions";
import { toDateInput } from "@/lib/format";
import { groupBySection, usesSections } from "@/lib/workout-form";
import { getExerciseMedia } from "@/lib/exercise-catalog";
import { normalizeExerciseName } from "@/lib/exercise-presets";

export default async function TemplatePage({
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

  const showSections = usesSections(template.exercises);

  const media = await getExerciseMedia(
    trainer.id,
    template.exercises.map((e) => e.name),
  );

  const clients = await assignableClients(trainer.id);

  return (
    <Container className="max-w-3xl">
      <Link href="/library" className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1">
        ‹ Workouts
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow="Saved workout"
          title={template.title}
          action={
            <div className="flex items-center gap-2">
              <ButtonLink
                href={`/library/${template.id}/edit`}
                variant="outline"
                size="sm"
              >
                Edit
              </ButtonLink>
              <DeleteWorkoutForm
                action={deleteTemplate.bind(null, template.id)}
                confirmMessage="Delete this saved workout? It will also be removed from any programs. This can't be undone."
              />
            </div>
          }
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="metric">
              {template.exercises.length} exercise
              {template.exercises.length === 1 ? "" : "s"}
            </span>
            <Badge>{DISCIPLINE_LABELS[toDiscipline(template.discipline)]}</Badge>
          </span>
        </PageHeading>
      </div>

      {template.notes ? (
        <p className="mt-6 rounded-[var(--radius-sm)] border border-line bg-card px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {template.notes}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-6">
        {groupBySection(template.exercises).map((group) => (
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
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* No empty-state branch any more: yourself is always on the list, so
          there is never a state in which this form has nobody to submit for.
          AssignClients says so inline when the roster is empty. */}
      <div className="mt-9">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">
          Assign this workout
        </h2>
        <p className="mb-3 text-sm text-ink-soft">
          Pick who gets this session and the day it lands on — yourself
          included. Each becomes an editable workout for that person.
        </p>
        <AssignClients
          action={assignTemplate.bind(null, template.id)}
          clients={clients}
          self={{ id: trainer.id }}
          submitLabel="Assign workout"
          withDate
          withSchedule
          defaultDate={toDateInput(new Date())}
        />
      </div>
    </Container>
  );
}
