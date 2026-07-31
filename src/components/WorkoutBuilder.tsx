"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { WorkoutFormState } from "@/app/(trainer)/workout-actions";
import { Card, Field, Input, Textarea, FormError, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";

type BuilderExercise = {
  id: string;
  name?: string | null;
  sets?: string | null;
  reps?: string | null;
  load?: string | null;
  tempo?: string | null;
  rest?: string | null;
  notes?: string | null;
};

type Initial = {
  title?: string;
  scheduledDate?: string; // yyyy-mm-dd
  notes?: string | null;
  exercises?: BuilderExercise[];
};

const METRICS: { key: keyof BuilderExercise; label: string; placeholder: string }[] = [
  { key: "sets", label: "Sets", placeholder: "4" },
  { key: "reps", label: "Reps", placeholder: "8-10" },
  { key: "load", label: "Load", placeholder: "70%" },
  { key: "tempo", label: "Tempo", placeholder: "30X1" },
  { key: "rest", label: "Rest", placeholder: "90s" },
];

// Rows added after mount get a random id (client-only, so no hydration concern).
const newRow = (): BuilderExercise => ({ id: crypto.randomUUID() });
// The single fallback row rendered on the server uses a deterministic id so the
// server and client markup match on first paint.
const seedRow = (): BuilderExercise => ({ id: "row-1" });

export function WorkoutBuilder({
  action,
  submitLabel,
  cancelHref,
  initial,
  showDate = true,
}: {
  action: (state: WorkoutFormState, formData: FormData) => Promise<WorkoutFormState>;
  submitLabel: string;
  cancelHref: string;
  initial?: Initial;
  // Templates have no date; hide the field and skip the requirement.
  showDate?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [rows, setRows] = useState<BuilderExercise[]>(
    initial?.exercises?.length ? initial.exercises : [seedRow()],
  );

  const addRow = () => setRows((r) => [...r, newRow()]);
  const removeRow = (id: string) =>
    setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormError>{state.error}</FormError>

      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Session title" htmlFor="title">
            <Input
              id="title"
              name="title"
              placeholder="Lower Body A"
              defaultValue={initial?.title ?? ""}
              required
            />
          </Field>
        </div>
        {showDate ? (
          <Field label="Date" htmlFor="scheduledDate">
            <Input
              id="scheduledDate"
              name="scheduledDate"
              type="date"
              defaultValue={initial?.scheduledDate ?? ""}
              required
            />
          </Field>
        ) : null}
        <div className="sm:col-span-2">
          <Field label="Notes for the athlete" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              placeholder="Warm up thoroughly. Quality over load today."
              defaultValue={initial?.notes ?? ""}
            />
          </Field>
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Exercises</h2>
          <span className="metric text-xs text-ink-soft">{rows.length} programmed</span>
        </div>

        <input type="hidden" name="rowIds" value={rows.map((r) => r.id).join(",")} />

        <div className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <Card key={row.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="metric grid h-7 min-w-7 place-items-center rounded-[6px] border border-line bg-paper px-1.5 text-xs font-medium text-ink-soft">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Input
                  name={`ex_${row.id}_name`}
                  defaultValue={row.name ?? ""}
                  placeholder="Exercise name"
                  className="flex-1 font-medium"
                  aria-label={`Exercise ${i + 1} name`}
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label={`Remove exercise ${i + 1}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-colors hover:bg-paper hover:text-flag"
                >
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {METRICS.map((m) => (
                  <label key={m.key} className="flex flex-col gap-1">
                    <span className="eyebrow text-ink-soft/70">{m.label}</span>
                    <Input
                      name={`ex_${row.id}_${m.key}`}
                      defaultValue={(row[m.key] as string) ?? ""}
                      placeholder={m.placeholder}
                      className={cn("metric px-2.5 py-2 text-sm")}
                    />
                  </label>
                ))}
              </div>

              <Input
                name={`ex_${row.id}_notes`}
                defaultValue={row.notes ?? ""}
                placeholder="Coaching note (optional)"
                className="mt-2.5 text-sm"
                aria-label={`Exercise ${i + 1} note`}
              />
            </Card>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className={cn(buttonClass("outline"), "mt-3 w-full")}
        >
          + Add exercise
        </button>
      </div>

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
