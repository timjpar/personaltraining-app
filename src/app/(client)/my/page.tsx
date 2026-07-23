import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Container,
  PageHeading,
  Card,
  Badge,
  ButtonLink,
  EmptyState,
} from "@/components/ui";
import { formatDate, formatDateLong } from "@/lib/format";

export default async function ClientHomePage() {
  const client = await requireClient();
  const firstName = client.name.split(/\s+/)[0];

  const workouts = await prisma.workout.findMany({
    where: { clientId: client.id },
    orderBy: { scheduledDate: "asc" },
    include: { _count: { select: { exercises: true } } },
  });

  const upcoming = workouts.filter((w) => w.status !== "COMPLETED");
  const recentlyCompleted = workouts
    .filter((w) => w.status === "COMPLETED")
    .sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
    )
    .slice(0, 4);

  const [next, ...laterUpcoming] = upcoming;

  return (
    <Container className="max-w-3xl">
      <PageHeading eyebrow={formatDateLong(new Date())} title={`Hi, ${firstName}`}>
        {upcoming.length > 0
          ? "Here's what's on your plan."
          : "You're all caught up."}
      </PageHeading>

      {next ? (
        <section className="mt-7">
          <p className="eyebrow mb-2 text-ink-soft">Up next</p>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">
                  {next.title}
                </h2>
                <p className="metric mt-1 text-sm text-ink-soft">
                  {formatDate(next.scheduledDate)} · {next._count.exercises}{" "}
                  exercise{next._count.exercises === 1 ? "" : "s"}
                </p>
              </div>
              <Badge>Assigned</Badge>
            </div>
            <div className="mt-5">
              <ButtonLink href={`/my/workouts/${next.id}`}>
                Start workout
              </ButtonLink>
            </div>
          </Card>
        </section>
      ) : null}

      {laterUpcoming.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">
            Later
          </h2>
          <Card className="divide-y divide-line">
            {laterUpcoming.map((w) => (
              <Link
                key={w.id}
                href={`/my/workouts/${w.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {w.title}
                  </p>
                  <p className="metric mt-0.5 text-xs text-ink-soft">
                    {formatDate(w.scheduledDate)} · {w._count.exercises} exercise
                    {w._count.exercises === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-ink-soft">›</span>
              </Link>
            ))}
          </Card>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">
            Recently completed
          </h2>
          {recentlyCompleted.length > 0 ? (
            <Link
              href="/my/history"
              className="text-xs font-medium text-jade-strong hover:underline"
            >
              All history →
            </Link>
          ) : null}
        </div>

        {recentlyCompleted.length === 0 ? (
          upcoming.length === 0 ? (
            <EmptyState title="No workouts yet">
              When your coach programs a session, it&rsquo;ll appear here.
            </EmptyState>
          ) : (
            <p className="text-sm text-ink-soft">
              Nothing logged yet — your finished sessions will collect here.
            </p>
          )
        ) : (
          <Card className="divide-y divide-line">
            {recentlyCompleted.map((w) => (
              <Link
                key={w.id}
                href={`/my/workouts/${w.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {w.title}
                  </p>
                  <p className="metric mt-0.5 text-xs text-ink-soft">
                    {formatDate(w.completedAt ?? w.scheduledDate)}
                  </p>
                </div>
                <Badge tone="jade">Logged{w.rpe != null ? ` · RPE ${w.rpe}` : ""}</Badge>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </Container>
  );
}
