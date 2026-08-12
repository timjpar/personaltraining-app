import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Container, PageHeading, ButtonLink } from "@/components/ui";
import { BodyStats } from "@/components/BodyStats";
import { BodyTrend } from "@/components/BodyTrend";
import { MacroBar } from "@/components/MacroBar";
import { dailyTargets, suggestTargets, targetInputsFrom } from "@/lib/body";
import { sumMacros } from "@/lib/nutrition-form";
import { toBodyRows } from "@/lib/metrics";
import { toUnits, WORKOUT_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { formatTime } from "@/lib/calendar";

// The coach's own corner of the app: the same body and nutrition tracking their
// athletes get, kept on themselves.
//
// Everything it holds already existed — Measurement, NutritionLog and
// ClientProfile all hang off a plain User id with no role attached — so this is
// a place to stand rather than a new subsystem. What it deliberately does not
// do is put a coach on their own roster: there is no feed item, no digest entry
// and no coach above them reading any of it. See me/actions.ts.
//
// A hub rather than one of the two pages promoted to the tab, because both
// halves are things you glance at daily and only one can be the tab. Each card
// shows the figure worth glancing at and gets out of the way.
export default async function MePage() {
  const trainer = await requireTrainer();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [profile, measurements, log, nextSession, loggedCount, plan] =
    await Promise.all([
      prisma.clientProfile.findUnique({ where: { userId: trainer.id } }),
      // Whole rows, tape-only entries included, and deep enough for the chart's
      // 1Y range. This card used to want two columns for a sparkline.
      prisma.measurement.findMany({
        where: { clientId: trainer.id },
        orderBy: { date: "desc" },
        take: 400,
      }),
      prisma.nutritionLog.findUnique({
        where: { clientId_date: { clientId: trainer.id, date: today } },
        include: {
          foods: {
            select: { calories: true, protein: true, carbs: true, fat: true },
          },
        },
      }),
      // The soonest session still to do, including one scheduled for a day
      // that has been and gone: a workout you didn't get to on Tuesday is
      // still the next thing you owe yourself, and hiding it behind a date
      // filter is how it stops existing.
      prisma.workout.findFirst({
        where: { clientId: trainer.id, status: { not: WORKOUT_STATUS.COMPLETED } },
        orderBy: { scheduledDate: "asc" },
        include: { _count: { select: { exercises: true } } },
      }),
      prisma.workout.count({
        where: { clientId: trainer.id, status: WORKOUT_STATUS.COMPLETED },
      }),
      // The coach's own meal plan, if they've assigned themselves one — same
      // "newest assignedAt wins" rule every other current-plan read uses.
      prisma.nutritionPlan.findFirst({
        where: { clientId: trainer.id },
        orderBy: { assignedAt: "desc" },
        select: {
          title: true,
          targetCalories: true,
          targetProtein: true,
          targetCarbs: true,
          targetFat: true,
        },
      }),
    ]);

  const units = toUnits(trainer.units);

  const weighIns = measurements.filter(
    (m): m is typeof m & { weightKg: number } => m.weightKg != null,
  );
  const current = weighIns[0] ?? null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const window = weighIns.filter((m) => m.date >= cutoff);
  const previous = window[window.length - 1] ?? null;

  // Same derivation the food log measures against, and the same reason it isn't
  // stored: a pure function of the file and the newest weigh-in. An assigned
  // plan outranks it — see dailyTargets.
  const { inputs } = targetInputsFrom(profile, current);
  const suggested = inputs ? suggestTargets(inputs) : null;
  const planTargets = plan
    ? {
        calories: plan.targetCalories,
        protein: plan.targetProtein,
        carbs: plan.targetCarbs,
        fat: plan.targetFat,
      }
    : null;
  const targets = dailyTargets(
    planTargets,
    suggested && {
      calories: suggested.calories,
      protein: suggested.protein,
      carbs: suggested.carbs,
      fat: suggested.fat,
    },
  );
  // Which of the two won, so the line under the strip names the right source.
  // dailyTargets returns whichever object it picked, so identity answers it.
  const fromPlan = targets !== null && targets === planTargets;

  const totals = sumMacros(log ? [{ foods: log.foods }] : []);

  return (
    <Container>
      <PageHeading eyebrow="You" title={trainer.name.split(/\s+/)[0]}>
        Your own weigh-ins and food log, kept the same way your athletes keep
        theirs. Nobody else can see any of it.
      </PageHeading>

      {/* Stacked rather than side by side, which the first draft had. Both
          cards carry a four-cell stat strip, and the Container caps the page at
          1024px — split in two, each cell lands under 80px of content and
          "178.5 lb" wraps onto a second line. Full width is the shape the strip
          was built for, and it is what /me/body and /my/body both give it. */}
      <div className="mt-7 flex flex-col gap-5">
        {/* Training first. The other two cards are things you record about
            yourself; this is the thing you actually go and do, and it's the
            only one of the three with a deadline on it. */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-ink">
              Training
            </h2>
            <Link
              href="/me/workouts"
              className="metric shrink-0 text-xs text-jade-strong hover:underline"
            >
              All sessions ›
            </Link>
          </div>

          {nextSession ? (
            <div className="mt-3">
              <p className="eyebrow text-ink-soft/70">Up next</p>
              <p className="mt-1 font-display text-lg font-semibold text-ink">
                {nextSession.title}
              </p>
              <p className="metric mt-0.5 text-xs text-ink-soft">
                {formatDate(nextSession.scheduledDate)}
                {nextSession.startMinute == null
                  ? ""
                  : `, ${formatTime(nextSession.startMinute)}`}{" "}
                · {nextSession._count.exercises} exercise
                {nextSession._count.exercises === 1 ? "" : "s"}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              Nothing scheduled. You&rsquo;re on every assign list in your own{" "}
              <Link href="/library" className="text-jade-strong hover:underline">
                library
              </Link>{" "}
              and{" "}
              <Link href="/programs" className="text-jade-strong hover:underline">
                programs
              </Link>{" "}
              — tick &ldquo;Yourself&rdquo; to put a session on your own list.
            </p>
          )}

          {loggedCount > 0 ? (
            <p className="metric mt-3 text-xs text-ink-soft">
              {loggedCount} session{loggedCount === 1 ? "" : "s"} logged.
            </p>
          ) : null}

          <ButtonLink
            href={nextSession ? `/me/workouts/${nextSession.id}` : "/me/workouts/new"}
            size="sm"
            className="mt-4"
          >
            {nextSession ? "Start workout" : "Write a session"}
          </ButtonLink>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-ink">
              Body
            </h2>
            <Link
              href="/me/body"
              className="metric shrink-0 text-xs text-jade-strong hover:underline"
            >
              All weigh-ins ›
            </Link>
          </div>

          {current ? (
            <div className="mt-3">
              <BodyStats
                  currentKg={current.weightKg}
                  previousKg={
                    previous && previous !== current ? previous.weightKg : null
                  }
                  goalKg={profile?.goalWeightKg ?? null}
                  units={units}
                sinceLabel="in 30 days"
              />
            </div>
          ) : null}

          {/* The full chart, same as /me/body. This started as a sparkline on
              the argument that a glance shouldn't need a legend — but the chip
              row is the glance now: four metrics and a range, the rest folded
              away. It draws its own blank state, so the card no longer waits
              for a weigh-in before it shows anything. */}
          <div className="mt-4">
            <BodyTrend
              rows={toBodyRows(measurements)}
              heightCm={profile?.heightCm ?? null}
              goalWeightKg={profile?.goalWeightKg ?? null}
              possessive="your"
              units={units}
            />
          </div>

          {current ? (
            <p className="mt-3 text-xs text-ink-soft">
              Last weighed {formatDate(current.date)}.
            </p>
          ) : null}

          {/* Shown whether or not anything is logged. Saving a day you already
              have edits it, so "log" is the only verb either card needs. */}
          <ButtonLink href="/me/body" size="sm" className="mt-4">
            Log a weigh-in
          </ButtonLink>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-ink">
              Today&rsquo;s food
            </h2>
            {/* Both cards' corner links now go to a history, and the logging
                verb lives on the button underneath. Before, this one was the
                only way in to today's log and read "Log it ›" / "Edit ›",
                which made the two cards answer different questions from the
                same position. */}
            <Link
              href="/me/nutrition/history"
              className="metric shrink-0 text-xs text-jade-strong hover:underline"
            >
              All logs ›
            </Link>
          </div>

          <MacroBar className="mt-3" totals={totals} targets={targets} />

          {/* Three states, not two: the numbers over the strip now come from
              an assigned plan when there is one, and a figure whose source
              isn't named is a figure nobody can correct. */}
          <p className="mt-3 text-xs text-ink-soft">
            {fromPlan ? (
              <>
                Against{" "}
                <Link
                  href="/me/nutrition"
                  className="text-jade-strong hover:underline"
                >
                  {plan?.title}
                </Link>
                , the plan you assigned yourself.
              </>
            ) : targets ? (
              <>
                Against the targets derived from{" "}
                <Link
                  href="/me/profile"
                  className="text-jade-strong hover:underline"
                >
                  your file
                </Link>
                .
              </>
            ) : (
              <>
                <Link
                  href="/me/profile"
                  className="text-jade-strong hover:underline"
                >
                  Fill in your file
                </Link>{" "}
                to measure these against a target — or assign yourself a{" "}
                <Link
                  href="/nutrition"
                  className="text-jade-strong hover:underline"
                >
                  meal plan
                </Link>
                .
              </>
            )}
          </p>

          <ButtonLink href="/me/nutrition" size="sm" className="mt-4">
            Log nutrition
          </ButtonLink>
        </Card>
      </div>
    </Container>
  );
}
