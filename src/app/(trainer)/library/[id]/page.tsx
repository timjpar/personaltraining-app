import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Container,
  PageHeading,
  ButtonLink,
  EmptyState,
} from "@/components/ui";
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

  const clients = await prisma.user.findMany({
    where: { trainerId: trainer.id, role: "CLIENT" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <Container className="max-w-3xl">
      <Link href="/library" className="metric text-xs text-ink-soft hover:text-ink">
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
          <span className="metric">
            {template.exercises.length} exercise
            {template.exercises.length === 1 ? "" : "s"}
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
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-9">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">
          Assign to clients
        </h2>
        <p className="mb-3 text-sm text-ink-soft">
          Pick who gets this session and the day it lands on. Each becomes an
          editable workout for that client.
        </p>
        {clients.length === 0 ? (
          <EmptyState
            title="No clients yet"
            action={
              <ButtonLink href="/clients" size="sm">
                Add a client
              </ButtonLink>
            }
          >
            Add clients, then assign this workout to any of them in a click.
          </EmptyState>
        ) : (
          <AssignClients
            action={assignTemplate.bind(null, template.id)}
            clients={clients}
            submitLabel="Assign workout"
            withDate
            defaultDate={toDateInput(new Date())}
          />
        )}
      </div>
    </Container>
  );
}
