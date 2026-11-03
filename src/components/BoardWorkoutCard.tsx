"use client";

// One workout on the side-by-side board, the same card in Columns and in
// Week. Each exercise is a single line to compare by — name, then sets × reps
// and the rest — that opens into its fields when tapped.
//
// Memoized, and handed only what's about it, so a drag's pointer moves
// re-render the board's overlay and not seven columns of inputs.
import Link from "next/link";
import { memo, useMemo, useState, type PointerEvent } from "react";
import { useShowAnimations } from "@/components/AnimationToggle";
import {
  BoardStatsBreakdown,
  BoardStatsSummary,
  useBoardBreakdown,
} from "@/components/BoardWorkoutStats";
import { Grip } from "@/components/Drag";
import { ExerciseAnimation, TargetMuscles } from "@/components/ExerciseAnimation";
import { ExercisePicker } from "@/components/ExercisePicker";
import { ProgressionGuide } from "@/components/ProgressionGuide";
import { Input, Select, Textarea, buttonClass } from "@/components/ui";
import type { BoardSubject } from "@/components/useBoardDrag";
import {
  addExercise,
  canStepExercise,
  exerciseCount,
  moveExercise,
  patchExercise,
  patchWorkout,
  removeExercise,
  setTotal,
  stepExercise,
  usesBoardSections,
  type BoardExercise,
  type BoardStore,
  type BoardWorkout,
  type Dir,
} from "@/lib/board-order";
import { cn } from "@/lib/cn";
import { animationFor, muscleLabel } from "@/lib/exercise-anim/lookup";
import { SECTION_LABELS, SECTION_ORDER, type ExerciseSection } from "@/lib/constants";
import type { PickerCatalog } from "@/lib/exercise-catalog";
import { SECTION_PRESET_CATEGORY } from "@/lib/exercise-presets";
import { formatDate, parseDateInput } from "@/lib/format";
import { WORKOUT_KIND_LABELS, workoutKind } from "@/lib/library-view";
import { formatMinutes, workoutStats } from "@/lib/workout-stats";

type Edit = (fn: (store: BoardStore) => BoardStore) => void;
type GripFor = (subject: BoardSubject) => { onPointerDown: (e: PointerEvent) => void };

export type MoveTarget = { key: string; title: string };

type MetricKey = "sets" | "reps" | "weight" | "load" | "tempo" | "rest";
type OptionalKey = Exclude<MetricKey, "sets" | "reps">;
type MetricDef<K extends MetricKey> = { key: K; label: string; placeholder: string };

// As in the workout builder: sets and reps on every row, the rest opt-in, so
// an open row shows the programming it has rather than four empty boxes.
const CORE_METRICS: MetricDef<MetricKey>[] = [
  { key: "sets", label: "Sets", placeholder: "4" },
  { key: "reps", label: "Reps", placeholder: "8-10" },
];

const OPTIONAL_METRICS: MetricDef<OptionalKey>[] = [
  { key: "weight", label: "Weight", placeholder: "100kg" },
  { key: "load", label: "Load", placeholder: "70%" },
  { key: "tempo", label: "Tempo", placeholder: "30X1" },
  { key: "rest", label: "Rest", placeholder: "90s" },
];

// The optional metrics a row opens with: exactly those that carry a value.
const initialExtras = (row: BoardExercise): OptionalKey[] =>
  OPTIONAL_METRICS.filter((m) => row[m.key].trim() !== "").map((m) => m.key);

const chipClass =
  "eyebrow inline-flex min-h-9 items-center rounded-full border border-line px-3 text-ink-soft transition-colors hover:border-jade hover:text-ink sm:min-h-0 sm:px-2.5 sm:py-1";

