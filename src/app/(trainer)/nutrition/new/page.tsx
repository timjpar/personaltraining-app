import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading } from "@/components/ui";
import { NutritionBuilder } from "@/components/NutritionBuilder";
import { createNutritionTemplate } from "../actions";

// Whole positive integers only. A target arriving as "-1" or "2e9" from a
// hand-edited URL reads as absent rather than as a number the builder then
// shows back as though a coach typed it.
function targetParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 100_000) return undefined;
  return Math.trunc(n);
}

export default async function NewNutritionPage({
  searchParams,
}: {
  searchParams: Promise<{
    kcal?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    title?: string;
    client?: string;
  }>;
}) {
  const trainer = await requireTrainer();
  const sp = await searchParams;

  // Prefilled targets arrive in the query string from a client's suggested
  // targets card. Nothing is written here — this is still an ordinary new
  // template, and the coach can change every figure before saving.
  const targetCalories = targetParam(sp.kcal);
  const targetProtein = targetParam(sp.protein);
  const targetCarbs = targetParam(sp.carbs);
  const targetFat = targetParam(sp.fat);
  const prefilled = targetCalories != null;

  // Only to say whose numbers these were, and to offer the way back. Scoped to
  // this trainer's roster like every other client lookup.
  const from = sp.client
    ? await prisma.user.findFirst({
        where: { id: sp.client, trainerId: trainer.id, role: "CLIENT" },
        select: { id: true, name: true },
      })
    : null;

  return (
    <Container className="max-w-3xl">
      <Link
        href={from ? `/clients/${from.id}/profile` : "/nutrition"}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {from ? from.name : "Nutrition"}
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="New plan" title="Build a meal plan">
          {prefilled ? (
            <>
              Targets are filled in from{" "}
              {from ? `${from.name.split(/\s+/)[0]}’s` : "the suggested"} numbers
              — change any of them. Add meals and the foods in them; calories
              and macros total up as you type.
            </>
          ) : (
            <>
              Add meals and the foods in them. Calories and macros total up as
              you type — you&rsquo;ll assign clients after saving.
            </>
          )}
        </PageHeading>
      </div>

      <div className="mt-7">
        <NutritionBuilder
          action={createNutritionTemplate}
          submitLabel="Save plan"
          cancelHref={from ? `/clients/${from.id}/profile` : "/nutrition"}
          initial={{
            title: sp.title?.slice(0, 120) || undefined,
            targetCalories,
            targetProtein,
            targetCarbs,
            targetFat,
          }}
        />
      </div>
    </Container>
  );
}
