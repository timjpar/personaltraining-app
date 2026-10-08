import { Card } from "@/components/ui";
import { ACTIVITY_FACTORS, bmrInputsFrom, projectWeight } from "@/lib/body";
import { ACTIVITY_LABELS, toActivityLevel, type Units } from "@/lib/constants";
import { formatDate, formatDayMonthYear } from "@/lib/format";
import type { Intake } from "@/lib/intake";
import { activitySuggestionFor, type ActivityDetail } from "@/lib/profile-values";
import { massDeltaLabel, massLabel } from "@/lib/units";

// Where the current intake takes the scale, and how fast.
//
// The question every client asks of a plan — "what will this get me to?" — is
// answerable from what the file already holds: the resting-burn equation, the
// activity level, and what they're eating. See projectWeight in body.ts for the
// model — Hall's NIH figures — and why it curves instead of running at a
// straight 7,700 kcal per kg.
//
// Sits under Resting burn on the body pages, because the two answer halves of
// the same thing: what they burn now, and where that leaves them.
export function ProjectionPanel({
  profile,
  latest,
  intake,
  units,
  self = false,
}: {
  profile:
    | (ActivityDetail & {
        sex: string | null;
        birthDate: Date | null;
        heightCm: number | null;
        activityLevel: string | null;
        goalWeightKg: number | null;
        goalDate: Date | null;
      })
    | null;
  latest: { weightKg: number; date: Date } | null;
  intake: Intake | null;
  units: Units;
  self?: boolean;
}) {
  const they = self ? "you" : "they";
  const { inputs, missing } = bmrInputsFrom(profile, latest, {
    possessive: self ? "your" : "their",
  });

  // The chosen level, or — when none is chosen — the one the details point to,
  // named as such. Nothing at all and the panel says what it needs.
  const chosen = toActivityLevel(profile?.activityLevel);
  const suggested =
    !chosen && profile && inputs ? activitySuggestionFor(profile, inputs) : null;
  const factor = chosen ? ACTIVITY_FACTORS[chosen] : suggested?.factor ?? null;
  if (!factor) missing.push("an activity level, or the job and step details that suggest one");
  if (!intake) missing.push(`an assigned meal plan or a week of logged food`);

  if (!inputs || !factor || !intake) {
    return (
      <Card className="p-4 sm:p-5">
        <h3 className="font-display text-base font-semibold text-ink">
          Where this plan leads
        </h3>
        <p className="mt-1.5 text-sm text-ink-soft">
          Once {self ? "your file" : "the file"} has {listOf(missing)}, this
          shows where {they}&apos;re heading on what {they}&apos;re eating, and
          how long it takes to get there.
        </p>
      </Card>
    );
  }

  const p = projectWeight({
    bmr: inputs,
    factor,
    intakeKcal: intake.kcal,
    goalWeightKg: profile?.goalWeightKg ?? null,
  });

  const holding = Math.abs(p.gap) < 50;
  const implausible = p.settleKg < 35 || p.settleKg > 250;
  const goal = profile?.goalWeightKg ?? null;
  const goalDate = profile?.goalDate ?? null;
  const today = new Date();
  const weeksToDate =
    goalDate && goalDate > today
      ? (goalDate.getTime() - today.getTime()) / WEEK_MS
      : null;
  const atDate =
    weeksToDate != null
      ? projectWeight({
          bmr: inputs,
          factor,
          intakeKcal: intake.kcal,
          goalWeightKg: null,
          weeks: [weeksToDate],
        }).points[0].weightKg
      : null;

  const goalLine = (() => {
    if (goal == null || p.weeksToGoal == null) return null;
    if (p.weeksToGoal === 0) return `At ${self ? "your" : "their"} goal weight of ${massLabel(goal, units)} now.`;
    if (p.weeksToGoal === Infinity) {
      return `Settles before ${self ? "your" : "their"} goal of ${massLabel(goal, units)} — getting there takes a bigger gap than this intake leaves.`;
    }
    const when = new Date(today.getTime() + p.weeksToGoal * WEEK_MS);
    return `Goal weight of ${massLabel(goal, units)} in about ${p.weeksToGoal} weeks, around ${formatDayMonthYear(when)}.`;
  })();

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="font-display text-base font-semibold text-ink">
        Where this plan leads
      </h3>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Stat
          label="Eating"
          value={intake.kcal.toLocaleString()}
          unit="kcal"
          sub={intake.source === "log" ? intake.label : `plan: ${intake.label}`}
        />
        <Stat
          label="Maintenance"
          value={p.maintenance.toLocaleString()}
          unit="kcal"
          sub={
            chosen
              ? ACTIVITY_LABELS[chosen].toLowerCase()
              : `suggested ${ACTIVITY_LABELS[suggested!.level].toLowerCase()}`
          }
        />
        <Stat
          label="Daily gap"
          value={`${p.gap > 0 ? "+" : p.gap < 0 ? "−" : ""}${Math.abs(p.gap).toLocaleString()}`}
          unit="kcal"
          sub={holding ? "about even" : p.gap < 0 ? "deficit" : "surplus"}
        />
      </div>

      {holding ? (
        <p className="mt-3 text-sm text-ink">
          Within 50 kcal of maintenance — weight should hold near{" "}
          {massLabel(inputs.weightKg, units)}.
        </p>
      ) : (
        <>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-4">
            {p.points.map((pt) => (
              <li key={pt.weeks} className="flex items-baseline justify-between gap-2">
                <span className="text-ink-soft">{horizon(pt.weeks)}</span>
                <span className="metric text-ink">
                  {massLabel(pt.weightKg, units)}{" "}
                  <span className="text-xs text-ink-soft">
                    {massDeltaLabel(pt.weightKg - inputs.weightKg, units)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink">
            {implausible
              ? "This intake is far enough from maintenance that it couldn't be held for long — read the first few months, not where it ends."
              : `Settles near ${massLabel(p.settleKg, units)}, where maintenance meets intake — about half of that change within the first year.`}
          </p>
        </>
      )}

      {goalLine ? <p className="mt-1.5 text-sm text-ink">{goalLine}</p> : null}
      {atDate != null && goalDate ? (
        <p className="mt-1.5 text-sm text-ink">
          By {self ? "your" : "their"} target date, {formatDayMonthYear(goalDate)}: about{" "}
          {massLabel(atDate, units)}.
        </p>
      ) : null}

      <p className="mt-3 text-xs text-ink-soft">
        Maintenance is Mifflin–St Jeor at {massLabel(inputs.weightKg, units)}
        {latest ? ` (${formatDate(latest.date)})` : ""} × {factor.toFixed(2)}.
        The curve is Hall et al.&apos;s NIH model (Lancet 2011): about 0.45 kg
        of eventual change per 10 kcal a day, half of it within a year, with
        intake held where it is. It was fitted to adults carrying extra weight,
        leaves out day-to-day water swings, and the equation is ±10% on any one
        person — a guide to direction and pace, checked against the trend above.
      </p>
    </Card>
  );
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

function horizon(weeks: number): string {
  if (weeks === 4) return "1 month";
  if (weeks === 52) return "1 year";
  if (weeks % 4 === 0 || weeks === 26) return `${Math.round(weeks / 4.33)} months`;
  return `${weeks} weeks`;
}

function Stat({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-card px-3.5 py-2.5">
      <p className="eyebrow text-ink-soft/70">{label}</p>
      <p className="metric mt-1 text-lg font-semibold leading-none text-ink">
        {value}
        {unit ? <span className="ml-1 text-xs font-normal text-ink-soft">{unit}</span> : null}
      </p>
      {sub ? (
        <p className="metric mt-1.5 truncate text-xs leading-none text-ink-soft">{sub}</p>
      ) : null}
    </div>
  );
}

function listOf(items: string[]): string {
  if (items.length === 0) return "the missing details";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
