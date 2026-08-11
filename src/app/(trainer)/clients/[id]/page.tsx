import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Container,
  PageHeading,
  Card,
  Badge,
  Avatar,
  ButtonLink,
  EmptyState,
} from "@/components/ui";
import { AssignSavedWorkout } from "@/components/AssignSavedWorkout";
import { ResetClientPassword } from "./ResetClientPassword";
import { assignTemplateToClient } from "@/app/(trainer)/library/actions";
import { toBodyRows } from "@/lib/metrics";
import { formatDate, toDateInput } from "@/lib/format";
import { sumMacros } from "@/lib/nutrition-form";
import { MeasurementForm } from "@/components/MeasurementForm";
import { BodyStats } from "@/components/BodyStats";
import { BodyTrend } from "@/components/BodyTrend";
import { saveMeasurement } from "@/app/(trainer)/clients/body-actions";
import { toUnits } from "@/lib/constants";
import { avatarUrl } from "@/lib/avatar";
import { MonthCalendar } from "@/components/MonthCalendar";
import { ProfilePhotoCard } from "@/components/ProfilePhotoCard";
import {
  saveClientPhoto,
  removeClientPhoto,
} from "@/app/(trainer)/clients/photo-actions";
import {
  eventItem,
  gridRange,
  groupByDay,
  monthGrid,
  parseMonthKey,
  startOfMonth,
  workoutItem,
  TRAINER_LINKS,
} from "@/lib/calendar";

