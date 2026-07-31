import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { Container, PageHeading } from "@/components/ui";
import { WorkoutBuilder } from "@/components/WorkoutBuilder";
import { createTemplate } from "../actions";

export default async function NewTemplatePage() {
  await requireTrainer();

  return (
    <Container className="max-w-3xl">
      <Link href="/library" className="metric text-xs text-ink-soft hover:text-ink">
        ‹ Workouts
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="New workout" title="Build a workout">
          Save a reusable session. Add each movement with its prescription —
          you&rsquo;ll pick the date when you assign it.
        </PageHeading>
      </div>

      <div className="mt-7">
        <WorkoutBuilder
          action={createTemplate}
          submitLabel="Save workout"
          cancelHref="/library"
          showDate={false}
        />
      </div>
    </Container>
  );
}
