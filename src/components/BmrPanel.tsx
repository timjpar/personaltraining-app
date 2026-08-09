import { Card } from "@/components/ui";
import {
  ACTIVITY_FACTORS,
  bmr,
  bmrInputsFrom,
  tdee,
  type BmrInputs,
} from "@/lib/body";
import { formatDate } from "@/lib/format";
import { ACTIVITY_LABELS, type ActivityLevel, type Units } from "@/lib/constants";
import { massLabel } from "@/lib/units";

// Resting burn, on the page where weigh-ins live.
//
// It belongs here rather than only on the profile because BMR is the one
// derived figure that moves with the scale: a client 6 kg down burns roughly
// 60 kcal a day less at rest than they did, and that is the usual reason a
// deficit that worked in week one stops working in week eight. Showing it
// beside the trend is what makes that legible instead of mysterious.
//
// The bar to render is lower than the suggested targets card's on purpose —
// see bmrInputsFrom. BMR needs sex, age, height and a weight and nothing else,
// so this appears as soon as intake is done, before any goal is set.
export function BmrPanel({
  profile,
  latest,
  earliest,
  units,
}: {
  profile: {
    sex: string | null;
    birthDate: Date | null;
    heightCm: number | null;
    activityLevel: string | null;
  } | null;
  latest: { weightKg: number; date: Date } | null;
  // The oldest weigh-in being charted, so the panel can say what resting burn
  // has done across the same span the trend above it draws. Null when there is
  // only one reading and there is no change to report yet.
  earliest: { weightKg: number; date: Date } | null;
  units: Units;
}) {
  const { inputs, missing } = bmrInputsFrom(profile, latest);

  if (!inputs) {
    return (
      <Card className="p-4 sm:p-5">
        <h3 className="font-display text-base font-semibold text-ink">
          Resting burn
        </h3>
        {/* "Once the file has …", the same construction the suggested targets
            card uses — and it avoids saying a weigh-in gets added to a
            profile, which is where the more natural phrasing goes wrong. */}
        <p className="mt-1.5 text-sm text-ink-soft">
          Once the file has {listOf(missing)}, this shows what they burn at
          rest, and how it moves as the weight does.
        </p>
      </Card>
    );
  }

  const now = Math.round(bmr(inputs));

  const activity =
    profile?.activityLevel && profile.activityLevel in ACTIVITY_FACTORS
      ? (profile.activityLevel as ActivityLevel)
      : null;
  const maintenance = activity ? Math.round(tdee(now, activity)) : null;

  // Recomputed at the older weight, holding everything else fixed — the point
  // is what the weight change did, not what a year of ageing did.
  const then: BmrInputs | null = earliest
    ? { ...inputs, weightKg: earliest.weightKg }
    : null;
  const thenBmr = then ? Math.round(bmr(then)) : null;
  const delta = thenBmr != null ? now - thenBmr : null;

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="font-display text-base font-semibold text-ink">
        Resting burn
      </h3>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Stat label="BMR" value={now.toLocaleString()} unit="kcal" sub="at rest, all day" />
        <Stat
          label="Maintenance"
          value={maintenance != null ? maintenance.toLocaleString() : "—"}
          unit={maintenance != null ? "kcal" : undefined}
          sub={
            activity
              ? ACTIVITY_LABELS[activity].toLowerCase()
              : "set an activity level"
          }
        />
        <Stat
          label="Change"
          value={
            delta == null ? "—" : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta)}`
          }
          unit={delta == null ? undefined : "kcal"}
          sub={
            earliest && delta != null
              ? `since ${formatDate(earliest.date)}`
              : "needs a second weigh-in"
          }
        />
      </div>

      <p className="mt-3 text-xs text-ink-soft">
        Mifflin–St Jeor at {massLabel(inputs.weightKg, units)}
        {latest ? `, their ${formatDate(latest.date)} weigh-in` : ""}.
        {delta != null && delta < 0
          ? " Resting burn falls as weight does — worth revisiting the target when it drifts far enough to matter."
          : ""}
      </p>
    </Card>
  );
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
        {unit ? (
          <span className="ml-1 text-xs font-normal text-ink-soft">{unit}</span>
        ) : null}
      </p>
      {sub ? (
        <p className="metric mt-1.5 truncate text-xs leading-none text-ink-soft">
          {sub}
        </p>
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
