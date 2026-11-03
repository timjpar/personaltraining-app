"use client";

import { useActionState, useRef, type ReactNode } from "react";
import { FormHeading } from "@/components/EditorActions";
import { useFieldHistory } from "@/components/useFieldHistory";
import {
  Button,
  Card,
  Field,
  FormError,
  Input,
  Textarea,
} from "@/components/ui";
import { massUnit, lengthUnit, massInput, lengthInput } from "@/lib/units";
import { TAPE_SITES, type Units } from "@/lib/constants";
import type { BodyState } from "@/lib/body-form";

const initial: BodyState = {};

export type MeasurementValues = {
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  neckCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  thighCm: number | null;
  armCm: number | null;
  calfCm: number | null;
  notes: string | null;
};

// One weigh-in. Two shapes from one component:
//
//   compact — a date and a weight, for the coach standing next to a client
//     with thirty seconds. This is the path that gets used, so it is one row
//     and one button with nothing in front of it.
//   full — every tape site as well, for the measuring appointment.
//
// Uncontrolled throughout. There is no cross-field behaviour to coordinate, so
// defaultValue plus the server parser is the whole story — unlike
// NutritionBuilder, which has to be controlled because it edits a tree.
export function MeasurementForm({
  action,
  units,
  values,
  compact = false,
  submitLabel = "Save",
  heading,
}: {
  action: (prev: BodyState, formData: FormData) => Promise<BodyState>;
  units: Units;
  values: MeasurementValues;
  compact?: boolean;
  submitLabel?: string;
  // The full form's heading, drawn here so a second save can sit beside it:
  // on a phone the tape sites put the bottom button a screen away. The
  // compact form is one row with its button in it, and has none.
  heading?: { title: string; intro?: ReactNode };
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const mass = massUnit(units);
  const length = lengthUnit(units);
  const formRef = useRef<HTMLFormElement>(null);
  useFieldHistory(formRef);

  const saveButton = (size?: "sm") => (
    <Button type="submit" data-save size={size} disabled={pending} className={compact ? "sm:w-auto" : undefined}>
      {pending ? "Saving…" : submitLabel}
    </Button>
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {heading && !compact ? (
        <div className="mb-1">
          <FormHeading title={heading.title} intro={heading.intro} size="base">
            {saveButton("sm")}
          </FormHeading>
        </div>
      ) : null}

      {/* Tells the parser how to read the numbers above — the conversion to
          metric happens server-side, in one place. */}
      <input type="hidden" name="units" value={units} />

      <FormError>{state.error}</FormError>
      {state.ok ? (
        <p className="rounded-[var(--radius-sm)] border border-jade/20 bg-jade-wash px-3.5 py-2.5 text-sm text-jade-strong">
          {state.ok}
        </p>
      ) : null}

      <div
        className={
          compact
            ? "grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            : "grid gap-3 sm:grid-cols-3"
        }
      >
        <Field label="Date" htmlFor="m-date">
          <Input
            id="m-date"
            name="date"
            type="date"
            defaultValue={values.date}
            required
          />
        </Field>

        <Field label={`Weight (${mass})`} htmlFor="m-weight">
          <Input
            id="m-weight"
            name="weight"
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder={mass === "kg" ? "74.8" : "165.0"}
            defaultValue={massInput(values.weightKg, units)}
          />
        </Field>

        {compact ? (
          saveButton()
        ) : (
          <Field label="Body fat (%)" htmlFor="m-bodyfat">
            <Input
              id="m-bodyfat"
              name="bodyFatPct"
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="18.5"
              defaultValue={values.bodyFatPct == null ? "" : String(values.bodyFatPct)}
            />
          </Field>
        )}
      </div>

      {compact ? null : (
        <>
          <Card className="p-4">
            <p className="eyebrow mb-3 text-ink-soft">Tape ({length})</p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {TAPE_SITES.map((site) => (
                <Field key={site.key} label={site.label} htmlFor={`m-${site.key}`}>
                  <Input
                    id={`m-${site.key}`}
                    name={site.key}
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    defaultValue={lengthInput(values[site.key], units)}
                  />
                </Field>
              ))}
            </div>
          </Card>

          <Field
            label="Note"
            hint="What makes the number legible later — time of day, a bad week of sleep, travelling."
            htmlFor="m-notes"
          >
            <Textarea
              id="m-notes"
              name="notes"
              rows={2}
              defaultValue={values.notes ?? ""}
            />
          </Field>

          <div>{saveButton()}</div>
        </>
      )}
    </form>
  );
}
