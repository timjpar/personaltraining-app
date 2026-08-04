import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading } from "@/components/ui";
import { NutritionBuilder } from "@/components/NutritionBuilder";
import { updateNutritionTemplate } from "../../actions";

export default async function EditNutritionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainer = await requireTrainer();

  const plan = await prisma.nutritionPlan.findFirst({
    where: { id, trainerId: trainer.id, clientId: null },
    include: {
      meals: {
        orderBy: { order: "asc" },
        include: { foods: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!plan) notFound();

  return (
    <Container className="max-w-3xl">
      <Link
        href={`/nutrition/${plan.id}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {plan.title}
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="Edit plan" title={plan.title}>
          Changes here don&rsquo;t touch plans you&rsquo;ve already assigned.
        </PageHeading>
      </div>

      <div className="mt-7">
        <NutritionBuilder
          action={updateNutritionTemplate.bind(null, plan.id)}
          submitLabel="Save changes"
          cancelHref={`/nutrition/${plan.id}`}
          initial={{
            title: plan.title,
            notes: plan.notes,
            targetCalories: plan.targetCalories,
            targetProtein: plan.targetProtein,
            targetCarbs: plan.targetCarbs,
            targetFat: plan.targetFat,
            meals: plan.meals.map((m) => ({
              name: m.name,
              foods: m.foods.map((f) => ({
                name: f.name,
                quantity: f.quantity,
                calories: f.calories,
                protein: f.protein,
                carbs: f.carbs,
                fat: f.fat,
              })),
            })),
          }}
        />
      </div>
    </Container>
  );
}
