"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EventFormState } from "@/app/(trainer)/calendar/actions";
import {
  Card,
  Field,
  Input,
  Select,
  Textarea,
  FormError,
  buttonClass,
} from "@/components/ui";
import { EVENT_KIND_LABELS, EVENT_KIND_ORDER, type EventKind } from "@/lib/constants";

// Plain uncontrolled inputs — unlike the nutrition builder there's no nested
// structure to serialize, so FormData carries the whole form on its own.
export function EventForm({
  action,
  submitLabel,
  cancelHref,
  clients,
  initial,
}: {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  submitLabel: string;
  cancelHref: string;
  clients: { id: string; name: string }[];
  initial?: {
    title?: string;
    notes?: string | null;
    date?: string; // yyyy-mm-dd
    start?: string; // "HH:MM"
    end?: string;
    kind?: EventKind;
    clientId?: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError>{state.error}</FormError>

      <Card className="grid gap-3.5 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="What is it?" htmlFor="title">
            <Input
              id="title"
              name="title"
              placeholder="Maria — intake consult"
              defaultValue={initial?.title ?? ""}
              required
            />
          </Field>
        </div>

        <Field label="Type" htmlFor="kind">
          <Select id="kind" name="kind" defaultValue={initial?.kind ?? "SESSION"}>
            {EVENT_KIND_ORDER.map((k) => (
              <option key={k} value={k}>
                {EVENT_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Client (optional)" htmlFor="clientId">
          <Select
            id="clientId"
            name="clientId"
            defaultValue={initial?.clientId ?? ""}
          >
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Date" htmlFor="date">
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={initial?.date ?? ""}
            className="metric"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Start" htmlFor="start">
            <Input
              id="start"
              name="start"
              type="time"
              defaultValue={initial?.start ?? ""}
              className="metric"
            />
          </Field>
          <Field label="End" htmlFor="end">
            <Input
              id="end"
              name="end"
              type="time"
              defaultValue={initial?.end ?? ""}
              className="metric"
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Notes (optional)" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              placeholder="Bring the InBody printout. 30 min, studio 2."
              defaultValue={initial?.notes ?? ""}
            />
          </Field>
        </div>

        <p className="text-xs text-ink-soft sm:col-span-2">
          Leave the times blank for an all-day entry.
        </p>
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
