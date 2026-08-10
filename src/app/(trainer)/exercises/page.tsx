import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Container,
  PageHeading,
  Card,
  EmptyState,
  ButtonLink,
} from "@/components/ui";
import { ExerciseCatalog, type CustomMovement } from "@/components/ExerciseCatalog";
import { CustomExerciseRow } from "@/components/CustomExerciseRow";
import { ExerciseMediaManager } from "@/components/ExerciseMediaManager";
import { getPickerCatalog } from "@/lib/exercise-catalog";
import {
  normalizeExerciseName,
  PRESET_SLUGS,
  PRESET_NAMES,
} from "@/lib/exercise-presets";
import { relativeTime } from "@/lib/format";

export default async function ExercisesPage() {
  // Trainer-only, like the rest of this route group. It reads as a reference
  // page, but everything below the catalog writes to the trainer's own
  // movements — and a client has no catalog for any of it to act on.
  const user = await requireTrainer();

  const [rows, catalog] = await Promise.all([
    prisma.trainerExercise.findMany({
      where: { trainerId: user.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        discipline: true,
        lastUsedAt: true,
        mediaUrl: true,
        mediaKind: true,
      },
    }),
    getPickerCatalog(user.id),
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

  const customMovements: CustomMovement[] = custom.map((r) => ({
    name: r.name,
    discipline: r.discipline,
  }));

  return (
    <Container className="max-w-3xl">
      <PageHeading
        eyebrow="Exercise library"
        title="Exercises"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ButtonLink href="/library/new" variant="outline" size="sm">
              Build a workout
            </ButtonLink>
            <ButtonLink href="/exercises/new" size="sm">
              New exercise
            </ButtonLink>
          </div>
        }
      >
        Attach a demo video to any movement and keep your own exercises here.
        The full list of built-in movements is further down.
      </PageHeading>

      <div className="mt-6">
        <ExerciseMediaManager catalog={catalog} rows={withMedia} />
      </div>

      <h2 className="mt-9 font-display text-base font-semibold text-ink">
        Your custom movements
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Add one here, or just type it into a workout — any exercise that
        isn&rsquo;t one of the built-in movements gets saved to this list either
        way. Removing one doesn&rsquo;t change workouts you&rsquo;ve already
        written — and it comes back if you program it again.
      </p>

      <div className="mt-3">
        {custom.length === 0 ? (
          <EmptyState
            title="Nothing custom yet"
            action={
              <ButtonLink href="/exercises/new" size="sm">
                New exercise
              </ButtonLink>
            }
          >
            A machine variation, a nickname your gym uses — add it here, or type
            it into a session and it will show up on its own.
          </EmptyState>
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {custom.map((row) => (
                <CustomExerciseRow
                  key={row.id}
                  id={row.id}
                  name={row.name}
                  discipline={row.discipline}
                  lastUsed={relativeTime(row.lastUsedAt)}
                />
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="mt-12 border-t border-line pt-9">
        <h2 className="font-display text-base font-semibold text-ink">
          All movements
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {/* One expression, so JSX can't trim the space between the count and
              the noun the way it does after a bare {expr} at a line break. */}
          {`${PRESET_NAMES.length} movements`}, grouped by how you&rsquo;d train
          them — strength, cardio, climbing and mobility. Every one of them is in
          the exercise picker, so you can program any of them straight into a
          session.
        </p>

        <ExerciseCatalog custom={customMovements} />
      </div>
    </Container>
  );
}
