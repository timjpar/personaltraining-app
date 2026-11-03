import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { getPickerCatalog } from "@/lib/exercise-catalog";
import { Container } from "@/components/ui";
import { WorkoutBuilder } from "@/components/WorkoutBuilder";
import { createTemplate } from "../actions";

export default async function NewTemplatePage() {
  const trainer = await requireTrainer();
  const catalog = await getPickerCatalog(trainer.id);

  return (
    <Container className="max-w-3xl">
      <Link href="/library" className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1">
        ‹ Workouts
      </Link>

      <div className="mt-3">
        <WorkoutBuilder
          heading={{
            eyebrow: "New workout",
            title: "Build a workout",
            intro: (
              <>
                Save a reusable session. Add each movement with its prescription —
                you&rsquo;ll pick the date when you assign it.
              </>
            ),
          }}
          action={createTemplate}
          submitLabel="Save workout"
          cancelHref="/library"
          showDate={false}
          catalog={catalog}
        />
      </div>
    </Container>
  );
}
