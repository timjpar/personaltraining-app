import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Container, EmptyState, PageHeading } from "@/components/ui";
import { MeasurementForm } from "@/components/MeasurementForm";
import { DeleteMeasurement } from "@/components/DeleteMeasurement";
import { BodyStats } from "@/components/BodyStats";
import { BodyTrend } from "@/components/BodyTrend";
import { BmrPanel } from "@/components/BmrPanel";
import { UnitsToggle } from "@/components/UnitsToggle";
import { saveMyWeighIn, deleteMyWeighIn } from "../actions";
import { formatDate, toDateInput } from "@/lib/format";
import { parseDayParam } from "@/lib/calendar";
import { toBodyRows } from "@/lib/metrics";
import { TAPE_SITES, toUnits } from "@/lib/constants";
import { lengthLabel, massLabel } from "@/lib/units";

// The coach's own weigh-ins — the same page /my/body is for an athlete and
// /clients/[id]/measurements is for a client, pointed at the reader.
//
// No source badge anywhere on it, and that is the one real difference from both
// neighbours. Measurement.source answers "who put this number in", which is
// worth showing when a file has two authors; on your own file it has one.
// How many entries the list under the chart shows. The chart reads all of
// them; the list is for finding a day to edit, and nobody scrolls to day 300.
const LIST_LIMIT = 60;

