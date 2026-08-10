// A multi-week block read by an owner rather than by the coach who built it.
// Its own page for the same reason /admin/workouts/[id] is: /programs/[id]
// scopes its lookup by the *signed-in* trainer's id, so it notFound()s on
// another coach's program, and src/proxy.ts fences /programs into the trainer
// area besides.
//
// The trainer's page *is* the builder — ProgramBuilder is a form, and its only
// mode is editable. So this renders the same week × day grid as flat text
// instead of a wall of disabled <select>s, which reads better anyway and keeps
// the page honestly read-only. Each session links through to the saved workout.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card } from "@/components/ui";
import { PROGRAM_DAYS, dayLabel } from "@/lib/constants";

export default async function AdminProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  // No trainerId filter, and that's the point: requireAdmin() above is the
  // authorization, so scoping the lookup as well would defeat the page.
  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      trainer: { select: { id: true, name: true } },
      slots: {
        include: { template: { select: { id: true, title: true } } },
      },
    },
  });
  if (!program) notFound();

  // week-day -> the session on it. Days with no slot are rest days.
  const slotMap = new Map(program.slots.map((s) => [`${s.week}-${s.day}`, s]));

  return (
    <Container className="max-w-4xl">
      <Link
        href={`/admin/users/${program.trainerId}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {program.trainer.name}
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="Program" title={program.title}>
          <span className="metric">
            {program.weeks} week{program.weeks === 1 ? "" : "s"} ·{" "}
            {program.slots.length} session
            {program.slots.length === 1 ? "" : "s"}
          </span>
        </PageHeading>
      </div>

      {program.notes ? (
        <p className="mt-6 rounded-[var(--radius-sm)] border border-line bg-card px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {program.notes}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-5">
        {Array.from({ length: program.weeks }, (_, i) => i + 1).map((w) => (
          <div key={w}>
            <h2 className="mb-2 font-display text-base font-semibold text-ink">
              Week {w}
            </h2>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {PROGRAM_DAYS.map((d) => {
                const slot = slotMap.get(`${w}-${d}`);
                return (
                  <div key={d} className="flex flex-col gap-1">
                    <span className="eyebrow text-ink-soft/70">
                      {dayLabel(d)}
                    </span>
                    {slot ? (
                      <Link
                        href={`/admin/templates/${slot.template.id}`}
                        className="block rounded-[var(--radius-sm)] border border-line bg-card px-3 py-2.5 text-sm text-ink transition-colors hover:bg-paper"
                      >
                        {slot.template.title}
                      </Link>
                    ) : (
                      <p className="rounded-[var(--radius-sm)] border border-dashed border-line px-3 py-2.5 text-sm text-ink-soft">
                        Rest
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
