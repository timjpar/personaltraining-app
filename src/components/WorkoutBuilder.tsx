"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { WorkoutFormState } from "@/app/(trainer)/workout-actions";
import { ExercisePicker } from "@/components/ExercisePicker";
import { Card, Field, Input, Select, Textarea, FormError, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  SECTION_ORDER,
  SECTION_LABELS,
  DISCIPLINE_ORDER,
  DISCIPLINE_LABELS,
  ATTENDANCE_ORDER,
  ATTENDANCE_LABELS,
  ATTENDANCE_HINTS,
  SESSION_LENGTHS,
  DEFAULT_SESSION_LENGTH,
  sessionLengthLabel,
  toExerciseSection,
  toDiscipline,
  toAttendance,
  toSessionLength,
  type ExerciseSection,
} from "@/lib/constants";
import type { PickerCatalog } from "@/lib/exercise-catalog";
import {
  SECTION_PRESET_CATEGORY,
  normalizeExerciseName,
} from "@/lib/exercise-presets";

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
  // Which optional metrics this row is currently showing. Each is added and
  // removed on its own — a row can carry Weight without Rest.
  extras?: OptionalKey[];
  // The demo link, and the one field on the row that isn't about this session:
  // it saves against the movement's catalog entry, so every workout that
  // programs the name gets the video. Undefined means "nobody has touched this
  // box", which is what lets it keep following the movement the row names;
  // once it holds a string, that string is what saves.
  video?: string;
  // Whether the demo box is open. A row whose movement already has a video
  // opens on its own — see videoFor — so this only tracks the chip.
  showVideo?: boolean;
};

type Initial = {
  title?: string;
  scheduledDate?: string; // yyyy-mm-dd
  startTime?: string; // "HH:MM", blank for a session with no set time
  notes?: string | null;
  discipline?: string | null;
  // IN_PERSON | SOLO. Absent on a template, and on a new session — where
  // toAttendance turns it into IN_PERSON, so the radio pair always has exactly
  // one option checked rather than starting with neither.
  attendance?: string | null;
  // Absent on a template and on anything scheduled before lengths existed;
  // both fall back to the default hour rather than showing a blank option
  // that would save as "no length" the moment someone touches the form.
  durationMinutes?: number | null;
  exercises?: BuilderExercise[];
};

type Rows = Record<ExerciseSection, BuilderExercise[]>;

type OptionalKey = "weight" | "load" | "tempo" | "rest";

type MetricDef = { key: keyof BuilderExercise; label: string; placeholder: string };

// Sets and reps are on every row. Everything else is opt-in — most sessions
// never need tempo, and five always-present inputs made every row look busier
// than the programming actually was.
const CORE_METRICS: MetricDef[] = [
  { key: "sets", label: "Sets", placeholder: "4" },
  { key: "reps", label: "Reps", placeholder: "8-10" },
];

const OPTIONAL_METRICS: { key: OptionalKey; label: string; placeholder: string }[] = [
  { key: "weight", label: "Weight", placeholder: "100kg" },
  { key: "load", label: "Load", placeholder: "70%" },
  { key: "tempo", label: "Tempo", placeholder: "30X1" },
  { key: "rest", label: "Rest", placeholder: "90s" },
];

// On an existing session, show exactly the optional metrics that carry a value —
// so editing never hides programming, and never shows four empty boxes either.
const initialExtras = (row: BuilderExercise): OptionalKey[] =>
  OPTIONAL_METRICS.filter((m) => {
    const v = row[m.key];
    return typeof v === "string" && v.trim() !== "";
  }).map((m) => m.key);

const ADD_LABEL: Record<ExerciseSection, string> = {
  WARMUP: "+ Add warm-up",
  MAIN: "+ Add exercise",
  COOLDOWN: "+ Add cool-down",
};

// Rows added after mount get a random id (client-only, so no hydration concern).
const newRow = (): BuilderExercise => ({ id: crypto.randomUUID(), extras: [] });