export default async function MyOwnBodyPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const trainer = await requireTrainer();
  const { edit } = await searchParams;

  const [profile, measurements] = await Promise.all([
    prisma.clientProfile.findUnique({
      where: { userId: trainer.id },
      select: {
        goalWeightKg: true,
        // The four the resting-burn panel reads, selected rather than loading
        // the whole file: this page has no use for injuries or diet notes.
        sex: true,
        birthDate: true,
        heightCm: true,
        activityLevel: true,
      },
    }),
    prisma.measurement.findMany({
      where: { clientId: trainer.id },
      orderBy: { date: "desc" },
      // Deep enough for the chart's 1Y range. The list below shows the most
      // recent LIST_LIMIT of these — a year of daily weigh-ins is a fine thing
      // to plot and a terrible thing to scroll.
      take: 400,
    }),
  ]);

  const units = toUnits(trainer.units);

  // Editing is not a separate mode. A measurement is keyed on [clientId, date],
  // so re-saving a date overwrites it — "edit" is the form prefilled with that
  // day, which ?edit= does. One form, one action, and no way for an edit and a
  // create to drift apart.
  const editDate = parseDayParam(edit);
  const editing = editDate
    ? measurements.find((m) => toDateInput(m.date) === toDateInput(editDate))
    : undefined;

  const weighIns = measurements.filter(
    (m): m is typeof m & { weightKg: number } => m.weightKg != null,
  );
  const current = weighIns[0] ?? null;
  // The comparison point is the oldest reading inside 30 days — "change since a
  // month ago", not "change since the last time I stood on a scale".
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const window = weighIns.filter((m) => m.date >= cutoff);
  const previous = window[window.length - 1] ?? null;

  return (
    <Container>
      <Link
        href="/me"
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ You
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow="Your body"
          title="Weigh-ins"
          action={<UnitsToggle value={units} />}
        >
          One entry a day — saving a day you already have edits it.
        </PageHeading>
      </div>

      {/* Ungated. The sparkline this replaced needed two readings before it had
          anything to say, so the whole card used to wait for them; the chart
          draws one reading as a dot and none as a labelled empty frame. The
          blank state is the useful one — its chips are what tell you the app
          tracks a waist and a body fat percentage at all. */}
      <Card className="mt-6 p-4 sm:p-5">
        {current ? (
          <div className="mb-5">
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
        <BodyTrend
          rows={toBodyRows(measurements)}
          heightCm={profile?.heightCm ?? null}
          goalWeightKg={profile?.goalWeightKg ?? null}
          possessive="your"
          units={units}
        />
        {profile?.goalWeightKg != null ? (
          <p className="mt-3 text-xs text-ink-soft">
            Goal of{" "}
            <span className="metric text-ink">
              {massLabel(profile.goalWeightKg, units)}
            </span>{" "}
            — change it on{" "}
            <Link href="/me/profile" className="text-jade-strong hover:underline">
              your file
            </Link>
            .
          </p>
        ) : null}
      </Card>

      {/* Resting burn sits under the trend rather than above it: the weight is
          the measurement and this is what follows from it. */}
      <div className="mt-6">
        <BmrPanel
          profile={profile}
          latest={current}
          earliest={weighIns.length >= 2 ? weighIns[weighIns.length - 1] : null}
          units={units}
          self
        />
      </div>

      <Card className="mt-6 p-4 sm:p-5">
        <h2 className="mb-1 font-display text-base font-semibold text-ink">
          {editing ? `Editing ${formatDate(editing.date)}` : "Log a weigh-in"}
        </h2>
        <p className="mb-4 text-sm text-ink-soft">
          {editing ? (
            <>
              Saving overwrites that day.{" "}
              <Link href="/me/body" className="text-jade-strong hover:underline">
                Start a new one instead
              </Link>
              .
            </>
          ) : (
            <>Weight on its own is plenty. The tape is there if you want it.</>
          )}
        </p>
        <MeasurementForm
          // Remounts when the edited day changes, so the uncontrolled inputs
          // pick up the new defaults instead of keeping the previous day's.
          key={editing?.id ?? "new"}
          action={saveMyWeighIn}
          units={units}
          submitLabel={editing ? "Save changes" : "Save"}
          values={{
            date: editing ? toDateInput(editing.date) : toDateInput(new Date()),
            weightKg: editing?.weightKg ?? null,
            bodyFatPct: editing?.bodyFatPct ?? null,
            neckCm: editing?.neckCm ?? null,
            chestCm: editing?.chestCm ?? null,
            waistCm: editing?.waistCm ?? null,
            hipsCm: editing?.hipsCm ?? null,
            thighCm: editing?.thighCm ?? null,
            armCm: editing?.armCm ?? null,
            calfCm: editing?.calfCm ?? null,
            notes: editing?.notes ?? null,
          }}
        />
      </Card>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">
          Recent
        </h2>

        {measurements.length === 0 ? (
          <EmptyState title="Nothing logged yet">
            Your first weigh-in shows up here, and the trend starts from the
            second.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {measurements.slice(0, LIST_LIMIT).map((m) => {
              const tape = TAPE_SITES.filter((s) => m[s.key] != null);
              return (
                <div key={m.id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {formatDate(m.date)}
                      </p>
                      <p className="metric mt-0.5 text-xs text-ink-soft">
                        {m.weightKg != null
                          ? massLabel(m.weightKg, units)
                          : "no weight"}
                        {m.bodyFatPct != null ? ` · ${m.bodyFatPct}% fat` : ""}
                        {tape.length > 0
                          ? ` · ${tape.length} tape site${tape.length === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link
                        href={`/me/body?edit=${toDateInput(m.date)}`}
                        className="metric min-h-9 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-jade-strong transition-colors hover:bg-paper"
                      >
                        Edit
                      </Link>
                      <DeleteMeasurement
                        action={deleteMyWeighIn}
                        measurementId={m.id}
                        label={formatDate(m.date)}
                      />
                    </div>
                  </div>

                  {tape.length > 0 ? (
                    <p className="metric mt-2 text-xs text-ink-soft">
                      {tape
                        .map((s) => `${s.label} ${lengthLabel(m[s.key], units)}`)
                        .join(" · ")}
                    </p>
                  ) : null}

                  {m.notes ? (
                    <p className="mt-2 text-sm text-ink-soft">{m.notes}</p>
                  ) : null}
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </Container>
  );
}
