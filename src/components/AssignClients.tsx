"use client";

import { useActionState } from "react";
import { Card, Field, Input, FormError, buttonClass } from "@/components/ui";

// Shared result shape for every "assign to clients" action (workout template,
// program, nutrition plan). The action composes its own success sentence.
export type AssignState = { error?: string; ok?: string };

export function AssignClients({
  action,
  clients,
  submitLabel,
  withDate = false,
  dateLabel = "Date",
  defaultDate,
}: {
  action: (state: AssignState, formData: FormData) => Promise<AssignState>;
  clients: { id: string; name: string }[];
  submitLabel: string;
  // Workouts/programs need a date (or start date); nutrition plans don't.
  withDate?: boolean;
  dateLabel?: string;
  defaultDate?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError>{state.error}</FormError>
      {state.ok ? (
        <p className="rounded-[var(--radius-sm)] border border-jade/25 bg-jade-wash px-3.5 py-2.5 text-sm text-jade-strong">
          {state.ok}
        </p>
      ) : null}

      <Card className="p-3">
        <div className="grid gap-1 sm:grid-cols-2">
          {clients.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 transition-colors hover:bg-paper"
            >
              <input
                type="checkbox"
                name="clientId"
                value={c.id}
                className="h-4 w-4 accent-jade"
              />
              <span className="text-sm text-ink">{c.name}</span>
            </label>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        {withDate ? (
          <Field label={dateLabel} htmlFor="assign-date">
            <Input
              id="assign-date"
              name="date"
              type="date"
              defaultValue={defaultDate ?? ""}
              required
            />
          </Field>
        ) : null}
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Assigning…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
