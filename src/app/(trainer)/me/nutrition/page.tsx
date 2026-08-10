import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { Container, PageHeading } from "@/components/ui";
import { MyNutritionDay } from "./day";

// The coach's own food log, today.
//
// Deliberately not a redirect to /me/nutrition/<today>, for the reason the
// athlete's copy gives: a destination that changes its own URL the moment you
// arrive breaks the back button.
export default async function MyOwnNutritionPage() {
  const trainer = await requireTrainer();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Container className="max-w-5xl">
      <Link
        href="/me"
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ You
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="Your nutrition" title="Today">
          Your own log. Nobody on your roster sees it.
        </PageHeading>
      </div>

      <div className="mt-7">
        <MyNutritionDay trainerId={trainer.id} day={today} />
      </div>
    </Container>
  );
}
