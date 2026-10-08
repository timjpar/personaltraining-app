"use client";

import { useActionState } from "react";
import {
  Button,
  Card,
  Field,
  FormError,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import {
  heightInputs,
  lengthInput,
  lengthUnit,
  massInput,
  massUnit,
} from "@/lib/units";
import {
  ACTIVITY_HINTS,
  ACTIVITY_LABELS,
  ACTIVITY_ORDER,
  DIET_PATTERN_LABELS,
  DIET_PATTERN_ORDER,
  EXPERIENCE_HINTS,
  EXPERIENCE_LABELS,
  EXPERIENCE_ORDER,
  GOAL_FOCUS_HINTS,
  GOAL_FOCUS_LABELS,
  GOAL_FOCUS_ORDER,
  GOAL_LABELS,
  GOAL_ORDER,
  OCCUPATION_HINTS,
  OCCUPATION_LABELS,
  OCCUPATION_ORDER,
  SEX_LABELS,
  SEX_ORDER,
  TRAINING_LOCATION_LABELS,
  TRAINING_LOCATION_ORDER,
  UNITS,
  type Units,
} from "@/lib/constants";
import type { BodyState } from "@/lib/body-form";

const initial: BodyState = {};

export type ProfileValues = {
  sex: string | null;
  birthDate: string; // yyyy-mm-dd, already formatted by the caller
  heightCm: number | null;
  activityLevel: string | null;
  goalType: string | null;
  goalWeightKg: number | null;
  rateKgPerWeek: number | null;
  occupationActivity: string | null;
  dailySteps: number | null;
  sessionMinutes: number | null;
  cardioMinutesPerWeek: number | null;
  goalFocus: string | null;
  goalBodyFatPct: number | null;
  goalWaistCm: number | null;
  goalDate: string; // yyyy-mm-dd, already formatted by the caller
  goalNotes: string | null;
  trainingDaysPerWeek: number | null;
  experience: string | null;
  trainingLocation: string | null;
  equipmentNotes: string | null;
  injuries: string | null;
  dietPattern: string | null;
  allergies: string | null;
  dietaryNotes: string | null;
  mealsPerDay: number | null;
  notes: string | null;
};

// The intake file. Grouped the way a coach thinks about it rather than the way
// the columns are ordered: who they are, what they're aiming at, how much they
// move, how they train, how they eat.
//
// Every select carries a blank first option and every field is optional,
// because a half-filled profile is the normal state after a first
// conversation. What that costs is named where it lands — the suggested
// targets card says exactly what is still missing rather than this form
// nagging for it.
export function ClientProfileForm({
  action,
  units,
  values,
  activitySuggestion = null,
  self = false,
}: {
  action: (prev: BodyState, formData: FormData) => Promise<BodyState>;
  units: Units;
  values: ProfileValues;
  // The level the activity details below point to, worked out by the page
  // (it needs a weigh-in, which this form doesn't have). Shown beside the
  // select, never applied: the level is still the coach's call.
  activitySuggestion?: string | null;
  // Set when a coach is filling this in about themselves. Four hints below
  // describe the person being programmed for, and on your own file every one
  // of them means you.
  self?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const mass = massUnit(units);
  const length = lengthUnit(units);
  const imperial = units === UNITS.IMPERIAL;
  const height = heightInputs(values.heightCm);
  const they = self ? "you" : "they";
  const their = self ? "your" : "their";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="units" value={units} />

      <FormError>{state.error}</FormError>
      {state.ok ? (
        <p className="rounded-[var(--radius-sm)] border border-jade/20 bg-jade-wash px-3.5 py-2.5 text-sm text-jade-strong">
          {state.ok}
        </p>
      ) : null}

      <Section title="Basics">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Sex"
            hint="Used only for the calorie estimate — the two equations differ."
            htmlFor="p-sex"
          >
            <Select id="p-sex" name="sex" defaultValue={values.sex ?? ""}>
              <option value="">Not set</option>
              {SEX_ORDER.map((s) => (
                <option key={s} value={s}>
                  {SEX_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Date of birth"
            hint="Age is worked out from this, so it never goes stale."
            htmlFor="p-dob"
          >
            <Input
              id="p-dob"
              name="birthDate"
              type="date"
              defaultValue={values.birthDate}
            />
          </Field>

          {imperial ? (
            <Field label="Height (ft / in)">
              <div className="flex gap-2">
                <Input
                  name="heightFeet"
                  type="number"
                  inputMode="numeric"
                  placeholder="5"
                  aria-label="Height, feet"
                  defaultValue={height.feet}
                />
                <Input
                  name="heightInches"
                  type="number"
                  inputMode="numeric"
                  placeholder="11"
                  aria-label="Height, inches"
                  defaultValue={height.inches}
                />
              </div>
            </Field>
          ) : (
            <Field label="Height (cm)" htmlFor="p-height">
              <Input
                id="p-height"
                name="heightCm"
                type="number"
                inputMode="numeric"
                placeholder="180"
                defaultValue={height.cm}
              />
            </Field>
          )}
        </div>
      </Section>

      <Section title="Goal">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Focus"
            hint={
              values.goalFocus && values.goalFocus in GOAL_FOCUS_HINTS
                ? GOAL_FOCUS_HINTS[values.goalFocus as keyof typeof GOAL_FOCUS_HINTS]
                : `What ${they}'re training for, beside which way the scale moves.`
            }
            htmlFor="p-focus"
          >
            <Select id="p-focus" name="goalFocus" defaultValue={values.goalFocus ?? ""}>
              <option value="">Not set</option>
              {GOAL_FOCUS_ORDER.map((g) => (
                <option key={g} value={g}>
                  {GOAL_FOCUS_LABELS[g]} — {GOAL_FOCUS_HINTS[g]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Direction" htmlFor="p-goal">
            <Select
              id="p-goal"
              name="goalType"
              defaultValue={values.goalType ?? ""}
            >
              <option value="">Not set</option>
              {GOAL_ORDER.map((g) => (
                <option key={g} value={g}>
                  {GOAL_LABELS[g]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={`Goal weight (${mass})`} htmlFor="p-goalweight">
            <Input
              id="p-goalweight"
              name="goalWeight"
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder={mass === "kg" ? "78" : "172"}
              defaultValue={massInput(values.goalWeightKg, units)}
            />
          </Field>

          <Field
            label={`Rate (${mass} per week)`}
            hint={
              mass === "kg"
                ? "0.5 is a common target for losing; 0.25 for gaining."
                : "1 lb is a common target for losing; 0.5 for gaining."
            }
            htmlFor="p-rate"
          >
            <Input
              id="p-rate"
              name="rateKgPerWeek"
              type="number"
              step="0.05"
              inputMode="decimal"
              placeholder={mass === "kg" ? "0.5" : "1.0"}
              defaultValue={massInput(values.rateKgPerWeek, units)}
            />
          </Field>

          <Field
            label="Goal body fat (%)"
            hint="For when the scale is the wrong scoreboard."
            htmlFor="p-goalbf"
          >
            <Input
              id="p-goalbf"
              name="goalBodyFatPct"
              type="number"
              step="0.5"
              inputMode="decimal"
              placeholder="15"
              defaultValue={values.goalBodyFatPct == null ? "" : String(values.goalBodyFatPct)}
            />
          </Field>

          <Field label={`Goal waist (${length})`} htmlFor="p-goalwaist">
            <Input
              id="p-goalwaist"
              name="goalWaist"
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder={length === "cm" ? "84" : "33"}
              defaultValue={lengthInput(values.goalWaistCm, units)}
            />
          </Field>

          <Field
            label="Target date"
            hint="A meet, a wedding, a season starting — whatever the date is."
            htmlFor="p-goaldate"
          >
            <Input id="p-goaldate" name="goalDate" type="date" defaultValue={values.goalDate} />
          </Field>

          <Field label="What it's for" htmlFor="p-goalnotes">
            <Input
              id="p-goalnotes"
              name="goalNotes"
              placeholder="First powerlifting meet in March"
              defaultValue={values.goalNotes ?? ""}
            />
          </Field>
        </div>
      </Section>

      <Section title="Activity">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Job"
            hint={
              values.occupationActivity && values.occupationActivity in OCCUPATION_HINTS
                ? OCCUPATION_HINTS[values.occupationActivity as keyof typeof OCCUPATION_HINTS]
                : `What ${their} work asks of ${self ? "you" : "them"} physically.`
            }
            htmlFor="p-job"
          >
            <Select
              id="p-job"
              name="occupationActivity"
              defaultValue={values.occupationActivity ?? ""}
            >
              <option value="">Not set</option>
              {OCCUPATION_ORDER.map((o) => (
                <option key={o} value={o}>
                  {OCCUPATION_LABELS[o]} — {OCCUPATION_HINTS[o]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Steps a day"
            hint="A typical day's average, from a phone or watch."
            htmlFor="p-steps"
          >
            <Input
              id="p-steps"
              name="dailySteps"
              type="number"
              min={0}
              step={500}
              inputMode="numeric"
              placeholder="8000"
              defaultValue={values.dailySteps == null ? "" : String(values.dailySteps)}
            />
          </Field>
        </div>

        <Field
          label="Activity level"
          hint={
            activitySuggestion ??
            (values.activityLevel && values.activityLevel in ACTIVITY_HINTS
              ? ACTIVITY_HINTS[values.activityLevel as keyof typeof ACTIVITY_HINTS]
              : `Everything outside ${their} training — this is what scales the estimate.`)
          }
          htmlFor="p-activity"
        >
          <Select
            id="p-activity"
            name="activityLevel"
            defaultValue={values.activityLevel ?? ""}
          >
            <option value="">Not set</option>
            {ACTIVITY_ORDER.map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_LABELS[a]} — {ACTIVITY_HINTS[a]}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Training">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Days a week" htmlFor="p-days">
            <Input
              id="p-days"
              name="trainingDaysPerWeek"
              type="number"
              min={0}
              max={7}
              inputMode="numeric"
              placeholder="4"
              defaultValue={
                values.trainingDaysPerWeek == null
                  ? ""
                  : String(values.trainingDaysPerWeek)
              }
            />
          </Field>

          <Field label="Session length (min)" htmlFor="p-session">
            <Input
              id="p-session"
              name="sessionMinutes"
              type="number"
              min={5}
              max={300}
              step={5}
              inputMode="numeric"
              placeholder="60"
              defaultValue={values.sessionMinutes == null ? "" : String(values.sessionMinutes)}
            />
          </Field>

          <Field
            label="Cardio (min a week)"
            hint="On top of the lifting — runs, rides, classes."
            htmlFor="p-cardio"
          >
            <Input
              id="p-cardio"
              name="cardioMinutesPerWeek"
              type="number"
              min={0}
              step={10}
              inputMode="numeric"
              placeholder="90"
              defaultValue={
                values.cardioMinutesPerWeek == null ? "" : String(values.cardioMinutesPerWeek)
              }
            />
          </Field>

          <Field label="Experience" htmlFor="p-experience">
            <Select
              id="p-experience"
              name="experience"
              defaultValue={values.experience ?? ""}
            >
              <option value="">Not set</option>
              {EXPERIENCE_ORDER.map((e) => (
                <option key={e} value={e}>
                  {EXPERIENCE_LABELS[e]} — {EXPERIENCE_HINTS[e]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={`Where ${they} train`} htmlFor="p-location">
            <Select
              id="p-location"
              name="trainingLocation"
              defaultValue={values.trainingLocation ?? ""}
            >
              <option value="">Not set</option>
              {TRAINING_LOCATION_ORDER.map((l) => (
                <option key={l} value={l}>
                  {TRAINING_LOCATION_LABELS[l]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Equipment"
            hint="The detail the dropdown can't hold."
            htmlFor="p-equipment"
          >
            <Input
              id="p-equipment"
              name="equipmentNotes"
              placeholder="Dumbbells to 24kg, bands, no rack"
              defaultValue={values.equipmentNotes ?? ""}
            />
          </Field>
        </div>

        <Field
          label="Injuries and limitations"
          hint={`What changes the programming — and what ${they}'re cleared for.`}
          htmlFor="p-injuries"
        >
          <Textarea
            id="p-injuries"
            name="injuries"
            rows={2}
            placeholder="Left shoulder — no overhead pressing, cleared for landmine work"
            defaultValue={values.injuries ?? ""}
          />
        </Field>
      </Section>

      <Section title="Nutrition">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Diet pattern" htmlFor="p-diet">
            <Select
              id="p-diet"
              name="dietPattern"
              defaultValue={values.dietPattern ?? ""}
            >
              <option value="">Not set</option>
              {DIET_PATTERN_ORDER.map((d) => (
                <option key={d} value={d}>
                  {DIET_PATTERN_LABELS[d]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Meals a day" htmlFor="p-meals">
            <Input
              id="p-meals"
              name="mealsPerDay"
              type="number"
              min={1}
              max={10}
              inputMode="numeric"
              placeholder="3"
              defaultValue={
                values.mealsPerDay == null ? "" : String(values.mealsPerDay)
              }
            />
          </Field>
        </div>

        {/* Its own field, never folded into the preferences box below: an
            allergy is a safety fact and belongs where it can't be skimmed
            past in a paragraph about disliking mushrooms. */}
        <Field
          label="Allergies"
          hint="Kept separate from preferences on purpose."
          htmlFor="p-allergies"
        >
          <Input
            id="p-allergies"
            name="allergies"
            placeholder="Peanuts, shellfish"
            defaultValue={values.allergies ?? ""}
          />
        </Field>

        <Field
          label="Preferences and dislikes"
          htmlFor="p-dietary"
        >
          <Textarea
            id="p-dietary"
            name="dietaryNotes"
            rows={2}
            placeholder="Doesn't cook on weekdays, hates fish"
            defaultValue={values.dietaryNotes ?? ""}
          />
        </Field>
      </Section>

      <Section title="Anything else">
        <Field
          label="Notes"
          hint={`Shift work, a 5am training window, what ${they}'re actually training for.`}
          htmlFor="p-notes"
        >
          <Textarea
            id="p-notes"
            name="notes"
            rows={3}
            defaultValue={values.notes ?? ""}
          />
        </Field>
      </Section>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:p-5">
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      {children}
    </Card>
  );
}
