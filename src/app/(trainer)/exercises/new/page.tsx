import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { Container, PageHeading } from "@/components/ui";
import { CustomExerciseForm } from "@/components/CustomExerciseForm";

export default async function NewCustomExercisePage() {
  // Trainer-gated like the list it writes to — a client has no catalog of their
  // own for this to add to.
  await requireTrainer();

  return (
    <Container className="max-w-3xl">
      <Link
        href="/exercises"
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ Exercises
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="New exercise" title="Add a custom movement">
          A machine variation, a nickname your gym uses, anything the built-in
          list doesn&rsquo;t have. It joins the exercise picker straight away, so
          you can program it into any session.
        </PageHeading>
      </div>

      <div className="mt-7">
        <CustomExerciseForm />
      </div>
    </Container>
  );
}
