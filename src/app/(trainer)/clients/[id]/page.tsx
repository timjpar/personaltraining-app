import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Container,
  PageHeading,
  Card,
  Badge,
  Avatar,
  ButtonLink,
  EmptyState,
} from "@/components/ui";
import { AssignSavedWorkout } from "@/components/AssignSavedWorkout";
import { assignTemplateToClient } from "@/app/(trainer)/library/actions";
import { formatDate, toDateInput } from "@/lib/format";

function WorkoutRow({
  id,
  title,
  date,
  count,
  completed,
  rpe,
}: {
  id: string;
  title: string;
  date: Date;
  count: number;
  completed: boolean;
  rpe: number | null;
}) {
  return (
    <Link
      href={`/workouts/${id}`}
      className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{title}</p>
        <p className="metric mt-0.5 text-xs text-ink-soft">
          {formatDate(date)} · {count} exercise{count === 1 ? "" : "s"}
        </p>
      </div>
      {completed ? (
        <Badge tone="jade">Logged{rpe != null ? ` · RPE ${rpe}` : ""}</Badge>
      ) : (
        <Badge>Assigned</Badge>
      )}
      <span className="text-ink-soft">›</span>
    </Link>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainer = await requireTrainer();

  const client = await prisma.user.findFirst({
    where: { id, trainerId: trainer.id, role: "CLIENT" },
    include: {
      workoutsAsClient: {
        orderBy: { scheduledDate: "desc" },
        include: { _count: { select: { exercises: true } } },
      },
    },
  });

  if (!client) notFound();

  const templates = await prisma.workoutTemplate.findMany({
    where: { trainerId: trainer.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true },
  });

  const upcoming = client.workoutsAsClient
    .filter((w) => w.status !== "COMPLETED")
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  const completed = client.workoutsAsClient
    .filter((w) => w.status === "COMPLETED")
    .sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
    );

  return (
    <Container>
      <Link
        href="/clients"
        className="metric text-xs text-ink-soft hover:text-ink"
      >
        ‹ All clients
      </Link>

      <div className="mt-3">
        <PageHeading
          title={client.name}
          action={
            <ButtonLink href={`/clients/${client.id}/workouts/new`}>
              Program a workout
            </ButtonLink>
          }
        >
          <span className="flex items-center gap-2">
            <Avatar name={client.name} className="h-6 w-6 text-[0.625rem]" />
            <span className="metric">{client.email}</span>
          </span>
        </PageHeading>
      </div>

      {templates.length > 0 ? (
        <Card className="mt-6 p-4 sm:p-5">
          <h2 className="mb-1 font-display text-base font-semibold text-ink">
            Assign a saved workout
          </h2>
          <p className="mb-3 text-sm text-ink-soft">
            Drop one of your saved workouts onto {client.name.split(/\s+/)[0]}
            &rsquo;s calendar, or{" "}
            <Link
              href={`/clients/${client.id}/workouts/new`}
              className="text-jade-strong hover:underline"
            >
              build a one-off
            </Link>
            .
          </p>
          <AssignSavedWorkout
            action={assignTemplateToClient.bind(null, client.id)}
            templates={templates}
            defaultDate={toDateInput(new Date())}
          />
        </Card>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <EmptyState
              title="Nothing programmed yet"
              action={
                <ButtonLink
                  href={`/clients/${client.id}/workouts/new`}
                  size="sm"
                >
                  Program a workout
                </ButtonLink>
              }
            >
              Build {client.name.split(/\s+/)[0]}&rsquo;s next session.
            </EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {upcoming.map((w) => (
                <WorkoutRow
                  key={w.id}
                  id={w.id}
                  title={w.title}
                  date={w.scheduledDate}
                  count={w._count.exercises}
                  completed={false}
                  rpe={w.rpe}
                />
              ))}
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">
            Completed
          </h2>
          {completed.length === 0 ? (
            <EmptyState title="No completed sessions yet">
              Finished workouts show up here with results.
            </EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {completed.map((w) => (
                <WorkoutRow
                  key={w.id}
                  id={w.id}
                  title={w.title}
                  date={w.completedAt ?? w.scheduledDate}
                  count={w._count.exercises}
                  completed
                  rpe={w.rpe}
                />
              ))}
            </Card>
          )}
        </section>
      </div>
    </Container>
  );
}
