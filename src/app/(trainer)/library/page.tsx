import { cookies } from "next/headers";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, ButtonLink, EmptyState } from "@/components/ui";
import { WorkoutLibrary } from "@/components/WorkoutLibrary";
import { formatDateShort } from "@/lib/format";
import {
  DEFAULT_LIBRARY_VIEW,
  LIBRARY_VIEW_COOKIE,
  toLibraryView,
} from "@/lib/library-view";

export default async function LibraryPage() {
  const trainer = await requireTrainer();

  const templates = await prisma.workoutTemplate.findMany({
    where: { trainerId: trainer.id },
    include: { _count: { select: { exercises: true } } },
  });

  const stored =
    toLibraryView((await cookies()).get(LIBRARY_VIEW_COOKIE)?.value) ??
    DEFAULT_LIBRARY_VIEW;

  return (
    <Container>
      <PageHeading
        eyebrow="Workout library"
        title="Workouts"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ButtonLink href="/exercises" variant="outline">
              My exercises
            </ButtonLink>
            <ButtonLink href="/exercises/new" variant="outline">
              New exercise
            </ButtonLink>
            <ButtonLink href="/library/new">New workout</ButtonLink>
          </div>
        }
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
          <WorkoutLibrary
            stored={stored}
            rows={templates.map((t) => ({
              id: t.id,
              title: t.title,
              discipline: t.discipline,
              exercises: t._count.exercises,
              updatedAt: t.updatedAt.getTime(),
              updatedLabel: formatDateShort(t.updatedAt),
            }))}
          />
        )}
      </div>
    </Container>
  );
}
