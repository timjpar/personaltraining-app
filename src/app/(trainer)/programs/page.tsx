import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, ButtonLink, EmptyState } from "@/components/ui";

export default async function ProgramsPage() {
  const trainer = await requireTrainer();

  const programs = await prisma.program.findMany({
    where: { trainerId: trainer.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { slots: true } } },
  });

  return (
    <Container>
      <PageHeading
        eyebrow="Programs"
        title="Programs"
        action={<ButtonLink href="/programs/new">New program</ButtonLink>}
      >
        Multi-week blocks built from your saved workouts. Assign a whole block to
        a client and every session lands on the right day.
      </PageHeading>

      <div className="mt-7">
        {programs.length === 0 ? (
          <EmptyState
            title="No programs yet"
            action={
              <ButtonLink href="/programs/new" size="sm">
                New program
              </ButtonLink>
            }
          >
            Lay out a training block week by week from your saved workouts.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {programs.map((p) => (
              <Link
                key={p.id}
                href={`/programs/${p.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                  <p className="metric mt-0.5 text-xs text-ink-soft">
                    {p.weeks} week{p.weeks === 1 ? "" : "s"} · {p._count.slots}{" "}
                    session{p._count.slots === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-ink-soft">›</span>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </Container>
  );
}
