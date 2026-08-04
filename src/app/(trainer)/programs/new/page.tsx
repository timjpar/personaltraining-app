import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading } from "@/components/ui";
import { ProgramBuilder } from "@/components/ProgramBuilder";
import { createProgram } from "../actions";

export default async function NewProgramPage() {
  const trainer = await requireTrainer();

  const templates = await prisma.workoutTemplate.findMany({
    where: { trainerId: trainer.id },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return (
    <Container className="max-w-4xl">
      <Link href="/programs" className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1">
        ‹ Programs
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="New program" title="Build a program">
          Set the length, then drop a saved workout onto each training day. Empty
          days are rest.
        </PageHeading>
      </div>

      <div className="mt-7">
        <ProgramBuilder
          action={createProgram}
          submitLabel="Save program"
          cancelHref="/programs"
          templates={templates}
        />
      </div>
    </Container>
  );
}
