"use client";

import { useActionState, useMemo, useState } from "react";
import type { CompleteState } from "@/app/(client)/my/actions";
import {
  PrescriptionCard,
  SectionHeading,
  exerciseMetrics,
  type Demo,
} from "@/components/PrescriptionCard";
import { Card, Textarea, FormError, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { LogHints } from "@/lib/exercise-progression";
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
  // What this athlete logged against this movement last time, already worded
  // for the placeholder by logHints(). Undefined on a movement they have never
  // logged, and individual keys are missing for boxes they left blank then.
  hints?: LogHints;
};

// The two result boxes. Typed values keep the tabular mono of a program sheet,
// but the hint is prose, so the placeholder drops to the body face — and to
// 12px on phones, where the pair shares a 375px row and mono would clip
// "Weight you used". The field itself stays 16px there (see globals.css) so
// iOS doesn't zoom on focus.
const hintInput =
  "metric min-h-12 w-full rounded-[var(--radius-sm)] border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:font-body placeholder:text-xs placeholder:text-ink-soft/60 focus-visible:border-jade focus-visible:outline-none sm:min-h-0 sm:placeholder:text-sm";

function RpePicker() {
  const [value, setValue] = useState<number | null>(null);
  return (
    <div>
      <input type="hidden" name="rpe" value={value ?? ""} />
      {/* Five per row, filling the width: at 375px this gives ~62px targets
          instead of the 40px squares that a wrapping flex row produced. */}
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
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
                "metric h-12 rounded-[8px] border text-sm font-medium transition-colors sm:h-10",
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

// The done control. A full-width bar rather than a checkbox beside a word:
// this is the single most-tapped thing in the app and it used to be 18x18px,
// which is a miss waiting to happen with chalk on your hands.
function DoneToggle({
  name,
  checked,
  onChange,
}: {
  name: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-12 cursor-pointer select-none items-center gap-3 rounded-[var(--radius-sm)] border px-3.5 transition-colors",
        checked
          ? "border-jade/40 bg-jade-wash text-ink"
          : "border-line bg-paper text-ink-soft",
      )}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      {/* Drawn box, so the tick can carry the accent in both themes and pick
          up the same focus ring as everything else. */}
      <span
        aria-hidden
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-[6px] border-2 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-jade)]",
          checked ? "border-jade bg-jade text-white" : "border-line bg-card",
        )}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 20 20"
          fill="none"
          className={cn("transition-opacity", checked ? "opacity-100" : "opacity-0")}
        >
          <path
            d="M4 11 L8 15 L16 5"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-sm font-medium">
        {checked ? "Done" : "Skipped"}
      </span>
    </label>
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

  // Everything starts done — the common case is "I did what was written" and
  // you uncheck what you actually skipped. So this is not a progress bar
  // filling up; it is a running answer to "what am I about to send my coach".
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(exercises.map((e) => [e.id, true])),
  );

  const doneCount = useMemo(
    () => exercises.filter((e) => done[e.id]).length,
    [exercises, done],
  );
  const total = exercises.length;
  const skipped = total - doneCount;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormError>{state.error}</FormError>

      {/* ---- The chalk line ---------------------------------------------------
          Sticks under the app header for the whole session. In a gym you are
          scrolling with one hand between sets, and the two things you lose
          track of are how far along you are and what you have skipped. */}
      <div className="sticky top-14 z-10 -mx-5 border-b border-line bg-paper/95 px-5 py-2.5 backdrop-blur sm:top-16 sm:-mx-8 sm:px-8">
        <div className="flex items-baseline justify-between gap-3">
          <p className="metric text-xs text-ink-soft">
            <span className="font-semibold text-ink">{doneCount}</span> of {total} done
            {skipped > 0 ? (
              <span className="text-ink-soft/70"> · {skipped} skipped</span>
            ) : null}
          </p>
          {skipped === 0 ? (
            <p className="eyebrow text-jade-strong">Full session</p>
          ) : null}
        </div>
        <div
          className="mt-2 h-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Exercises marked done"
        >
          <div
            className="h-full rounded-full bg-jade transition-[width] duration-300 ease-out"
            style={{ width: total ? `${(doneCount / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

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
                    struck={done[ex.id]}
                    footer={
                      <div className="flex flex-col gap-2.5 border-t border-line pt-3.5">
                        {/* Sets and reps are short, so they pair up even at
                            375px. Load takes the full row underneath, because
                            three across a phone leaves ~55px of text width and
                            "Weight you used" needs 88px. From sm: up there's
                            room for all three. */}
                        {/* Placeholders, not values: a movement you have done
                            before hints at what you did last time and what to
                            aim for, and still submits blank if you don't type.
                            Nothing here can log a number you didn't lift. */}
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                          <label className="flex flex-col gap-1">
                            <span className="eyebrow text-ink-soft/70">
                              Sets done
                            </span>
                            <input
                              name={`res_${ex.id}_sets`}
                              inputMode="numeric"
                              placeholder={ex.hints?.sets ?? "Sets you did"}
                              className={hintInput}
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="eyebrow text-ink-soft/70">
                              Reps done
                            </span>
                            <input
                              name={`res_${ex.id}_reps`}
                              inputMode="numeric"
                              placeholder={ex.hints?.reps ?? "Reps you did"}
                              className={hintInput}
                            />
                          </label>
                          <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                            <span className="eyebrow text-ink-soft/70">
                              Load used
                            </span>
                            <input
                              name={`res_${ex.id}_load`}
                              inputMode="decimal"
                              // The fallback says what to enter rather than
                              // echoing the prescription — that already sits in
                              // the metric strip a few pixels above these
                              // fields, so repeating it would cost a line and
                              // tell the athlete nothing new. Their own history
                              // is not in the strip, which is why it earns the
                              // space when there is any.
                              placeholder={ex.hints?.load ?? "Weight you used"}
                              className={hintInput}
                            />
                          </label>
                        </div>
                        <DoneToggle
                          name={`res_${ex.id}_done`}
                          checked={done[ex.id] ?? false}
                          onChange={(next) =>
                            setDone((d) => ({ ...d, [ex.id]: next }))
                          }
                        />
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
