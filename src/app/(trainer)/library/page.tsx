import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, ButtonLink, EmptyState } from "@/components/ui";

export default async function LibraryPage() {
  const trainer = await requireTrainer();

  const templates = await prisma.workoutTemplate.findMany({
    where: { trainerId: trainer.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { exercises: true } } },
  });

  return (
    <Container>
      <PageHeading
        eyebrow="Workout library"
        title="Workouts"
        action={<ButtonLink href="/library/new">New workout</ButtonLink>}
      >
        Reusable sessions you build once and drop onto any client — no client
        required to save one.
      </PageHeading>

      <div className="mt-7">
        {templates.length === 0 ? (
          <EmptyState
            title="No saved workouts yet"
            action={
              <ButtonLink href="/library/new" size="sm">
                New workout
              </ButtonLink>
            }
          >
            Build a session now — save it before you add any clients, then assign
            it whenever you like.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/library/${t.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{t.title}</p>
                  <p className="metric mt-0.5 text-xs text-ink-soft">
                    {t._count.exercises} exercise{t._count.exercises === 1 ? "" : "s"}
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
