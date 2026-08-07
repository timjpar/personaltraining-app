import { requireUser } from "@/lib/auth";
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
import { getPickerCatalog, EMPTY_CATALOG } from "@/lib/exercise-catalog";
import {
  normalizeExerciseName,
  PRESET_SLUGS,
  PRESET_NAMES,
} from "@/lib/exercise-presets";
import { relativeTime } from "@/lib/format";
import { ROLES } from "@/lib/constants";

export default async function ExercisesPage() {
  // requireUser, not requireTrainer: this is a reference page both roles read.
  // The management block below is gated on the role, and every action it calls
  // gates itself again with requireTrainer.
  const user = await requireUser();
  const isTrainer = user.role === ROLES.TRAINER;

  // A client has no exercise catalog of their own, so they pay for no queries.
  const [rows, catalog] = isTrainer
    ? await Promise.all([
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
      ])
    : [[], EMPTY_CATALOG] as const;

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
          isTrainer ? (
            <ButtonLink href="/library/new" variant="outline" size="sm">
              Build a workout
            </ButtonLink>
          ) : undefined
        }
      >
        {PRESET_NAMES.length} movements, grouped by how you&rsquo;d train them —
        strength, cardio, climbing and mobility.{" "}
        {isTrainer
          ? "Every one of them is in the exercise picker, so you can program any of them straight into a session."
          : "Tap any movement to see how it's done."}
      </PageHeading>

      <ExerciseCatalog custom={customMovements} />

      {isTrainer ? (
        <>
          <div className="mt-12 border-t border-line pt-9">
            <ExerciseMediaManager catalog={catalog} rows={withMedia} />
          </div>

          <h2 className="mt-9 font-display text-base font-semibold text-ink">
            Your custom movements
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Any exercise you type that isn&rsquo;t one of the built-in movements
            gets saved here automatically. Removing one doesn&rsquo;t change
            workouts you&rsquo;ve already written — and it comes back if you
            program it again.
          </p>

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
                      discipline={row.discipline}
                      lastUsed={relativeTime(row.lastUsedAt)}
                    />
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </>
      ) : null}
    </Container>
  );
}
