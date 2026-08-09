import Link from "next/link";
import { Card, ButtonLink } from "@/components/ui";
import { MacroBar } from "@/components/MacroBar";
import { ApplyTargets } from "@/components/ApplyTargets";
import { suggestTargets, targetInputsFrom } from "@/lib/body";
import { massValue, massUnit, massLabel, KG_PER_LB } from "@/lib/units";
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  UNITS,
  type Units,
} from "@/lib/constants";
import type { BodyState } from "@/lib/body-form";

// The derived calorie and macro suggestion, and the two ways a coach accepts
// it. Nothing here is stored: the numbers are a pure function of the profile
// and the newest weigh-in (see body.ts), so a stored copy would go stale the
// moment either changed. This recomputes on every render instead.
//
// The derivation is shown rather than hidden. A bare "2,290 kcal" invites
// either blind trust or dismissal; BMR → TDEE → deficit is what lets a coach
// decide whether the estimate is reasonable for the person in front of them.

type ProfileInput = Parameters<typeof targetInputsFrom>[0];

export function SuggestedTargets({
  profile,
  latest,
  clientId,
  clientName,
  units,
  plan,
  applyAction,
}: {
  profile: ProfileInput;
  latest: { weightKg: number | null } | null;
  clientId: string;
  clientName: string;
  units: Units;
  plan: { id: string; title: string } | null;
  applyAction?: (prev: BodyState, formData: FormData) => Promise<BodyState>;
}) {
  const { inputs, missing } = targetInputsFrom(profile, latest);

  if (!inputs) {
    return (
      <Card className="p-4 sm:p-5">
        <h3 className="font-display text-base font-semibold text-ink">
          Suggested daily targets
        </h3>
        <p className="mt-1.5 text-sm text-ink-soft">
          Once the file has {listOf(missing)}, this works out a calorie and
          macro target you can drop straight into a plan.
        </p>
      </Card>
    );
  }

  const t = suggestTargets(inputs);
  const rate = massValue(t.effectiveRateKgPerWeek, units);
  const unit = massUnit(units);
  // Grams of protein per unit of bodyweight, in the unit being displayed.
  const proteinPerUnit =
    units === UNITS.IMPERIAL ? t.proteinPerKg * KG_PER_LB : t.proteinPerKg;

  const params = new URLSearchParams({
    kcal: String(t.calories),
    protein: String(t.protein),
    carbs: String(t.carbs),
    fat: String(t.fat),
    title: `${GOAL_LABELS[inputs.goal]} · ${t.calories.toLocaleString()} kcal`,
    client: clientId,
  });

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="font-display text-base font-semibold text-ink">
        Suggested daily targets
      </h3>

      {/* The working, in one line. Mifflin–St Jeor, an activity multiplier and
          the goal adjustment — the three steps a coach would do by hand. */}
      <p className="metric mt-1.5 text-xs text-ink-soft">
        BMR {t.bmr.toLocaleString()} → {ACTIVITY_LABELS[inputs.activity]} ×{" "}
        {(t.tdee / t.bmr).toFixed(3)} = TDEE {t.tdee.toLocaleString()}
        {t.deficit !== 0
          ? ` → ${t.deficit > 0 ? "+" : "−"}${Math.abs(t.deficit).toLocaleString()} kcal/day`
          : " → maintain"}
      </p>

      <MacroBar
        className="mt-3"
        totals={{
          calories: t.calories,
          protein: t.protein,
          carbs: t.carbs,
          fat: t.fat,
        }}
      />

      {/* The coefficient follows whichever unit is on screen — quoting "1.8 g
          per kg" beside a reference weight in pounds reads as a units bug even
          though both numbers are right. 1.8 g/kg is 0.82 g/lb. */}
      <p className="mt-2.5 text-xs text-ink-soft">
        Protein at {proteinPerUnit.toFixed(2)} g per {unit}, off a reference
        weight of {massLabel(t.referenceKg, units)}
        {t.weeksToGoal != null
          ? ` · about ${rate.toFixed(2)} ${unit} a week, roughly ${t.weeksToGoal} week${t.weeksToGoal === 1 ? "" : "s"} to goal`
          : ""}
      </p>

      {/* Amber, matching how every other "look at this number" is flagged.
          These are not errors — the suggestion is still usable — they are the
          places where what was asked for and what is being given come apart. */}
      {t.warnings.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {t.warnings.map((w) => (
            <li
              key={w}
              className="rounded-[var(--radius-sm)] border border-amber/25 bg-amber-wash px-3 py-2 text-xs text-amber"
            >
              {w}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
        <ButtonLink
          href={`/nutrition/new?${params.toString()}`}
          size="sm"
          className="shrink-0"
        >
          Start a plan from these
        </ButtonLink>

        {plan && applyAction ? (
          <div className="min-w-0 flex-1">
            <ApplyTargets
              action={applyAction}
              planId={plan.id}
              planTitle={plan.title}
            />
          </div>
        ) : (
          <p className="text-xs text-ink-soft sm:self-center">
            {clientName.split(/\s+/)[0]} has no plan assigned yet — or{" "}
            <Link href="/nutrition" className="text-jade-strong hover:underline">
              assign an existing one
            </Link>
            .
          </p>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-soft/80">
        An estimate, not a prescription — Mifflin–St Jeor is ±10% on any one
        person. Adjust from what the scale actually does over a fortnight.
      </p>
    </Card>
  );
}

// "their height, a goal and a recent weigh-in" — an Oxford-comma list, because
// this sentence is the whole instruction for what to go and fill in.
function listOf(items: string[]): string {
  if (items.length === 0) return "everything it needs";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
