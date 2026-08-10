// A meal plan read by an owner rather than by the coach who wrote it. Its own
// page for the same reason /admin/workouts/[id] is: /nutrition/[id] scopes its
// lookup by the *signed-in* trainer's id, so it notFound()s on another coach's
// plan, and src/proxy.ts fences /nutrition into the trainer area besides.
//
// That route also filters `clientId: null`, because a coach's library only ever
// holds unassigned plans. This one deliberately doesn't: the account page lists
// every plan the trainer owns, assigned copies included, so filtering here
// would 404 exactly the rows most worth opening.
//
// Read-only: no Edit, no Delete, no "assign to clients". An admin reads;
// programming stays with the coach.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Container, PageHeading } from "@/components/ui";
import { NutritionPlanView } from "@/components/NutritionPlanView";
import { formatStamp } from "@/lib/format";

export default async function AdminNutritionPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  // No trainerId filter, and that's the point: requireAdmin() above is the
  // authorization, so scoping the lookup as well would defeat the page.
  const plan = await prisma.nutritionPlan.findUnique({
    where: { id },
    include: {
      trainer: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
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
        href={`/admin/users/${plan.trainerId}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {plan.trainer.name}
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow={
            plan.client
              ? `Assigned${plan.assignedAt ? ` ${formatStamp(plan.assignedAt)}` : ""}`
              : "Library plan"
          }
          title={plan.title}
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="metric">
              {plan.meals.length} meal{plan.meals.length === 1 ? "" : "s"}
            </span>
            {plan.client ? (
              <Link
                href={`/admin/users/${plan.client.id}`}
                className="metric hover:text-jade-strong"
              >
                {plan.client.name}
              </Link>
            ) : null}
          </span>
        </PageHeading>
      </div>

      <div className="mt-6">
        <NutritionPlanView plan={plan} />
      </div>
    </Container>
  );
}
