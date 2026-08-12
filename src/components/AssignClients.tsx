"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Card, Field, Input, Select, FormError, buttonClass } from "@/components/ui";
import {
  SELF_LABEL,
  ATTENDANCE,
  ATTENDANCE_ORDER,
  ATTENDANCE_LABELS,
  ATTENDANCE_HINTS,
  SESSION_LENGTHS,
  DEFAULT_SESSION_LENGTH,
  sessionLengthLabel,
} from "@/lib/constants";

// Shared result shape for every "assign to clients" action (workout template,
// program, nutrition plan). The action composes its own success sentence.
export type AssignState = { error?: string; ok?: string };

export function AssignClients({
  action,
  clients,
  self,
  submitLabel,
  withDate = false,
  dateLabel = "Date",
  defaultDate,
  withSchedule = false,
}: {
  action: (state: AssignState, formData: FormData) => Promise<AssignState>;
  clients: { id: string; name: string }[];
  // The coach themselves, as one more thing this can be assigned to. Posted
  // under the same `clientId` name as everyone else, because on the row it
  // writes there is no difference — see src/lib/assignees.ts. Optional so a
  // surface that shouldn't offer it simply leaves it out.
  self?: { id: string };
  submitLabel: string;
  // Workouts/programs need a date (or start date); nutrition plans don't.
  withDate?: boolean;
  dateLabel?: string;
  defaultDate?: string;
  // Time of day, how long it runs, and whether the coach is there. Separate
  // from withDate because a nutrition plan has a date and none of the rest —
  // it isn't an appointment, it's a document. Both flags are off by default so
  // the plan page keeps the form it always had.
  withSchedule?: boolean;
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
        {/* Above the roster and behind a rule, rather than sorted into it. The
            list is names you'd scan for a particular person, and a "Yourself"
            that sorts under Y is one you'd never find; keeping it out of the
            grid also stops it landing in the second column at `sm`. */}
        {self ? (
          <div className={clients.length > 0 ? "mb-1 border-b border-line pb-1" : ""}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 transition-colors hover:bg-paper">
              <input
                type="checkbox"
                name="clientId"
                value={self.id}
                className="h-4 w-4 accent-jade"
              />
              <span className="text-sm text-ink">{SELF_LABEL}</span>
            </label>
          </div>
        ) : null}

        {clients.length === 0 ? (
          self ? (
            // Not an EmptyState: the form around it is perfectly usable with
            // only the row above ticked, and a full empty card here would say
            // otherwise. One line, and a way out of it.
            <p className="px-2.5 pb-1 text-xs text-ink-soft">
              No clients yet —{" "}
              <Link href="/clients" className="text-jade-strong hover:underline">
                add one
              </Link>{" "}
              to assign this to somebody else too.
            </p>
          ) : null
        ) : (
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
        )}
      </Card>

      {withSchedule ? (
        <div>
          <p className="eyebrow text-ink-soft">How it happens</p>
          <div className="mt-1.5 flex flex-col gap-2">
            {ATTENDANCE_ORDER.map((a) => (
              <label key={a} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="attendance"
                  value={a}
                  defaultChecked={a === ATTENDANCE.IN_PERSON}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-jade"
                />
                <span className="text-sm text-ink">
                  {ATTENDANCE_LABELS[a]}
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {ATTENDANCE_HINTS[a]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

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

        {withSchedule ? (
          <>
            {/* Optional, and left blank on purpose: assigning a block of
                homework to eight people rarely has a time of day, and a
                defaulted 9am would put eight appointments on the calendar
                that nobody chose. Filling it in is what turns a session into
                a booking. */}
            <Field label="Time (optional)" htmlFor="assign-time">
              <Input
                id="assign-time"
                name="startTime"
                type="time"
                className="metric"
              />
            </Field>
            <Field label="Length" htmlFor="assign-duration">
              <Select
                id="assign-duration"
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
          </>
        ) : null}

        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Assigning…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
