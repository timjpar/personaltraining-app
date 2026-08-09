import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Container, EmptyState, PageHeading, Badge } from "@/components/ui";
import { MeasurementForm } from "@/components/MeasurementForm";
import { DeleteMeasurement } from "@/components/DeleteMeasurement";
import { WeightTrend, BodyStats } from "@/components/WeightTrend";
import { UnitsToggle } from "@/components/UnitsToggle";
import { saveWeighIn, deleteWeighIn } from "./actions";
import { formatDate, toDateInput } from "@/lib/format";
import { parseDayParam } from "@/lib/calendar";
import {
  MEASUREMENT_SOURCE,
  TAPE_SITES,
  toMeasurementSource,
  toUnits,
} from "@/lib/constants";
import { lengthLabel, massLabel } from "@/lib/units";

// The athlete's own weigh-ins.
//
// What is deliberately absent is as much the design as what is here: no
// streak, no "3 kg above goal", no colour on the direction of travel. A
// bodyweight is the most emotionally loaded number this app holds, and the
// answer to that is what the page shows rather than a lock on the field — the
// trend, their own note, and nothing that grades them.
export default async function MyBodyPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const client = await requireClient();
  const { edit } = await searchParams;

  const [profile, measurements] = await Promise.all([
    prisma.clientProfile.findUnique({
      where: { userId: client.id },
      select: { goalWeightKg: true },
    }),
    prisma.measurement.findMany({
      where: { clientId: client.id },
      orderBy: { date: "desc" },
      take: 60,
    }),
  ]);

  const units = toUnits(client.units);

  const editDate = parseDayParam(edit);
  const editing = editDate
    ? measurements.find((m) => toDateInput(m.date) === toDateInput(editDate))
    : undefined;

  const weighIns = measurements.filter(
    (m): m is typeof m & { weightKg: number } => m.weightKg != null,
  );
  const current = weighIns[0] ?? null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const window = weighIns.filter((m) => m.date >= cutoff);
  const previous = window[window.length - 1] ?? null;

  return (
    <Container className="pb-tabbar">
      <PageHeading title="Body" action={<UnitsToggle value={units} />}>
        Weigh in whenever suits you — one entry a day, and saving a day you
        already have just updates it.
      </PageHeading>

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
          {/* Read-only, and shown rather than hidden: it's what the coach
              discusses at every check-in, so leaving it off the athlete's own
              page would be the odd choice. Changing it is a conversation. */}
          {profile?.goalWeightKg != null ? (
            <p className="mt-3 text-xs text-ink-soft">
              Goal of{" "}
              <span className="metric text-ink">
                {massLabel(profile.goalWeightKg, units)}
              </span>{" "}
              set by your coach.
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card className="mt-6 p-4 sm:p-5">
        <h2 className="mb-1 font-display text-base font-semibold text-ink">
          {editing ? `Editing ${formatDate(editing.date)}` : "Log a weigh-in"}
        </h2>
        <p className="mb-4 text-sm text-ink-soft">
          Weight on its own is plenty. The tape is there if your coach has asked
          for it.
        </p>
        <MeasurementForm
          key={editing?.id ?? "new"}
          action={saveWeighIn}
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
            {measurements.map((m) => {
              const tape = TAPE_SITES.filter((s) => m[s.key] != null);
              const source = toMeasurementSource(m.source);
              return (
                <div key={m.id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-ink">
                        {formatDate(m.date)}
                        {source === MEASUREMENT_SOURCE.TRAINER ? (
                          <Badge>Coach</Badge>
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
                        href={`/my/body?edit=${toDateInput(m.date)}`}
                        className="metric min-h-9 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-jade-strong transition-colors hover:bg-paper"
                      >
                        Edit
                      </Link>
                      <DeleteMeasurement
                        action={deleteWeighIn}
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
