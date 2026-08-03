"use client";

import { useActionState, useState } from "react";
import type { CompleteState } from "@/app/(client)/my/actions";
import {
  PrescriptionCard,
  SectionHeading,
  exerciseMetrics,
  type Demo,
} from "@/components/PrescriptionCard";
import { Card, Textarea, FormError, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { groupBySection, usesSections } from "@/lib/workout-form";

type LogExercise = {
  id: string;
  order: number;
  name: string;
  sets: string | null;
  reps: string | null;
  weight: string | null;
  load: string | null;
  tempo: string | null;
  rest: string | null;
  notes: string | null;
  section: string;
  demo?: Demo;
};

function RpePicker() {
  const [value, setValue] = useState<number | null>(null);
  return (
    <div>
      <input type="hidden" name="rpe" value={value ?? ""} />
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }).map((_, i) => {
          const n = i + 1;
          const active = value != null && n <= value;
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setValue(n)}
              aria-pressed={selected}
              className={cn(
                "metric h-10 w-10 rounded-[8px] border text-sm font-medium transition-colors",
                active
                  ? "border-amber bg-amber text-white"
                  : "border-line bg-card text-ink-soft hover:border-amber/50",
                selected && "ring-2 ring-amber ring-offset-1",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WorkoutLogForm({
  action,
  notes,
  exercises,
}: {
  action: (state: CompleteState, formData: FormData) => Promise<CompleteState>;
  notes: string | null;
  exercises: LogExercise[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const showSections = usesSections(exercises);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormError>{state.error}</FormError>

      {notes ? (
        <p className="rounded-[var(--radius-sm)] border border-line bg-card px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {notes}
        </p>
      ) : null}

      <div className="flex flex-col gap-6">
        {groupBySection(exercises).map((group) => (
          <div key={group.section}>
            {showSections ? (
              <SectionHeading label={group.label} count={group.rows.length} />
            ) : null}
            <ul className="flex flex-col gap-3">
              {group.rows.map((ex) => (
                <li key={ex.id}>
                  <PrescriptionCard
                    index={ex.order}
                    name={ex.name}
                    metrics={exerciseMetrics(ex)}
                    notes={ex.notes}
                    demo={ex.demo}
                    footer={
                      <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3.5">
                        <label className="flex flex-1 flex-col gap-1">
                          <span className="eyebrow text-ink-soft/70">Reps done</span>
                          <input
                            name={`res_${ex.id}_reps`}
                            placeholder={ex.reps ?? "—"}
                            className="metric w-full rounded-[var(--radius-sm)] border border-line bg-paper px-2.5 py-2 text-sm text-ink focus-visible:border-jade focus-visible:outline-none"
                          />
                        </label>
                        <label className="flex flex-1 flex-col gap-1">
                          <span className="eyebrow text-ink-soft/70">Load used</span>
                          <input
                            name={`res_${ex.id}_load`}
                            // Prefer the prescribed weight: if the coach wrote
                            // an actual number, that's the more useful prompt.
                            placeholder={ex.weight ?? ex.load ?? "—"}
                            className="metric w-full rounded-[var(--radius-sm)] border border-line bg-paper px-2.5 py-2 text-sm text-ink focus-visible:border-jade focus-visible:outline-none"
                          />
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 py-2">
                          <input
                            type="checkbox"
                            name={`res_${ex.id}_done`}
                            defaultChecked
                            className="h-4.5 w-4.5 accent-jade"
                          />
                          <span className="text-sm text-ink">Done</span>
                        </label>
                      </div>
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="font-display text-base font-semibold text-ink">
          How hard was it?
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Rate the whole session, 1 (easy) to 10 (all out).
        </p>
        <div className="mt-3.5">
          <RpePicker />
        </div>

        <label className="mt-5 block">
          <span className="eyebrow text-ink-soft">A note for your coach</span>
          <Textarea
            name="comment"
            placeholder="How did it feel? Anything they should know?"
            className="mt-1.5"
          />
        </label>
      </Card>

      <button
        type="submit"
        disabled={pending}
        className={cn(buttonClass("primary"), "w-full")}
      >
        {pending ? "Sending to your coach…" : "Mark workout complete"}
      </button>
    </form>
  );
}
