import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { completeMyWorkout } from "@/app/(trainer)/me/actions";
import { Container, PageHeading, Card, Badge, ButtonLink } from "@/components/ui";
import {
  PrescriptionCard,
  SectionHeading,
  exerciseMetrics,
  loggedResult,
  type Demo,
} from "@/components/PrescriptionCard";
import { groupBySection, usesSections } from "@/lib/workout-form";
import {
  DISCIPLINE_LABELS,
  WORKOUT_STATUS,
  toDiscipline,
  toUnits,
} from "@/lib/constants";
import { getExerciseMedia } from "@/lib/exercise-catalog";
import { getLastResults } from "@/lib/exercise-history";
import { logHints } from "@/lib/exercise-progression";
import { normalizeExerciseName } from "@/lib/exercise-presets";
import { demoSearchUrl } from "@/lib/exercise-archetypes";
import { RpeMeter } from "@/components/RpeMeter";
import { WorkoutLogForm } from "@/components/WorkoutLogForm";
import { formatDate, relativeTime } from "@/lib/format";
import { formatTime } from "@/lib/calendar";

// One of the coach's own sessions — the athlete's page at /my/workouts/[id],
// pointed at the person reading it.
//
// A near-copy of that file rather than a shared component, and the difference
// is worth stating: the two are the same *today* and are not the same feature.
// The athlete's copy is the receiving end of a coaching relationship and grows
// things that only make sense there; this one is a coach logging their own
// training. The two pieces that actually carry weight — the prescription card
// and the log form — are already shared, and those are the ones that would hurt
// to duplicate.
//
// Two things from the athlete's version are deliberately gone. There is no
// coach's-response card, because the coach here is the athlete: a reply to
// yourself is a note you already read while writing it. And the "your coach has
// been notified" line is gone with it — nobody was notified, by design (see
// completeMyWorkout).
//
// What it gains is the Edit link. On the athlete's side the prescription is
// somebody else's to change; here the reader wrote it, so the builder is one
// tap away.
export default async function MyWorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { id } = await params;
  const { done } = await searchParams;
  const trainer = await requireTrainer();

  // Scoped on clientId, not trainerId: this page is the *athlete* end of the
  // session, and the two are only the same row for a session assigned to self.
  // A coach who opened this URL with a client's workout id would otherwise land
  // on a log form for somebody else's training.
  const workout = await prisma.workout.findFirst({
    where: { id, clientId: trainer.id },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!workout) notFound();

  const isCompleted = workout.status === WORKOUT_STATUS.COMPLETED;
  const showSections = usesSections(workout.exercises);

  const names = workout.exercises.map((e) => e.name);

  // One query each for the whole session rather than one per row. Media: the
  // coach's own attached demos, which are the same catalog they built for the
  // roster. History: what they last logged against these movements, only worth
  // asking for on a session still being logged.
  const [media, lastResults] = await Promise.all([
    getExerciseMedia(workout.trainerId, names),
    isCompleted ? undefined : getLastResults(trainer.id, workout.id, names),
  ]);

  const units = toUnits(trainer.units);

  const demoFor = (name: string): Demo => {
    const own = media.get(normalizeExerciseName(name));
    if (own) return { own: true, url: own.url };
    return { own: false, url: demoSearchUrl(name) };
  };

  return (
    <Container className="max-w-3xl">
      <Link
        href="/me/workouts"
        className="metric -ml-2 inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ Your training
      </Link>

      <div className="mt-1 sm:mt-3">
        <PageHeading
          eyebrow={
            isCompleted
              ? `Completed ${relativeTime(workout.completedAt ?? new Date())}`
              : `Scheduled ${formatDate(workout.scheduledDate)}${
                  workout.startMinute == null
                    ? ""
                    : `, ${formatTime(workout.startMinute)}`
                }`
          }
          title={workout.title}
          action={
            !isCompleted ? (
              // The trainer-side builder, which already accepts this row: it
              // scopes on trainerId, and on a self-assigned session that is
              // this account. Saving there redirects to /workouts/<id>, which
              // sends a self session straight back here.
              <ButtonLink
                href={`/workouts/${workout.id}/edit`}
                variant="outline"
                size="sm"
              >
                Edit
              </ButtonLink>
            ) : null
          }
        >
          <Badge>{DISCIPLINE_LABELS[toDiscipline(workout.discipline)]}</Badge>
        </PageHeading>
      </div>

      {done ? (
        <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-card)] border border-jade/30 bg-jade-wash/50 p-4">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-jade text-white">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M4 11 L8 15 L16 5"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Nice work — logged.</p>
            <p className="text-sm text-ink-soft">
              It&rsquo;s on your own record. Nobody on your roster was notified.
            </p>
          </div>
        </div>
      ) : null}

      {isCompleted ? (
        <div className="mt-6 flex flex-col gap-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="eyebrow text-ink-soft">Your effort</p>
                <div className="mt-2">
                  {workout.rpe != null ? (
                    <RpeMeter value={workout.rpe} />
                  ) : (
                    <span className="text-sm text-ink-soft">Not rated</span>
                  )}
                </div>
              </div>
              <Badge tone="jade">Logged</Badge>
            </div>
            {workout.clientComment ? (
              <p className="mt-4 border-l-2 border-jade/30 pl-3.5 text-sm leading-relaxed text-ink">
                {workout.clientComment}
              </p>
            ) : null}
          </Card>

          <div className="flex flex-col gap-6">
            {groupBySection(workout.exercises).map((group) => (
              <div key={group.section}>
                {showSections ? (
                  <SectionHeading label={group.label} count={group.rows.length} />
                ) : null}
                <ul className="flex flex-col gap-3">
                  {group.rows.map((ex) => (
                    <li key={ex.id}>
                      <PrescriptionCard
                        index={ex.order}
                        name={ex.name}
                        metrics={exerciseMetrics(ex)}
                        notes={ex.notes}
                        demo={demoFor(ex.name)}
                        logged={ex.done}
                        footer={loggedResult({
                          label: "You logged",
                          sets: ex.resultSets,
                          reps: ex.resultReps,
                          load: ex.resultLoad,
                        })}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <WorkoutLogForm
            action={completeMyWorkout.bind(null, workout.id)}
            notes={workout.notes}
            self
            exercises={workout.exercises.map((ex) => ({
              ...ex,
              demo: demoFor(ex.name),
              hints: logHints({
                name: ex.name,
                last: lastResults?.get(normalizeExerciseName(ex.name)),
                units,
              }),
            }))}
          />
        </div>
      )}
    </Container>
  );
}