// The single fallback row rendered on the server uses a deterministic id so the
// server and client markup match on first paint. Only the main section gets
// one — warm-up and cool-down start empty and stay out of the way.
const seedRows = (initial?: Initial): Rows => {
  const rows: Rows = { WARMUP: [], MAIN: [], COOLDOWN: [] };
  if (initial?.exercises?.length) {
    for (const ex of initial.exercises) {
      rows[toExerciseSection(ex.section)].push({ ...ex, extras: initialExtras(ex) });
    }
  }
  if (SECTION_ORDER.every((s) => rows[s].length === 0)) {
    rows.MAIN.push({ id: "row-1", extras: [] });
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

  // Adding and removing an optional metric is per-row and per-metric, so a row
  // can carry Weight and nothing else. Removing unmounts the input, which both
  // clears the value and means the parser reads it as absent — no risk of a
  // hidden field quietly submitting a value the coach can't see.
  const toggleExtra = (section: ExerciseSection, id: string, key: OptionalKey, on: boolean) =>
    setRows((r) => ({
      ...r,
      [section]: r[section].map((row) => {
        if (row.id !== id) return row;
        const extras = row.extras ?? [];
        return {
          ...row,
          extras: on ? [...extras, key] : extras.filter((k) => k !== key),
          // Drop the stored value too, so re-adding starts empty rather than
          // resurrecting what was there before.
          ...(on ? {} : { [key]: null }),
        };
      }),
    }));

  // One updater for the two fields the row owns outright. The metrics stay
  // uncontrolled — FormData reads them straight off the DOM — but the movement
  // name and the demo link have to be in state, because each is rendered by
  // the other's neighbour.
  const patchRow = (
    section: ExerciseSection,
    id: string,
    patch: Partial<BuilderExercise>,
  ) =>
    setRows((r) => ({
      ...r,
      [section]: r[section].map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    }));

  // What the demo box shows: whatever the coach typed, else the video this
  // movement already has. The fallback is the point — pick "Back Squat" and the
  // demo you saved months ago is sitting there, rather than an empty box that
  // implies there isn't one.
  const videoFor = (row: BuilderExercise) => {
    const key = normalizeExerciseName(row.name ?? "");
    return row.video ?? (key ? (catalog.media[key] ?? "") : "");
  };

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
          <div className="grid grid-cols-[1fr_auto_auto] gap-3">
            <Field label="Date" htmlFor="scheduledDate">
              <Input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                defaultValue={initial?.scheduledDate ?? ""}
                required
              />
            </Field>
            {/* Optional — it only decides where the session sits on the
                calendar. Sessions created from a template or a program have
                none, and read as all-day. */}
            <Field label="Time" htmlFor="startTime">
              <Input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={initial?.startTime ?? ""}
                className="metric"
              />
            </Field>
            {/* Beside the time it measures from, and ignored on save when
                that's blank — an all-day session has no block to be long. */}
            <Field label="Length" htmlFor="duration">
              <Select
                id="duration"
                name="duration"
                defaultValue={String(
                  toSessionLength(initial?.durationMinutes) ??
                    DEFAULT_SESSION_LENGTH,
                )}
              >
                {SESSION_LENGTHS.map((m) => (
                  <option key={m} value={m}>
                    {sessionLengthLabel(m)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}
        {/* Sits in the cell the date row leaves empty on desktop. Defaults to
            Strength — the column default, and what most sessions are — so a
            coach who never touches it still gets an honest answer. */}
        <Field label="Discipline" htmlFor="discipline">
          <Select
            id="discipline"
            name="discipline"
            defaultValue={toDiscipline(initial?.discipline)}
          >
            {DISCIPLINE_ORDER.map((d) => (
              <option key={d} value={d}>
                {DISCIPLINE_LABELS[d]}
              </option>
            ))}
          </Select>
        </Field>
        {/* Only on a dated session. A template has no date and nobody to meet,
            so "am I in the room" is a question it can't answer — the choice is
            made when the session is scheduled, not when it's written. */}
        {showDate ? (
          <div className="sm:col-span-2">
            <p className="eyebrow text-ink-soft">How it happens</p>
            <div className="mt-1.5 flex flex-col gap-2">
              {ATTENDANCE_ORDER.map((a) => (
                <label key={a} className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="attendance"
                    value={a}
                    defaultChecked={toAttendance(initial?.attendance) === a}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-jade"
                  />
                  <span className="text-sm text-ink">
                    {ATTENDANCE_LABELS[a]}
                    {/* The hint is the load-bearing half: both options put the
                        session in front of the athlete, and only this says
                        which one costs the coach an hour. */}
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {ATTENDANCE_HINTS[a]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
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
                    const videoValue = videoFor(row);
                    // Whether the movement itself already carries a demo, as
                    // opposed to something typed into this row just now.
                    const savedDemo = Boolean(
                      catalog.media[normalizeExerciseName(row.name ?? "")],
                    );
                    // Open on request, and open on its own when there's already
                    // a demo to show — a video the coach can't see is one they
                    // paste a second copy of.
                    const videoOpen = row.showVideo === true || videoValue !== "";
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
                            onValueChange={(v) =>
                              patchRow(section, row.id, { name: v })
                            }
                            aria-label={`Exercise ${n} name`}
                          />
                          <button
                            type="button"
                            onClick={() => removeRow(section, row.id)}
                            aria-label={`Remove exercise ${n}`}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-colors hover:bg-paper hover:text-flag sm:h-9 sm:w-9"
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

                        {(() => {
                          const extras = row.extras ?? [];
                          const shown = OPTIONAL_METRICS.filter((m) => extras.includes(m.key));
                          const available = OPTIONAL_METRICS.filter(
                            (m) => !extras.includes(m.key),
                          );
                          return (
                            <>
                              {shown.length > 0 ? (
                                <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                  {shown.map((m) => (
                                    <label key={m.key} className="flex flex-col gap-1">
                                      <span className="flex items-center justify-between gap-1">
                                        <span className="eyebrow text-ink-soft/70">
                                          {m.label}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleExtra(section, row.id, m.key, false)
                                          }
                                          aria-label={`Remove ${m.label} from exercise ${n}`}
                                          className="text-ink-soft/60 transition-colors hover:text-flag"
                                        >
                                          <svg
                                            width="11"
                                            height="11"
                                            viewBox="0 0 20 20"
                                            fill="none"
                                            aria-hidden
                                          >
                                            <path
                                              d="M5 5l10 10M15 5L5 15"
                                              stroke="currentColor"
                                              strokeWidth="2.2"
                                              strokeLinecap="round"
                                            />
                                          </svg>
                                        </button>
                                      </span>
                                      <Input
                                        name={`ex_${row.id}_${m.key}`}
                                        defaultValue={(row[m.key] as string) ?? ""}
                                        placeholder={m.placeholder}
                                        className={cn("metric px-2.5 py-2 text-sm")}
                                      />
                                    </label>
                                  ))}
                                </div>
                              ) : null}

                              {available.length > 0 || !videoOpen ? (
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                  {available.map((m) => (
                                    <button
                                      key={m.key}
                                      type="button"
                                      onClick={() => toggleExtra(section, row.id, m.key, true)}
                                      className="eyebrow inline-flex min-h-9 items-center rounded-full border border-line px-3 text-ink-soft transition-colors hover:border-jade hover:text-ink sm:min-h-0 sm:px-2.5 sm:py-1"
                                    >
                                      + {m.label}
                                    </button>
                                  ))}
                                  {!videoOpen ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        patchRow(section, row.id, { showVideo: true })
                                      }
                                      className="eyebrow inline-flex min-h-9 items-center rounded-full border border-line px-3 text-ink-soft transition-colors hover:border-jade hover:text-ink sm:min-h-0 sm:px-2.5 sm:py-1"
                                    >
                                      + Video
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </>
                          );
                        })()}

                        {videoOpen ? (
                          <label className="mt-2.5 flex flex-col gap-1">
                            <span className="flex items-center justify-between gap-1">
                              <span className="eyebrow text-ink-soft/70">Demo video</span>
                              {/* Only on a box the coach opened. When the
                                  movement already has a demo the box is
                                  reporting a fact, and a ✕ that reverts an edit
                                  but won't close it reads as broken. */}
                              {savedDemo ? null : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    patchRow(section, row.id, {
                                      showVideo: false,
                                      video: undefined,
                                    })
                                  }
                                  aria-label={`Remove the demo link from exercise ${n}`}
                                  className="text-ink-soft/60 transition-colors hover:text-flag"
                                >
                                  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden>
                                    <path
                                      d="M5 5l10 10M15 5L5 15"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </button>
                              )}
                            </span>
                            <Input
                              name={`ex_${row.id}_video`}
                              value={videoValue}
                              onChange={(e) =>
                                patchRow(section, row.id, { video: e.target.value })
                              }
                              placeholder="https://youtube.com/watch?v=…"
                              className="text-sm"
                            />
                            <span className="text-xs text-ink-soft">
                              {/* The bit that isn't obvious from the box: this
                                  is not a field on this session. */}
                              Saves as the demo for{" "}
                              {row.name?.trim() ? (
                                <span className="text-ink">{row.name.trim()}</span>
                              ) : (
                                "this movement"
                              )}{" "}
                              everywhere you program it. YouTube, Instagram,
                              Facebook and TikTok play inside Chalkline.
                            </span>
                          </label>
                        ) : null}

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
