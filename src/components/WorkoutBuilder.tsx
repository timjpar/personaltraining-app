"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { WorkoutFormState } from "@/app/(trainer)/workout-actions";
import { ExercisePicker } from "@/components/ExercisePicker";
import { Card, Field, Input, Textarea, FormError, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  SECTION_ORDER,
  SECTION_LABELS,
  toExerciseSection,
  type ExerciseSection,
} from "@/lib/constants";
import type { PickerCatalog } from "@/lib/exercise-catalog";
import { SECTION_PRESET_CATEGORY } from "@/lib/exercise-presets";

type BuilderExercise = {
  id: string;
  name?: string | null;
  sets?: string | null;
  reps?: string | null;
  weight?: string | null;
  load?: string | null;
  tempo?: string | null;
  rest?: string | null;
  notes?: string | null;
  section?: string | null;
};

type Initial = {
  title?: string;
  scheduledDate?: string; // yyyy-mm-dd
  notes?: string | null;
  exercises?: BuilderExercise[];
};

type Rows = Record<ExerciseSection, BuilderExercise[]>;

type MetricDef = { key: keyof BuilderExercise; label: string; placeholder: string };

// Sets and reps are on every row. Everything else is opt-in — most sessions
// never need tempo, and five always-present inputs made every row look busier
// than the programming actually was.
const CORE_METRICS: MetricDef[] = [
  { key: "sets", label: "Sets", placeholder: "4" },
  { key: "reps", label: "Reps", placeholder: "8-10" },
];

const OPTIONAL_METRICS: MetricDef[] = [
  { key: "weight", label: "Weight", placeholder: "100kg" },
  { key: "load", label: "Load", placeholder: "70%" },
  { key: "tempo", label: "Tempo", placeholder: "30X1" },
  { key: "rest", label: "Rest", placeholder: "90s" },
];

// A row that already carries any optional value opens expanded, so editing an
// existing session never hides programming behind a closed disclosure.
const hasOptional = (row: BuilderExercise) =>
  OPTIONAL_METRICS.some((m) => {
    const v = row[m.key];
    return typeof v === "string" && v.trim() !== "";
  });

const ADD_LABEL: Record<ExerciseSection, string> = {
  WARMUP: "+ Add warm-up",
  MAIN: "+ Add exercise",
  COOLDOWN: "+ Add cool-down",
};

// Rows added after mount get a random id (client-only, so no hydration concern).
const newRow = (): BuilderExercise => ({ id: crypto.randomUUID() });

// The single fallback row rendered on the server uses a deterministic id so the
// server and client markup match on first paint. Only the main section gets
// one — warm-up and cool-down start empty and stay out of the way.
const seedRows = (initial?: Initial): Rows => {
  const rows: Rows = { WARMUP: [], MAIN: [], COOLDOWN: [] };
  if (initial?.exercises?.length) {
    for (const ex of initial.exercises) {
      rows[toExerciseSection(ex.section)].push(ex);
    }
  }
  if (SECTION_ORDER.every((s) => rows[s].length === 0)) {
    rows.MAIN.push({ id: "row-1" });
  }
  return rows;
};

export function WorkoutBuilder({
  action,
  submitLabel,
  cancelHref,
  initial,
  showDate = true,
  catalog,
}: {
  action: (state: WorkoutFormState, formData: FormData) => Promise<WorkoutFormState>;
  submitLabel: string;
  cancelHref: string;
  initial?: Initial;
  // Templates have no date; hide the field and skip the requirement.
  showDate?: boolean;
  // The trainer's own recent and custom exercise names. Presets come from the
  // picker's own import — they're the same for everyone.
  catalog: PickerCatalog;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [rows, setRows] = useState<Rows>(() => seedRows(initial));

  const total = SECTION_ORDER.reduce((n, s) => n + rows[s].length, 0);

  const addRow = (section: ExerciseSection) =>
    setRows((r) => ({ ...r, [section]: [...r[section], newRow()] }));

  // Warm-up and cool-down may empty out completely; the form as a whole may
  // not, which is the guarantee the single-row builder had before.
  const removeRow = (section: ExerciseSection, id: string) =>
    setRows((r) => (total > 1 ? { ...r, [section]: r[section].filter((x) => x.id !== id) } : r));

  // Visible numbering runs 01..N across the three sections, matching the global
  // `order` the server assigns — so the builder and the detail page agree.
  const numberOffset = (section: ExerciseSection) =>
    SECTION_ORDER.slice(0, SECTION_ORDER.indexOf(section)).reduce(
      (n, s) => n + rows[s].length,
      0,
    );

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
          <span className="metric text-xs text-ink-soft">{total} programmed</span>
        </div>

        {SECTION_ORDER.map((s) => (
          <input
            key={s}
            type="hidden"
            name={`rowIds_${s}`}
            value={rows[s].map((r) => r.id).join(",")}
          />
        ))}

        <div className="flex flex-col gap-6">
          {SECTION_ORDER.map((section) => {
            const preferred = SECTION_PRESET_CATEGORY[section];
            const offset = numberOffset(section);
            return (
              <div key={section}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="eyebrow text-ink-soft">{SECTION_LABELS[section]}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>

                <div className="flex flex-col gap-3">
                  {rows[section].map((row, i) => {
                    const n = offset + i + 1;
                    return (
                      <Card key={row.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="metric grid h-7 min-w-7 place-items-center rounded-[6px] border border-line bg-paper px-1.5 text-xs font-medium text-ink-soft">
                            {String(n).padStart(2, "0")}
                          </span>
                          <ExercisePicker
                            name={`ex_${row.id}_name`}
                            defaultValue={row.name}
                            catalog={catalog}
                            preferredCategories={preferred ? [preferred] : undefined}
                            className="flex-1"
                            aria-label={`Exercise ${n} name`}
                          />
                          <button
                            type="button"
                            onClick={() => removeRow(section, row.id)}
                            aria-label={`Remove exercise ${n}`}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-colors hover:bg-paper hover:text-flag"
                          >
                            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
                              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          {CORE_METRICS.map((m) => (
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

                        {/* Native <details>: works with no JavaScript and is
                            keyboard accessible for free, which keeps the
                            builder's progressive-enhancement property. */}
                        <details open={hasOptional(row)} className="group mt-2.5">
                          <summary className="eyebrow inline-flex cursor-pointer list-none items-center gap-1.5 text-ink-soft transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                            <span
                              aria-hidden
                              className="transition-transform group-open:rotate-45"
                            >
                              +
                            </span>
                            Weight, load, tempo &amp; rest
                          </summary>
                          <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                            {OPTIONAL_METRICS.map((m) => (
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
                        </details>

                        <Input
                          name={`ex_${row.id}_notes`}
                          defaultValue={row.notes ?? ""}
                          placeholder="Coaching note (optional)"
                          className="mt-2.5 text-sm"
                          aria-label={`Exercise ${n} note`}
                        />
                      </Card>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => addRow(section)}
                  className={cn(
                    buttonClass("outline", "sm"),
                    "w-full",
                    rows[section].length > 0 && "mt-3",
                  )}
                >
                  {ADD_LABEL[section]}
                </button>
              </div>
            );
          })}
        </div>
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
