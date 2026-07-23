import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function HistoryPage() {
  const client = await requireClient();

  const completed = await prisma.workout.findMany({
    where: { clientId: client.id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    include: { _count: { select: { exercises: true } } },
  });

  return (
    <Container className="max-w-3xl">
      <PageHeading eyebrow="History" title="Completed workouts">
        Everything you&rsquo;ve logged, most recent first.
      </PageHeading>

      <div className="mt-7">
        {completed.length === 0 ? (
          <EmptyState title="Nothing logged yet">
            Finish a workout and it&rsquo;ll show up here.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {completed.map((w) => (
              <Link
                key={w.id}
                href={`/my/workouts/${w.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{w.title}</p>
                  <p className="metric mt-0.5 text-xs text-ink-soft">
                    {formatDate(w.completedAt ?? w.scheduledDate)} ·{" "}
                    {w._count.exercises} exercise{w._count.exercises === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge tone="jade">
                  Logged{w.rpe != null ? ` · RPE ${w.rpe}` : ""}
                </Badge>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </Container>
  );
}
