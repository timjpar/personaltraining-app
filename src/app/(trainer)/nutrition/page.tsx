import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, ButtonLink, EmptyState } from "@/components/ui";

export default async function NutritionPage() {
  const trainer = await requireTrainer();

  const plans = await prisma.nutritionPlan.findMany({
    where: { trainerId: trainer.id, clientId: null },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { meals: true } } },
  });

  return (
    <Container>
      <PageHeading
        eyebrow="Nutrition library"
        title="Nutrition"
        action={<ButtonLink href="/nutrition/new">New plan</ButtonLink>}
      >
        Reusable meal plans with per-food macros. Build one now and assign it to
        clients whenever you like.
      </PageHeading>

      <div className="mt-7">
        {plans.length === 0 ? (
          <EmptyState
            title="No plans yet"
            action={
              <ButtonLink href="/nutrition/new" size="sm">
                New plan
              </ButtonLink>
            }
          >
            Build a meal plan — foods carry their calories and macros, and the
            daily totals add up as you go.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {plans.map((p) => (
              <Link
                key={p.id}
                href={`/nutrition/${p.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                  <p className="metric mt-0.5 text-xs text-ink-soft">
                    {p._count.meals} meal{p._count.meals === 1 ? "" : "s"}
                    {p.targetCalories != null ? ` · ${p.targetCalories} kcal target` : ""}
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
