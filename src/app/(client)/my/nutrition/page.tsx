import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, EmptyState } from "@/components/ui";
import { NutritionPlanView } from "@/components/NutritionPlanView";
import { formatDate } from "@/lib/format";

export default async function ClientNutritionPage() {
  const client = await requireClient();

  // The current plan is the most recently assigned one.
  const plan = await prisma.nutritionPlan.findFirst({
    where: { clientId: client.id },
    orderBy: { assignedAt: "desc" },
    include: {
      meals: {
        orderBy: { order: "asc" },
        include: { foods: { orderBy: { order: "asc" } } },
      },
    },
  });

  return (
    <Container className="max-w-3xl">
      <PageHeading
        eyebrow="Nutrition"
        title={plan ? plan.title : "Nutrition"}
      >
        {plan
          ? plan.assignedAt
            ? `Your plan since ${formatDate(plan.assignedAt)}.`
            : "Your current plan."
          : "Your nutrition plan will show up here."}
      </PageHeading>

      <div className="mt-7">
        {plan ? (
          <NutritionPlanView plan={plan} />
        ) : (
          <EmptyState title="No plan yet">
            When your coach assigns a meal plan, it&rsquo;ll appear here with your
            daily targets and macros.
          </EmptyState>
        )}
      </div>
    </Container>
  );
}
