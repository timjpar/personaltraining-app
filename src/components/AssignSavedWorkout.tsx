"use client";

import { useActionState } from "react";
import type { AssignState } from "@/components/AssignClients";
import { Field, Input, Select, FormError, buttonClass } from "@/components/ui";
import {
  ATTENDANCE,
  ATTENDANCE_ORDER,
  ATTENDANCE_LABELS,
  SESSION_LENGTHS,
  DEFAULT_SESSION_LENGTH,
  sessionLengthLabel,
} from "@/lib/constants";

// The reverse of AssignClients: the client is fixed (this page), the trainer
// picks one of their saved workouts and a date. Used on the client detail page.
export function AssignSavedWorkout({
  action,
  templates,
  defaultDate,
}: {
  action: (state: AssignState, formData: FormData) => Promise<AssignState>;
  templates: { id: string; title: string }[];
  defaultDate?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError>{state.error}</FormError>
      {state.ok ? (
        <p className="rounded-[var(--radius-sm)] border border-jade/25 bg-jade-wash px-3.5 py-2.5 text-sm text-jade-strong">
          {state.ok}
        </p>
      ) : null}

      {/* Wraps rather than a fixed column count. This row went from three
          controls to six when time, length and attendance arrived, and six
          tracks laid out from the sm breakpoint up gives each about 90px —
          enough to truncate "Choose a workout…" down to nothing on a tablet.
          Flowing them lets the wide ones keep their width and the row grow a
          line taller instead. */}
      <div className="flex flex-wrap items-end gap-3">
        <Field
          label="Saved workout"
          htmlFor="assign-template"
          className="min-w-56 flex-1"
        >
          <Select id="assign-template" name="templateId" defaultValue="" required>
            <option value="" disabled>
              Choose a workout…
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor="assign-template-date">
          <Input
            id="assign-template-date"
            name="date"
            type="date"
            defaultValue={defaultDate ?? ""}
            required
          />
        </Field>
        <Field label="Time" htmlFor="assign-template-time">
          <Input
            id="assign-template-time"
            name="startTime"
            type="time"
            className="metric"
          />
        </Field>
        <Field label="Length" htmlFor="assign-template-duration">
          <Select
            id="assign-template-duration"
            name="duration"
            defaultValue={String(DEFAULT_SESSION_LENGTH)}
          >
            {SESSION_LENGTHS.map((m) => (
              <option key={m} value={m}>
                {sessionLengthLabel(m)}
              </option>
            ))}
          </Select>
        </Field>
        {/* A select rather than the builder's radio pair with its hints: this
            is one inline row and two stacked options with explanations would
            be taller than everything beside it. */}
        <Field label="How" htmlFor="assign-template-attendance">
          <Select
            id="assign-template-attendance"
            name="attendance"
            defaultValue={ATTENDANCE.IN_PERSON}
          >
            {ATTENDANCE_ORDER.map((a) => (
              <option key={a} value={a}>
                {ATTENDANCE_LABELS[a]}
              </option>
            ))}
          </Select>
        </Field>
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Assigning…" : "Assign"}
        </button>
      </div>
    </form>
  );
}
