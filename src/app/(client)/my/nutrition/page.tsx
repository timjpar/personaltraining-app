import { requireClient } from "@/lib/auth";
import { Container, PageHeading } from "@/components/ui";
import { NutritionDay } from "./day";

// Today's log, with the coach's plan alongside. This page used to be the plan
// on its own; the plan is still here, but reading it was never the job an
// athlete opened the Nutrition tab to do.
//
// Deliberately not a redirect to /my/nutrition/<today>: this is a tab-bar
// destination, and a tab that changes its own URL the moment you arrive breaks
// the back button and makes the active-pill match a moving target.
export default async function ClientNutritionPage() {
  const client = await requireClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Container className="max-w-5xl">
      <PageHeading eyebrow="Nutrition" title="Today">
        Log what you ate. Your coach sees it with their daily summary.
      </PageHeading>

      <div className="mt-7">
        <NutritionDay clientId={client.id} day={today} />
      </div>
    </Container>
  );
}
