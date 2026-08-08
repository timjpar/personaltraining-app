// One day of an athlete's food log, beside the plan they were given — the
// coach's half of the nutrition loop, and the destination of the "Review log"
// link in the activity feed.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card } from "@/components/ui";
import { NutritionLogView } from "@/components/NutritionLogView";
import { NutritionPlanView } from "@/components/NutritionPlanView";
import { parseDayParam } from "@/lib/calendar";
import { formatDateLong } from "@/lib/format";

export default async function ClientNutritionDayPage({
  params,
}: {
  params: Promise<{ id: string; date: string }>;
}) {
  const { id, date } = await params;
  const trainer = await requireTrainer();

  const day = parseDayParam(date);
  if (!day) notFound();

  const [client, log, plan] = await Promise.all([
    prisma.user.findFirst({
      where: { id, trainerId: trainer.id, role: "CLIENT" },
      select: { id: true, name: true },
    }),
    // Ownership lives in the where clause, not a separate check: the nested
    // `client: { trainerId }` means another coach's day is a miss rather than
    // a lookup that confirms it exists.
    prisma.nutritionLog.findFirst({
      where: { clientId: id, date: day, client: { trainerId: trainer.id } },
      include: { foods: { orderBy: { order: "asc" } } },
    }),
    prisma.nutritionPlan.findFirst({
      where: { clientId: id, trainerId: trainer.id },
      orderBy: { assignedAt: "desc" },
      include: {
        meals: {
          orderBy: { order: "asc" },
          include: { foods: { orderBy: { order: "asc" } } },
        },
      },
    }),
  ]);

  if (!client) notFound();

  // Opening the log clears its unread flag, exactly as opening a completed
  // session does on /workouts/[id]. Scoped to this log's own feed item, so a
  // day with nothing logged can't clear anything.
  if (log) {
    await prisma.feedItem.updateMany({
      where: { nutritionLogId: log.id, read: false },
      data: { read: true },
    });
  }

  const targets = plan
    ? {
        calories: plan.targetCalories,
        protein: plan.targetProtein,
        carbs: plan.targetCarbs,
        fat: plan.targetFat,
      }
    : null;

  return (
    <Container className="max-w-5xl">
      <Link
        href={`/clients/${client.id}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {client.name}
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="Nutrition" title={formatDateLong(day)}>
          <span className="metric">{client.name}</span>
        </PageHeading>
      </div>

      {/* Actual and prescribed on one screen, which is the entire point of the
          page — a total means nothing without the number it was aiming at. */}
      <div className="mt-7 grid gap-8 lg:grid-cols-2 lg:items-start">
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">
            What they ate
          </h2>
          {log ? (
            <NutritionLogView log={log} targets={targets} />
          ) : (
            <Card className="p-5">
              <p className="text-sm text-ink-soft">
                Nothing logged for this day.
              </p>
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">
            Their plan
          </h2>
          {plan ? (
            <NutritionPlanView plan={plan} />
          ) : (
            <Card className="p-5">
              <p className="text-sm text-ink-soft">
                No plan assigned.{" "}
                <Link href="/nutrition" className="text-jade-strong hover:underline">
                  Assign one
                </Link>
                .
              </p>
            </Card>
          )}
        </section>
      </div>
    </Container>
  );
}
