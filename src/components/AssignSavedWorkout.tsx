"use client";

import { useActionState } from "react";
import type { AssignState } from "@/components/AssignClients";
import { Field, Input, Select, FormError, buttonClass } from "@/components/ui";

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

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Saved workout" htmlFor="assign-template">
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
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Assigning…" : "Assign"}
        </button>
      </div>
    </form>
  );
}
