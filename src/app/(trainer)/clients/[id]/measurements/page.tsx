import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Container, EmptyState, PageHeading, Badge } from "@/components/ui";
import { MeasurementForm } from "@/components/MeasurementForm";
import { DeleteMeasurement } from "@/components/DeleteMeasurement";
import { WeightTrend, BodyStats } from "@/components/WeightTrend";
import { UnitsToggle } from "@/components/UnitsToggle";
import {
  saveMeasurement,
  deleteMeasurement,
} from "@/app/(trainer)/clients/body-actions";
import { formatDate, toDateInput } from "@/lib/format";
import { parseDayParam } from "@/lib/calendar";
import {
  MEASUREMENT_SOURCE,
  MEASUREMENT_SOURCE_LABELS,
  TAPE_SITES,
  toMeasurementSource,
  toUnits,
} from "@/lib/constants";
import { lengthLabel, massLabel } from "@/lib/units";

// The full weigh-in history: the trend, the form, and every entry.
//
// Editing is not a separate mode. Because a measurement is keyed on
// [clientId, date], re-saving a date overwrites it — so "edit" is just the
// form prefilled with that day, which ?edit= does. One form, one action, and
// no way for an edit and a create to drift apart.
export default async function ClientMeasurementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const trainer = await requireTrainer();

  const [client, profile, measurements] = await Promise.all([
    prisma.user.findFirst({
      where: { id, trainerId: trainer.id, role: "CLIENT" },
      select: { id: true, name: true },
    }),
    prisma.clientProfile.findFirst({
      where: { userId: id, user: { trainerId: trainer.id } },
      select: { goalWeightKg: true },
    }),
    prisma.measurement.findMany({
      where: { clientId: id, client: { trainerId: trainer.id } },
      orderBy: { date: "desc" },
    }),
  ]);

  if (!client) notFound();

  const units = toUnits(trainer.units);
  const first = client.name.split(/\s+/)[0];

  const editDate = parseDayParam(edit);
  const editing = editDate
    ? measurements.find((m) => toDateInput(m.date) === toDateInput(editDate))
    : undefined;

  const weighIns = measurements.filter(
    (m): m is typeof m & { weightKg: number } => m.weightKg != null,
  );
  const current = weighIns[0] ?? null;
  // The comparison point is the oldest reading inside 30 days — "change since
  // a month ago", not "change since the last time they stepped on a scale",
  // which would read as zero for anyone weighing in twice a week.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const window = weighIns.filter((m) => m.date >= cutoff);
  const previous = window[window.length - 1] ?? null;

  return (
    <Container>
      <Link
        href={`/clients/${client.id}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {client.name}
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow="Measurements"
          title={`${first}’s weigh-ins`}
          action={<UnitsToggle value={units} />}
        >
          One entry per day — saving a date you already have edits it.
        </PageHeading>
      </div>

      {weighIns.length >= 2 ? (
        <Card className="mt-6 p-4 sm:p-5">
          <BodyStats
            currentKg={current?.weightKg ?? null}
            previousKg={previous && previous !== current ? previous.weightKg : null}
            goalKg={profile?.goalWeightKg ?? null}
            units={units}
            sinceLabel="in 30 days"
          />
          <WeightTrend
            className="mt-4 h-28 w-full"
            points={weighIns.map((m) => ({ date: m.date, kg: m.weightKg }))}
            goalKg={profile?.goalWeightKg ?? null}
            units={units}
          />
        </Card>
      ) : null}

      <Card className="mt-6 p-4 sm:p-5">
        <h2 className="mb-1 font-display text-base font-semibold text-ink">
          {editing ? `Editing ${formatDate(editing.date)}` : "Record a weigh-in"}
        </h2>
        <p className="mb-4 text-sm text-ink-soft">
          {editing ? (
            <>
              Saving overwrites that day.{" "}
              <Link
                href={`/clients/${client.id}/measurements`}
                className="text-jade-strong hover:underline"
              >
                Start a new one instead
              </Link>
              .
            </>
          ) : (
            <>Weight alone is enough — the tape is for measuring appointments.</>
          )}
        </p>
        <MeasurementForm
          // Remounts when the edited day changes, so the uncontrolled inputs
          // pick up the new defaults instead of keeping the previous day's.
          key={editing?.id ?? "new"}
          action={saveMeasurement.bind(null, client.id)}
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
          History
        </h2>

        {measurements.length === 0 ? (
          <EmptyState title="Nothing measured yet">
            The first weigh-in you record for {first} shows up here, and the
            trend starts from the second.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {measurements.map((m) => {
              const tape = TAPE_SITES.filter((s) => m[s.key] != null);
              const source = toMeasurementSource(m.source);
              return (
                <div key={m.id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-ink">
                        {formatDate(m.date)}
                        {source === MEASUREMENT_SOURCE.CLIENT ? (
                          <Badge>{MEASUREMENT_SOURCE_LABELS[source]}</Badge>
                        ) : null}
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
                        href={`/clients/${client.id}/measurements?edit=${toDateInput(m.date)}`}
                        className="metric min-h-9 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-jade-strong transition-colors hover:bg-paper"
                      >
                        Edit
                      </Link>
                      <DeleteMeasurement
                        action={deleteMeasurement.bind(null, client.id)}
                        measurementId={m.id}
                        label={formatDate(m.date)}
                      />
                    </div>
                  </div>

                  {tape.length > 0 ? (
                    <p className="metric mt-2 text-xs text-ink-soft">
                      {tape
                        .map(
                          (s) => `${s.label} ${lengthLabel(m[s.key], units)}`,
                        )
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
