import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { Container, PageHeading } from "@/components/ui";
import { NutritionBuilder } from "@/components/NutritionBuilder";
import { createNutritionTemplate } from "../actions";

export default async function NewNutritionPage() {
  await requireTrainer();

  return (
    <Container className="max-w-3xl">
      <Link href="/nutrition" className="metric text-xs text-ink-soft hover:text-ink">
        ‹ Nutrition
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="New plan" title="Build a meal plan">
          Add meals and the foods in them. Calories and macros total up as you
          type — you&rsquo;ll assign clients after saving.
        </PageHeading>
      </div>

      <div className="mt-7">
        <NutritionBuilder
          action={createNutritionTemplate}
          submitLabel="Save plan"
          cancelHref="/nutrition"
        />
      </div>
    </Container>
  );
}