function WorkoutRow({
  id,
  title,
  date,
  count,
  completed,
  rpe,
}: {
  id: string;
  title: string;
  date: Date;
  count: number;
  completed: boolean;
  rpe: number | null;
}) {
  return (
    <Link
      href={`/workouts/${id}`}
      className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{title}</p>
        <p className="metric mt-0.5 text-xs text-ink-soft">
          {formatDate(date)} · {count} exercise{count === 1 ? "" : "s"}
        </p>
      </div>
      {completed ? (
        <Badge tone="jade">Logged{rpe != null ? ` · RPE ${rpe}` : ""}</Badge>
      ) : (
        <Badge>Assigned</Badge>
      )}
      <span className="text-ink-soft">›</span>
    </Link>
  );
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // Which month the schedule section is showing. A query param rather than
  // component state because the calendar is server-rendered from a date-range
  // query, exactly as the two full calendar pages are.
  searchParams: Promise<{ m?: string }>;
}) {
  const [{ id }, { m }] = await Promise.all([params, searchParams]);
  const trainer = await requireTrainer();

  const monthStart = parseMonthKey(m) ?? startOfMonth(new Date());
  // The whole visible grid, not the month — the leading and trailing cells
  // belong to the neighbouring months and would otherwise come back empty.
  const { start: monthFrom, end: monthTo } = gridRange(monthGrid(monthStart));

  // All eight in parallel. Each scopes itself — the logs, the plan, the body
  // rows and the two calendar queries carry the trainer check in their own
  // where clause rather than leaning on the client lookup having succeeded, so
  // running them together is safe.
  const [
    client,
    templates,
    logs,
    plan,
    profile,
    measurements,
    monthWorkouts,
    monthEvents,
  ] = await Promise.all([
      prisma.user.findFirst({
        where: { id, trainerId: trainer.id, role: "CLIENT" },
        include: {
          workoutsAsClient: {
            orderBy: { scheduledDate: "desc" },
            include: { _count: { select: { exercises: true } } },
          },
        },
      }),
      prisma.workoutTemplate.findMany({
        where: { trainerId: trainer.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true },
      }),
      prisma.nutritionLog.findMany({
        where: { clientId: id, client: { trainerId: trainer.id } },
        orderBy: { date: "desc" },
        take: 14,
        include: {
          foods: {
            select: { calories: true, protein: true, carbs: true, fat: true },
          },
        },
      }),
      prisma.nutritionPlan.findFirst({
        where: { clientId: id, trainerId: trainer.id },
        orderBy: { assignedAt: "desc" },
        select: { title: true, targetCalories: true },
      }),
      prisma.clientProfile.findFirst({
        where: { userId: id, user: { trainerId: trainer.id } },
        select: { goalWeightKg: true, goalType: true, heightCm: true },
      }),
      // Capped like the nutrition logs beside it. This section is a summary
      // that links out — the full history has its own route and its own query.
      // Whole rows now, and tape-only entries included: the chart on this card
      // plots every figure a Measurement holds, not just the weight. Deep
      // enough for its 1Y range — nothing here renders a list of them.
      prisma.measurement.findMany({
        where: { clientId: id, client: { trainerId: trainer.id } },
        orderBy: { date: "desc" },
        take: 400,
      }),
      // This client's month, both kinds of session. Deliberately unfiltered by
      // attendance where the coach's own calendar filters hard: that one
      // answers "what am I doing this week" and this one answers "what has she
      // got on", which is the question you open a client's file to ask. The
      // chips mark which are with the coach.
      prisma.workout.findMany({
        where: {
          clientId: id,
          trainerId: trainer.id,
          scheduledDate: { gte: monthFrom, lt: monthTo },
        },
        select: {
          id: true,
          title: true,
          scheduledDate: true,
          startMinute: true,
          durationMinutes: true,
          status: true,
          attendance: true,
          client: { select: { id: true, name: true } },
        },
      }),
      prisma.calendarEvent.findMany({
        where: {
          clientId: id,
          trainerId: trainer.id,
          date: { gte: monthFrom, lt: monthTo },
        },
        include: { client: { select: { id: true, name: true } } },
      }),
    ]);

  if (!client) notFound();

  const units = toUnits(trainer.units);

  const byDay = groupByDay([
    ...monthWorkouts.map((w) => workoutItem(w, TRAINER_LINKS)),
    ...monthEvents.map((e) => eventItem(e, TRAINER_LINKS)),
  ]);

  // Narrowed so the trend and the stats can take a plain number — the query
  // already filtered nulls out, but the type doesn't know that.
  const weighIns = measurements.filter(
    (m): m is typeof m & { weightKg: number } => m.weightKg != null,
  );
  const current = weighIns[0] ?? null;
  // "Change in 30 days" compares against the oldest reading inside the window,
  // not the previous entry — for someone weighing in twice a week the latter
  // would read as zero and say nothing.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const window = weighIns.filter((m) => m.date >= cutoff);
  const previous = window[window.length - 1] ?? null;

  const upcoming = client.workoutsAsClient
    .filter((w) => w.status !== "COMPLETED")
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  const completed = client.workoutsAsClient
    .filter((w) => w.status === "COMPLETED")
    .sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
    );

  return (
    <Container>
      <Link
        href="/clients"
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ All clients
      </Link>

      <div className="mt-3">
        <PageHeading
          title={client.name}
          action={
            <ButtonLink href={`/clients/${client.id}/workouts/new`}>
              Program a workout
            </ButtonLink>
          }
        >
          {/* Bigger than the 24px it was. This is the one page in the app
              that is about a single person, so their face is worth more than a
              favicon — and it's the "view" half of being able to set one from
              here, the control for which is down with the other account
              things. */}
          <span className="flex items-center gap-2.5">
            <Avatar
              name={client.name}
              src={avatarUrl(client)}
              className="h-10 w-10 text-xs"
            />
            <span className="metric">{client.email}</span>
          </span>
        </PageHeading>
      </div>

      {templates.length > 0 ? (
        <Card className="mt-6 p-4 sm:p-5">
          <h2 className="mb-1 font-display text-base font-semibold text-ink">
            Assign a saved workout
          </h2>
          <p className="mb-3 text-sm text-ink-soft">
            Drop one of your saved workouts onto {client.name.split(/\s+/)[0]}
            &rsquo;s calendar, or{" "}
            <Link
              href={`/clients/${client.id}/workouts/new`}
              className="text-jade-strong hover:underline"
            >
              build a one-off
            </Link>
            .
          </p>
          <AssignSavedWorkout
            action={assignTemplateToClient.bind(null, client.id)}
            templates={templates}
            defaultDate={toDateInput(new Date())}
          />
        </Card>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <EmptyState
              title="Nothing programmed yet"
              action={
                <ButtonLink
                  href={`/clients/${client.id}/workouts/new`}
                  size="sm"
                >
                  Program a workout
                </ButtonLink>
              }
            >
              Build {client.name.split(/\s+/)[0]}&rsquo;s next session.
            </EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {upcoming.map((w) => (
                <WorkoutRow
                  key={w.id}
                  id={w.id}
                  title={w.title}
                  date={w.scheduledDate}
                  count={w._count.exercises}
                  completed={false}
                  rpe={w.rpe}
                />
              ))}
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">
            Completed
          </h2>
          {completed.length === 0 ? (
            <EmptyState title="No completed sessions yet">
              Finished workouts show up here with results.
            </EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {completed.map((w) => (
                <WorkoutRow
                  key={w.id}
                  id={w.id}
                  title={w.title}
                  date={w.completedAt ?? w.scheduledDate}
                  count={w._count.exercises}
                  completed
                  rpe={w.rpe}
                />
              ))}
            </Card>
          )}
        </section>
      </div>

      {/* Their calendar, on their file. The two lists above answer "what has
          she been given" and this answers "when" — the shape of a month is the
          thing a list of dates can't show, and it's how you spot a week with
          four sessions stacked on Tuesday.

          The id is what the month arrows scroll back to: this sits well down a
          long page, and stepping a month is a page load that would otherwise
          dump you at the top every time. */}
      <section id="schedule" className="mt-10 scroll-mt-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="font-display text-lg font-semibold text-ink">
            Schedule
          </h2>
          {/* The {" "} is load-bearing: a text chunk that runs onto a second
              line loses its leading space in the JSX transform, so "Maria" and
              "has" ran together. Same reason the assign card above writes
              `or{" "}` rather than trusting the line break. */}
          <p className="text-xs text-ink-soft">
            Everything {client.name.split(/\s+/)[0]}{" "}
            has on, whether or not you&rsquo;re there for it.
          </p>
        </div>

        {/* No dayHref: there is no "this client, this date" page to open, and
            inventing one to point at the coach's own day — which shows their
            whole roster — would answer a different question. Without it every
            chip becomes its own link instead, straight to the session. */}
        <MonthCalendar
          monthStart={monthStart}
          byDay={byDay}
          monthHref={(key) => `/clients/${client.id}?m=${key}#schedule`}
          todayHref={`/clients/${client.id}#schedule`}
          showAttendance
          attendanceLegend={{ IN_PERSON: "With you", SOLO: "On their own" }}
        />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="font-display text-lg font-semibold text-ink">
            Nutrition
          </h2>
          {plan ? (
            <p className="text-xs text-ink-soft">
              On <span className="text-ink">{plan.title}</span>
              {plan.targetCalories
                ? ` · target ${plan.targetCalories} kcal`
                : ""}
            </p>
          ) : (
            <Link
              href="/nutrition"
              className="text-xs font-medium text-jade-strong hover:underline"
            >
              Assign a plan →
            </Link>
          )}
        </div>

        {logs.length === 0 ? (
          <EmptyState title="Nothing logged yet">
            When {client.name.split(/\s+/)[0]} logs what they ate, the days show
            up here with totals against their targets.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {logs.map((log) => {
              const totals = sumMacros([{ foods: log.foods }]);
              const over =
                plan?.targetCalories != null &&
                totals.calories > plan.targetCalories;
              return (
                <Link
                  key={log.id}
                  href={`/clients/${client.id}/nutrition/${toDateInput(log.date)}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {formatDate(log.date)}
                    </p>
                    <p className="metric mt-0.5 text-xs text-ink-soft">
                      P {totals.protein} · C {totals.carbs} · F {totals.fat}
                      {log.foods.length
                        ? ` · ${log.foods.length} item${log.foods.length === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  {/* Amber for over target, matching how effort is flagged
                      everywhere else — it's a number to look at, not a fault. */}
                  <span
                    className={
                      "metric shrink-0 text-xs " +
                      (over ? "text-amber" : "text-ink-soft")
                    }
                  >
                    {totals.calories}
                    {plan?.targetCalories != null
                      ? ` / ${plan.targetCalories}`
                      : ""}{" "}
                    kcal
                  </span>
                  <span className="text-ink-soft">›</span>
                </Link>
              );
            })}
          </Card>
        )}
      </section>

      {/* Body. Deliberately a summary that links out — the profile is a long
          form and the weigh-in history is a long table, and neither belongs on
          the page you open to see what someone is training. What stays here is
          the glance, plus the one action a coach takes standing next to a
          client: type a weight. */}
      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="font-display text-lg font-semibold text-ink">Body</h2>
          <div className="flex items-center gap-3">
            <Link
              href={`/clients/${client.id}/measurements`}
              className="text-xs font-medium text-jade-strong hover:underline"
            >
              Measurements →
            </Link>
            <Link
              href={`/clients/${client.id}/profile`}
              className="text-xs font-medium text-jade-strong hover:underline"
            >
              Profile →
            </Link>
          </div>
        </div>

        {measurements.length === 0 ? (
          <EmptyState
            title="Nothing measured yet"
            action={
              <ButtonLink href={`/clients/${client.id}/profile`} size="sm">
                Fill in their profile
              </ButtonLink>
            }
          >
            Height, a goal and a weigh-in are what a meal plan gets written
            from. Record them and this works out{" "}
            {client.name.split(/\s+/)[0]}&rsquo;s calorie and macro targets.
          </EmptyState>
        ) : (
          <Card className="p-4 sm:p-5">
            <BodyStats
              currentKg={current?.weightKg ?? null}
              previousKg={
                previous && previous !== current ? previous.weightKg : null
              }
              goalKg={profile?.goalWeightKg ?? null}
              units={units}
              sinceLabel="in 30 days"
            />

            <div className="mt-4">
              <BodyTrend
                rows={toBodyRows(measurements)}
                heightCm={profile?.heightCm ?? null}
                goalWeightKg={profile?.goalWeightKg ?? null}
                possessive="their"
                units={units}
              />
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <MeasurementForm
                action={saveMeasurement.bind(null, client.id)}
                units={units}
                compact
                values={{
                  date: toDateInput(new Date()),
                  weightKg: null,
                  bodyFatPct: null,
                  neckCm: null,
                  chestCm: null,
                  waistCm: null,
                  hipsCm: null,
                  thighCm: null,
                  armCm: null,
                  calfCm: null,
                  notes: null,
                }}
              />
            </div>
          </Card>
        )}
      </section>

      {/* Account admin, kept to the bottom: the things you reach for once in a
          while, not what this page is about. The same placement the photo card
          gets on /dashboard and /my, which is where a coach has already met
          it — and half a roster never sets one themselves, because they were
          signed up at a desk and have never opened their own settings. */}
      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <ProfilePhotoCard
          name={client.name}
          photoUrl={avatarUrl(client)}
          save={saveClientPhoto.bind(null, client.id)}
          remove={removeClientPhoto.bind(null, client.id)}
          title={`${client.name.split(/\s+/)[0]}'s photo`}
          blurb={`Shown wherever ${client.name.split(/\s+/)[0]} appears — your roster, the feed, their own app. They can change or remove it themselves.`}
        />
        <ResetClientPassword
          clientId={client.id}
          firstName={client.name.split(/\s+/)[0]}
        />
      </section>
    </Container>
  );
}