// The prescription in one line: "4 × 8-10 · 100kg · 90s rest".
function prescription(r: BoardExercise): string {
  const sets = r.sets.trim();
  const reps = r.reps.trim();
  const parts = [
    sets && reps ? `${sets} × ${reps}` : sets ? `${sets} sets` : reps ? `${reps} reps` : "",
    r.weight.trim() || r.load.trim(),
    r.tempo.trim(),
    r.rest.trim() ? `${r.rest.trim()} rest` : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

function editorHref(w: BoardWorkout): string {
  if (w.kind === "template") return `/library/${w.id}/edit`;
  if (!w.locked) return `/workouts/${w.id}/edit`;
  return w.person?.self ? `/me/workouts/${w.id}` : `/workouts/${w.id}`;
}

function meta(w: BoardWorkout): string {
  if (w.kind === "template") {
    return `Library · ${WORKOUT_KIND_LABELS[workoutKind(w)]}`;
  }
  const date = w.date ? parseDateInput(w.date) : null;
  return [w.person?.name, date ? formatDate(date) : null, w.time].filter(Boolean).join(" · ");
}

const iconButton =
  "grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] text-ink-soft transition-colors hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-30 sm:h-8 sm:w-8";

const ExerciseRow = memo(function ExerciseRow({
  workoutKey,
  row,
  n,
  section,
  locked,
  dimmed,
  isOpen,
  canUp,
  canDown,
  catalog,
  targets,
  grip,
  onEdit,
  onToggleRow,
  onRefocus,
}: {
  workoutKey: string;
  row: BoardExercise;
  n: number;
  section: ExerciseSection;
  locked: boolean;
  dimmed: boolean;
  isOpen: boolean;
  canUp: boolean;
  canDown: boolean;
  catalog: PickerCatalog;
  targets: MoveTarget[];
  grip: GripFor;
  onEdit: Edit;
  onToggleRow: (id: string, open?: boolean) => void;
  onRefocus: (id: string, dir: Dir) => void;
}) {
  const [showAnims] = useShowAnimations();
  // Held here, not derived from the values, so clearing a box while typing
  // doesn't make it vanish under the cursor. Removing one clears its value.
  const [extras, setExtras] = useState<OptionalKey[]>(() => initialExtras(row));
  const name = row.name.trim();
  const line = prescription(row);
  // Read out with the row, since its button's label replaces what it shows.
  const works = name ? (animationFor(name)?.primary ?? []).map(muscleLabel) : [];
  const number = String(n).padStart(2, "0");
  const patch = (p: Partial<Omit<BoardExercise, "id">>) =>
    onEdit((s) => patchExercise(s, workoutKey, row.id, p));
  const step = (dir: Dir) => {
    onEdit((s) => stepExercise(s, workoutKey, row.id, dir));
    onRefocus(row.id, dir);
  };
  const preferred = SECTION_PRESET_CATEGORY[section];
  const elsewhere = targets.filter((t) => t.key !== workoutKey);

  const summary = (
    <span className="flex min-w-0 flex-1 flex-col py-1.5">
      <span className={cn("truncate text-sm", name ? "text-ink" : "text-ink-soft")}>
        {name || "New exercise"}
      </span>
      {line ? (
        <span className="metric truncate text-xs text-ink-soft">{line}</span>
      ) : null}
      {name ? <TargetMuscles name={name} className="mt-0.5" /> : null}
    </span>
  );

  return (
    <div
      data-board-exercise={row.id}
      className={cn(
        "rounded-[var(--radius-sm)] border border-line bg-paper/50 transition-opacity",
        isOpen && "border-jade/40 bg-card",
        dimmed && "opacity-40",
      )}
    >
      <div className="flex items-center gap-1.5 pr-1">
        {locked ? (
          <span className="w-2 shrink-0" />
        ) : (
          <Grip
            label={name || `exercise ${n}`}
            className="h-11 w-6 shrink-0 hover:bg-card sm:h-9"
            {...grip({
              kind: "exercise",
              key: workoutKey,
              id: row.id,
              label: name || `Exercise ${n}`,
            })}
          />
        )}
        <span className="metric w-5 shrink-0 text-[0.6875rem] text-ink-soft/70" aria-hidden>
          {number}
        </span>
        {/* A small demo to tell movements apart at a glance across columns;
            tapping it opens the larger view, not the row's fields. */}
        {showAnims && name ? (
          <ExerciseAnimation name={name} className="my-1 h-11 w-11" />
        ) : null}
        {locked ? (
          summary
        ) : (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={`${name || `Exercise ${n}`}${line ? `, ${line}` : ""}${works.length ? `. Works ${works.join(", ")}` : ""}. ${isOpen ? "Close" : "Edit"}`}
            onClick={() => onToggleRow(row.id)}
            className="flex min-h-11 min-w-0 flex-1 items-center text-left sm:min-h-9"
          >
            {summary}
          </button>
        )}
      </div>

      {isOpen && !locked ? (
        <div className="@container flex flex-col gap-2.5 border-t border-line p-2.5">
          <ExercisePicker
            name={`board_${row.id}_name`}
            defaultValue={row.name}
            catalog={catalog}
            preferredCategories={preferred ? [preferred] : undefined}
            onValueChange={(v) => patch({ name: v })}
            aria-label={`Exercise ${n} name`}
          />
          <div className="grid grid-cols-2 gap-2 @min-[20rem]:grid-cols-3">
            {[...CORE_METRICS, ...OPTIONAL_METRICS.filter((m) => extras.includes(m.key))].map(
              (m) => {
                const optional = m.key !== "sets" && m.key !== "reps";
                return (
                  <label key={m.key} className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center justify-between gap-1">
                      <span className="eyebrow text-ink-soft/70">{m.label}</span>
                      {optional ? (
                        <button
                          type="button"
                          onClick={() => {
                            setExtras((x) => x.filter((k) => k !== m.key));
                            patch({ [m.key]: "" });
                          }}
                          aria-label={`Remove ${m.label} from exercise ${n}`}
                          className="grid h-6 w-6 place-items-center text-ink-soft/60 transition-colors hover:text-flag sm:h-4 sm:w-4"
                        >
                          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden>
                            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                          </svg>
                        </button>
                      ) : null}
                    </span>
                    <Input
                      value={row[m.key]}
                      onChange={(e) => patch({ [m.key]: e.target.value })}
                      placeholder={m.placeholder}
                      className="metric px-2.5 py-2 text-sm"
                    />
                  </label>
                );
              },
            )}
          </div>
          {extras.length < OPTIONAL_METRICS.length ? (
            <div className="flex flex-wrap gap-1.5">
              {OPTIONAL_METRICS.filter((m) => !extras.includes(m.key)).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setExtras((x) => [...x, m.key])}
                  className={chipClass}
                >
                  + {m.label}
                </button>
              ))}
            </div>
          ) : null}
          <Input
            value={row.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Coaching note (optional)"
            aria-label={`Exercise ${n} note`}
            className="text-sm"
          />
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              data-board-move={`${row.id}:-1`}
              disabled={!canUp}
              onClick={() => step(-1)}
              aria-label={`Move exercise ${n} up`}
              className={iconButton}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M10 15V5M5 9.5L10 4.5l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              data-board-move={`${row.id}:1`}
              disabled={!canDown}
              onClick={() => step(1)}
              aria-label={`Move exercise ${n} down`}
              className={iconButton}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M10 5v10M5 10.5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {elsewhere.length > 0 ? (
              <Select
                value=""
                aria-label={`Move exercise ${n} to another workout`}
                onChange={(e) => {
                  const to = e.target.value;
                  if (!to) return;
                  // Same section, at the end — where a dragged row would go
                  // if dropped at the bottom of it.
                  onEdit((s) =>
                    moveExercise(
                      s,
                      { key: workoutKey, id: row.id },
                      { key: to, section, index: s[to]?.rows[section].length ?? 0 },
                    ),
                  );
                }}
                className="min-w-0 flex-1 py-1.5 text-xs sm:min-h-8"
              >
                <option value="">Move to…</option>
                {elsewhere.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.title.trim() || "Untitled workout"}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="flex-1" />
            )}
            <button
              type="button"
              onClick={() => onEdit((s) => removeExercise(s, workoutKey, row.id))}
              className="eyebrow inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2.5 text-flag/90 transition-colors hover:bg-flag/5 sm:min-h-8"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={() => onToggleRow(row.id, false)}
              className="eyebrow inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2.5 text-ink-soft transition-colors hover:bg-paper hover:text-ink sm:min-h-8"
            >
              Done
            </button>
          </div>
          {/* Where this movement leads, as in the builder. Follows the name
              as it's picked. */}
          {name ? <ProgressionGuide name={name} /> : null}
        </div>
      ) : null}
    </div>
  );
});

