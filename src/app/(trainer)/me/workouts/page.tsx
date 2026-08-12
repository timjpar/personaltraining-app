import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Container,
  PageHeading,
  Card,
  Badge,
  ButtonLink,
  EmptyState,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { formatTime } from "@/lib/calendar";
import { WORKOUT_STATUS } from "@/lib/constants";

// The coach's own training, assigned and done, on one page.
//
// One page rather than the athlete's two — /my splits "what's next" from
// /my/history — because the volumes are different. An athlete's history is the
// record their coach reads back to them and it grows for years; a coach's own
// log is a handful of sessions they wrote for themselves, and splitting that
// across two routes gives each half less than a screen.
//
// Everything here is a plain Workout with clientId === trainerId. Nothing about
// this query knows that: it asks the same "sessions that are mine" question
// /my asks, against the same column.
export default async function MyWorkoutsPage() {
  const trainer = await requireTrainer();

  const workouts = await prisma.workout.findMany({
    where: { clientId: trainer.id },
    orderBy: { scheduledDate: "asc" },
    include: { _count: { select: { exercises: true } } },
  });

  const upcoming = workouts.filter((w) => w.status !== WORKOUT_STATUS.COMPLETED);
  const completed = workouts
    .filter((w) => w.status === WORKOUT_STATUS.COMPLETED)
    .sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
    );

  return (
    <Container className="max-w-3xl">
      <Link
        href="/me"
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ You
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow="Your training"
          title="Sessions"
          action={
            <ButtonLink href="/me/workouts/new" size="sm">
              New session
            </ButtonLink>
          }
        >
          What you&rsquo;ve programmed for yourself, and what you&rsquo;ve
          logged. Nobody on your roster sees any of it.
        </PageHeading>
      </div>

      <section className="mt-7">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">
          Coming up
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing scheduled"
            action={
              <ButtonLink href="/library" size="sm" variant="outline">
                Assign a saved workout
              </ButtonLink>
            }
          >
            Assign yourself a saved workout or a program from your own library —
            you&rsquo;re on every assign list now — or write a one-off session
            from scratch.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {upcoming.map((w) => (
              <Link
                key={w.id}
                href={`/me/workouts/${w.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {w.title}
                  </p>
                  <p className="metric mt-0.5 text-xs text-ink-soft">
                    {formatDate(w.scheduledDate)}
                    {w.startMinute == null
                      ? ""
                      : `, ${formatTime(w.startMinute)}`}{" "}
                    · {w._count.exercises} exercise
                    {w._count.exercises === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-ink-soft">›</span>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">
          Logged
        </h2>
        {completed.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Nothing logged yet — your finished sessions collect here.
          </p>
        ) : (
          <Card className="divide-y divide-line">
            {completed.map((w) => (
              <Link
                key={w.id}
                href={`/me/workouts/${w.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {w.title}
                  </p>
                  <p className="metric mt-0.5 text-xs text-ink-soft">
                    {formatDate(w.completedAt ?? w.scheduledDate)} ·{" "}
                    {w._count.exercises} exercise
                    {w._count.exercises === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge tone="jade">
                  Logged{w.rpe != null ? ` · RPE ${w.rpe}` : ""}
                </Badge>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </Container>
  );
}
