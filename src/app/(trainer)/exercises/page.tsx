import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, EmptyState, ButtonLink } from "@/components/ui";
import { CustomExerciseRow } from "@/components/CustomExerciseRow";
import { ExerciseMediaManager } from "@/components/ExerciseMediaManager";
import { getPickerCatalog } from "@/lib/exercise-catalog";
import { normalizeExerciseName, PRESET_SLUGS, PRESET_NAMES } from "@/lib/exercise-presets";
import { relativeTime } from "@/lib/format";

export default async function ExercisesPage() {
  const trainer = await requireTrainer();

  const [rows, catalog] = await Promise.all([
    prisma.trainerExercise.findMany({
      where: { trainerId: trainer.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        mediaUrl: true,
        mediaKind: true,
      },
    }),
    getPickerCatalog(trainer.id),
  ]);

  const withMedia = rows
    .filter((r) => r.mediaUrl)
    .map((r) => ({
      id: r.id,
      name: r.name,
      mediaUrl: r.mediaUrl as string,
      mediaKind: r.mediaKind ?? "LINK",
    }));

  // Custom is computed rather than stored, so a name that later ships as a
  // preset leaves this list on its own instead of appearing in both places.
  const custom = rows.filter(
    (r) => !PRESET_SLUGS.has(normalizeExerciseName(r.name)),
  );

  return (
    <Container className="max-w-3xl">
      <Link href="/library" className="metric text-xs text-ink-soft hover:text-ink">
        ‹ Workouts
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow="Exercise library"
          title="My exercises"
          action={
            <ButtonLink href="/library/new" variant="outline" size="sm">
              Build a workout
            </ButtonLink>
          }
        >
          Any exercise you type that isn&rsquo;t one of the {PRESET_NAMES.length}{" "}
          built-in movements gets saved here automatically, ready to reuse.
          Removing one here doesn&rsquo;t change workouts you&rsquo;ve already
          written — and it comes back if you program it again.
        </PageHeading>
      </div>

      <div className="mt-7">
        <ExerciseMediaManager catalog={catalog} rows={withMedia} />
      </div>

      <h2 className="mt-9 font-display text-base font-semibold text-ink">
        Your custom movements
      </h2>

      <div className="mt-3">
        {custom.length === 0 ? (
          <EmptyState
            title="Nothing custom yet"
            action={
              <ButtonLink href="/library/new" size="sm">
                Build a workout
              </ButtonLink>
            }
          >
            Type a movement the built-in list doesn&rsquo;t have — a machine
            variation, a nickname your gym uses — and it will show up here.
          </EmptyState>
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {custom.map((row) => (
                <CustomExerciseRow
                  key={row.id}
                  id={row.id}
                  name={row.name}
                  lastUsed={relativeTime(row.lastUsedAt)}
                />
              ))}
            </ul>
          </Card>
        )}
      </div>
    </Container>
  );
}