export const BoardWorkoutCard = memo(function BoardWorkoutCard({
  workout: w,
  layout,
  catalog,
  dragging,
  revealSections,
  open,
  error,
  maxSets,
  targets,
  columnIndex,
  columnCount,
  dayValue,
  dayOptions,
  grip,
  onEdit,
  onToggleRow,
  onRefocus,
  onColumnStep,
  onRemoveColumn,
  onDay,
}: {
  workout: BoardWorkout;
  layout: "columns" | "week";
  catalog: PickerCatalog;
  // What's in hand as far as this card is concerned: "workout" when it's this
  // card, a row id when it's one of its rows, else null.
  dragging: string | null;
  // An exercise is being dragged somewhere on the board, so every card shows
  // its empty sections as places to drop.
  revealSections: boolean;
  open: ReadonlySet<string>;
  error: string | undefined;
  // The most sets on any workout in view, which this card's volume bar is
  // drawn against.
  maxSets: number;
  // The workouts on screen a row can move to.
  targets: MoveTarget[];
  columnIndex?: number;
  columnCount?: number;
  dayValue?: string;
  dayOptions?: { value: string; label: string }[];
  grip: GripFor;
  onEdit: Edit;
  onToggleRow: (id: string, open?: boolean) => void;
  onRefocus: (id: string, dir: Dir) => void;
  onColumnStep?: (key: string, dir: Dir) => void;
  onRemoveColumn?: (key: string) => void;
  onDay?: (key: string, value: string) => void;
}) {
  const count = exerciseCount(w);
  const sets = setTotal(w);
  const headings = usesBoardSections(w) || (revealSections && !w.locked);
  // Main is always there, even empty, so there's somewhere to drop. Warm-up and
  // cool-down only when they hold something — or while an exercise is in hand.
  const sections = SECTION_ORDER.filter(
    (s) => s === "MAIN" || w.rows[s].length > 0 || (revealSections && !w.locked),
  );
  // Draggable unless it's a logged session on the week, where moving it would
  // change its date. Reordering columns changes nothing, so even those move.
  const movable = !w.locked || layout === "columns";
  const label = w.title.trim() || "Untitled workout";
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [breakdown, setBreakdown] = useBoardBreakdown();
  const stats = useMemo(
    () =>
      workoutStats(
        SECTION_ORDER.flatMap((section) => w.rows[section].map((row) => ({ ...row, section }))),
        w.discipline,
      ),
    [w.rows, w.discipline],
  );

  // Numbering runs 01..N across the sections, matching the global `order` a
  // save writes, as the builder numbers them.
  const offset = (section: ExerciseSection) =>
    SECTION_ORDER.slice(0, SECTION_ORDER.indexOf(section)).reduce(
      (total, s) => total + w.rows[s].length,
      0,
    );

  return (
    <section
      data-board-workout={w.key}
      data-locked={w.locked || undefined}
      aria-label={label}
      className={cn(
        "flex flex-col rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)] transition-opacity",
        dragging === "workout" && "opacity-40",
        error && "border-flag/50",
      )}
    >
      <header className="flex items-start gap-1 px-2 pt-2.5 sm:px-2.5">
        {movable ? (
          <Grip
            label={label}
            className="mt-0.5 h-9 w-6 hover:bg-paper"
            {...grip({ kind: "workout", key: w.key, label })}
          />
        ) : (
          <span className="w-1.5 shrink-0" />
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          {w.locked ? (
            <h2 className="break-words px-1 font-display text-base font-semibold leading-snug text-ink">
              {label}
            </h2>
          ) : (
            // A one-line field that wraps and grows, so "Thu · Lower Body A"
            // reads whole in a day column 13rem wide; Enter stays out of it.
            <textarea
              rows={1}
              value={w.title}
              onChange={(e) =>
                onEdit((s) =>
                  patchWorkout(s, w.key, { title: e.target.value.replace(/\s*\n\s*/g, " ") }),
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              aria-label="Workout title"
              placeholder="Untitled workout"
              className="field-sizing-content block w-full resize-none rounded-[6px] border border-transparent bg-transparent px-1 py-0.5 font-display text-base font-semibold leading-snug text-ink placeholder:text-ink-soft/60 hover:border-line focus-visible:border-jade focus-visible:outline-none"
            />
          )}
          <p className="eyebrow mt-0.5 px-1 text-ink-soft">{meta(w)}</p>
        </div>
        <button
          type="button"
          aria-expanded={optionsOpen}
          aria-label={`Options for ${label}`}
          onClick={() => setOptionsOpen((o) => !o)}
          className={cn(iconButton, optionsOpen && "bg-paper text-ink")}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <circle cx="4.5" cy="10" r="1.6" />
            <circle cx="10" cy="10" r="1.6" />
            <circle cx="15.5" cy="10" r="1.6" />
          </svg>
        </button>
      </header>

      {/* In the card's flow rather than floating over it: a row of columns
          scrolls sideways, and a floating panel would be clipped by its edge. */}
      {optionsOpen ? (
        <div className="mx-2.5 mt-2 flex flex-col gap-3 rounded-[var(--radius-sm)] border border-line bg-paper/60 p-3">
          {w.kind === "session" && !w.locked ? (
            <label className="flex flex-col gap-1">
              <span className="eyebrow text-ink-soft">Date</span>
              <Input
                type="date"
                value={w.date ?? ""}
                onChange={(e) => {
                  // A cleared date box isn't a move anywhere; keep the last one.
                  if (e.target.value) onEdit((s) => patchWorkout(s, w.key, { date: e.target.value }));
                }}
                className="metric py-2"
              />
            </label>
          ) : null}
          {layout === "week" && dayOptions && onDay && !w.locked ? (
            <label className="flex flex-col gap-1">
              <span className="eyebrow text-ink-soft">Day</span>
              <Select value={dayValue} onChange={(e) => onDay(w.key, e.target.value)} className="py-2">
                {dayOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {w.locked ? null : (
            <label className="flex flex-col gap-1">
              <span className="eyebrow text-ink-soft">Notes for the athlete</span>
              <Textarea
                value={w.notes}
                onChange={(e) => onEdit((s) => patchWorkout(s, w.key, { notes: e.target.value }))}
                className="min-h-16 text-sm"
              />
            </label>
          )}
          {layout === "columns" && onColumnStep && columnIndex != null && columnCount != null ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={columnIndex === 0}
                onClick={() => onColumnStep(w.key, -1)}
                className={cn(buttonClass("outline", "sm"), "flex-1")}
              >
                ← Move left
              </button>
              <button
                type="button"
                disabled={columnIndex === columnCount - 1}
                onClick={() => onColumnStep(w.key, 1)}
                className={cn(buttonClass("outline", "sm"), "flex-1")}
              >
                Move right →
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Link href={editorHref(w)} className={buttonClass("outline", "sm")}>
              {w.locked ? "Open session" : "Open full editor"}
            </Link>
            {layout === "columns" && onRemoveColumn ? (
              <button
                type="button"
                onClick={() => onRemoveColumn(w.key)}
                className={buttonClass("ghost", "sm")}
              >
                Remove from view
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* What a column is compared by: how many exercises, how many working
          sets, a bar of those sets against the biggest workout in view, and
          what those sets work. */}
      <div className="px-3.5 pb-2.5 pt-2">
        <p className="metric flex flex-wrap items-baseline gap-x-3 text-xs text-ink-soft">
          <span>
            <span className="text-sm text-ink">{count}</span> exercise{count === 1 ? "" : "s"}
          </span>
          {sets > 0 ? (
            <span>
              <span className="text-sm text-ink">{sets}</span> set{sets === 1 ? "" : "s"}
            </span>
          ) : null}
          {stats.minutes > 0 ? (
            <span title="A rough length, from sets, reps, tempo and rest">
              {formatMinutes(stats.minutes)}
            </span>
          ) : null}
          {w.locked ? <span className="eyebrow text-jade-strong">Logged</span> : null}
        </p>
        <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-line" aria-hidden>
          <div
            className="h-full rounded-full bg-jade/70 transition-[width] duration-300"
            style={{ width: maxSets > 0 ? `${Math.round((sets / maxSets) * 100)}%` : "0%" }}
          />
        </div>
        <BoardStatsSummary stats={stats} open={breakdown} onToggle={() => setBreakdown(!breakdown)} />
      </div>
      {breakdown ? <BoardStatsBreakdown stats={stats} /> : null}

      {error ? (
        <p role="alert" className="mx-2.5 mb-2 rounded-[var(--radius-sm)] border border-flag/25 bg-flag/5 px-2.5 py-2 text-xs text-flag">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 px-2 pb-2.5 sm:px-2.5">
        {sections.map((section) => {
          const rows = w.rows[section];
          return (
            <div key={section}>
              {headings ? (
                <div className="mb-1.5 flex items-center gap-2 px-1">
                  <span className="eyebrow text-ink-soft">{SECTION_LABELS[section]}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              ) : null}
              <div
                data-board-section={section}
                className={cn(
                  "flex flex-col gap-1.5",
                  rows.length === 0 &&
                    "grid min-h-11 place-items-center rounded-[var(--radius-sm)] border border-dashed border-line px-2",
                )}
              >
                {rows.map((row, i) => {
                  return (
                    <ExerciseRow
                      key={row.id}
                      workoutKey={w.key}
                      row={row}
                      n={offset(section) + i + 1}
                      section={section}
                      locked={w.locked}
                      dimmed={dragging === row.id}
                      isOpen={open.has(row.id)}
                      canUp={canStepExercise(w, row.id, -1)}
                      canDown={canStepExercise(w, row.id, 1)}
                      catalog={catalog}
                      targets={targets}
                      grip={grip}
                      onEdit={onEdit}
                      onToggleRow={onToggleRow}
                      onRefocus={onRefocus}
                    />
                  );
                })}
                {rows.length === 0 ? (
                  <span className="py-2 text-center text-xs text-ink-soft/70">
                    {section === "MAIN"
                      ? w.locked
                        ? "No exercises"
                        : "No exercises yet — it needs one to save"
                      : `Drop here for ${SECTION_LABELS[section].toLowerCase()}`}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}

        {w.locked ? null : (
          <button
            type="button"
            onClick={() => {
              const id = crypto.randomUUID();
              onEdit((s) => addExercise(s, w.key, "MAIN", id));
              onToggleRow(id, true);
            }}
            className={cn(buttonClass("ghost", "sm"), "w-full justify-start px-2.5 text-ink-soft")}
          >
            + Add exercise
          </button>
        )}
      </div>
    </section>
  );
});
