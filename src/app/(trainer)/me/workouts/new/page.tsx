import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { getPickerCatalog } from "@/lib/exercise-catalog";
import { Container, PageHeading } from "@/components/ui";
import { WorkoutBuilder } from "@/components/WorkoutBuilder";
import { createMyWorkout } from "@/app/(trainer)/me/actions";
import { toDateInput } from "@/lib/format";

// Writing yourself a one-off session — the /me twin of
// /clients/[id]/workouts/new, and the same builder with the client half of the
// question already answered.
//
// It exists because assigning from the library is only half an answer: a coach
// with an empty library who wants to program themselves a session on Thursday
// would otherwise have to save a template first, which is a step they'd never
// need for an athlete.
export default async function NewOwnWorkoutPage() {
  const trainer = await requireTrainer();

  const catalog = await getPickerCatalog(trainer.id);

  return (
    <Container className="max-w-3xl">
      <Link
        href="/me/workouts"
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ Your training
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="New session" title="Program for yourself">
          Set the day, then add each movement with its prescription. It lands on
          your own list, not on anyone&rsquo;s roster.
        </PageHeading>
      </div>

      <div className="mt-7">
        <WorkoutBuilder
          action={createMyWorkout}
          submitLabel="Save session"
          cancelHref="/me/workouts"
          catalog={catalog}
          initial={{ scheduledDate: toDateInput(new Date()) }}
        />
      </div>
    </Container>
  );
}
