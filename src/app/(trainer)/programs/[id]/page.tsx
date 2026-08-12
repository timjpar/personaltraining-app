import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading } from "@/components/ui";
import { assignableClients } from "@/lib/assignees";
import { ProgramBuilder } from "@/components/ProgramBuilder";
import { AssignClients } from "@/components/AssignClients";
import { DeleteWorkoutForm } from "@/components/DeleteWorkoutForm";
import { updateProgram, deleteProgram, assignProgram } from "../actions";
import { toDateInput } from "@/lib/format";

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainer = await requireTrainer();

  const program = await prisma.program.findFirst({
    where: { id, trainerId: trainer.id },
    include: { slots: true },
  });
  if (!program) notFound();

  const [templates, clients] = await Promise.all([
    prisma.workoutTemplate.findMany({
      where: { trainerId: trainer.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    assignableClients(trainer.id),
  ]);

  return (
    <Container className="max-w-4xl">
      <Link href="/programs" className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1">
        ‹ Programs
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow="Program"
          title={program.title}
          action={
            <DeleteWorkoutForm
              action={deleteProgram.bind(null, program.id)}
              confirmMessage="Delete this program? Already-assigned sessions stay with your clients. This can't be undone."
              label="Delete"
            />
          }
        >
          <span className="metric">
            {program.weeks} week{program.weeks === 1 ? "" : "s"} ·{" "}
            {program.slots.length} session{program.slots.length === 1 ? "" : "s"}
          </span>
        </PageHeading>
      </div>

      <div className="mt-7">
        <ProgramBuilder
          action={updateProgram.bind(null, program.id)}
          submitLabel="Save changes"
          cancelHref="/programs"
          templates={templates}
          initial={{
            title: program.title,
            notes: program.notes,
            weeks: program.weeks,
            slots: program.slots.map((s) => ({
              week: s.week,
              day: s.day,
              templateId: s.templateId,
            })),
          }}
        />
      </div>

      <div className="mt-10">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">
          Assign this program
        </h2>
        <p className="mb-3 text-sm text-ink-soft">
          Pick who runs it — yourself included — and a start date. Every session
          is scheduled out from there, week by week.
        </p>
        <AssignClients
          action={assignProgram.bind(null, program.id)}
          clients={clients}
          self={{ id: trainer.id }}
          submitLabel="Assign program"
          withDate
          withSchedule
          dateLabel="Start date"
          defaultDate={toDateInput(new Date())}
        />
      </div>
    </Container>
  );
}
