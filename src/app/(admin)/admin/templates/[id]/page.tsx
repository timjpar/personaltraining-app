// A saved workout read by an owner rather than by the coach who wrote it. Its
// own page for the same reason /admin/workouts/[id] is: the trainer's route at
// /library/[id] scopes its lookup by the *signed-in* trainer's id, so it
// notFound()s on another coach's template, and src/proxy.ts fences /library
// into the trainer area besides.
//
// Read-only in the same three ways as the admin workout page:
//   - no Edit or Delete. An admin reads; programming stays with the coach.
//   - no "assign to clients". Handing someone else's session to a client is the
//     coach's call, and the picker would need their roster to make sense.
//   - no demo media. getExerciseMedia is scoped to the viewing trainer's own
//     library, so it would return nothing here and imply the coach attached
//     nothing, which isn't the same statement.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Badge } from "@/components/ui";
import {
  PrescriptionCard,
  SectionHeading,
  exerciseMetrics,
} from "@/components/PrescriptionCard";
import { groupBySection, usesSections } from "@/lib/workout-form";
import { DISCIPLINE_LABELS, toDiscipline } from "@/lib/constants";

export default async function AdminTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  // No trainerId filter, and that's the point: requireAdmin() above is the
  // authorization, so scoping the lookup as well would defeat the page.
  const template = await prisma.workoutTemplate.findUnique({
    where: { id },
    include: {
      trainer: { select: { id: true, name: true } },
      exercises: { orderBy: { order: "asc" } },
    },
  });
  if (!template) notFound();

  const showSections = usesSections(template.exercises);

  return (
    <Container className="max-w-3xl">
      <Link
        href={`/admin/users/${template.trainerId}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {template.trainer.name}
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="Saved workout" title={template.title}>
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
