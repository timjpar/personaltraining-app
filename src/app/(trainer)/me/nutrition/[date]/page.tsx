import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { Container, PageHeading } from "@/components/ui";
import { parseDayParam } from "@/lib/calendar";
import { formatDateLong } from "@/lib/format";
import { MyNutritionDay } from "../day";

// Any day that isn't today. Same body as /me/nutrition — the two routes differ
// only in which date they resolve.
export default async function MyOwnNutritionDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const trainer = await requireTrainer();

  // Same guard as the calendar's day page: the regex rejects the likes of
  // 2026-02-31, which Date would happily roll forward into March.
  const day = parseDayParam(date);
  if (!day) notFound();

  return (
    <Container className="max-w-5xl">
      <Link
        href="/me/nutrition"
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ Today
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="Your nutrition" title={formatDateLong(day)}>
          What you ate this day.
        </PageHeading>
      </div>

      <div className="mt-7">
        <MyNutritionDay trainerId={trainer.id} day={day} />
      </div>
    </Container>
  );
}
