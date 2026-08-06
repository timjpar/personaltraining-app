import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Container,
  PageHeading,
  ButtonLink,
  EmptyState,
} from "@/components/ui";
import { NutritionPlanView } from "@/components/NutritionPlanView";
import { AssignClients } from "@/components/AssignClients";
import { DeleteWorkoutForm } from "@/components/DeleteWorkoutForm";
import { deleteNutritionTemplate, assignNutritionPlan } from "../actions";

export default async function NutritionPlanPage({
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

  const clients = await prisma.user.findMany({
    where: { trainerId: trainer.id, role: "CLIENT" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <Container className="max-w-3xl">
      <Link href="/nutrition" className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1">
        ‹ Nutrition
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow="Meal plan"
          title={plan.title}
          action={
            <div className="flex items-center gap-2">
              <ButtonLink
                href={`/nutrition/${plan.id}/edit`}
                variant="outline"
                size="sm"
              >
                Edit
              </ButtonLink>
              <DeleteWorkoutForm
                action={deleteNutritionTemplate.bind(null, plan.id)}
                confirmMessage="Delete this meal plan? Plans already assigned to clients stay with them. This can't be undone."
              />
            </div>
          }
        >
          <span className="metric">
            {plan.meals.length} meal{plan.meals.length === 1 ? "" : "s"}
          </span>
        </PageHeading>
      </div>

      <div className="mt-6">
        <NutritionPlanView plan={plan} />
      </div>

      <div className="mt-9">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">
          Assign to clients
        </h2>
        <p className="mb-3 text-sm text-ink-soft">
          Each client gets their own copy — it becomes their current plan.
        </p>
        {clients.length === 0 ? (
          <EmptyState
            title="No clients yet"
            action={
              <ButtonLink href="/clients" size="sm">
                Add a client
              </ButtonLink>
            }
          >
            Add clients, then hand them this plan in a click.
          </EmptyState>
        ) : (
          <AssignClients
            action={assignNutritionPlan.bind(null, plan.id)}
            clients={clients}
            submitLabel="Assign plan"
          />
        )}
      </div>
    </Container>
  );
}
