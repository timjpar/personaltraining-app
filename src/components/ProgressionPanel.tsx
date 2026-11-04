"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { Badge, Input, Textarea, Select, buttonClass } from "@/components/ui";
import { EditorActions } from "@/components/EditorActions";
import { ExerciseAnimation } from "@/components/ExerciseAnimation";
import { useFieldHistory } from "@/components/useFieldHistory";
import { useUndoHistory } from "@/components/useUndoHistory";
import { cn } from "@/lib/cn";
import {
  chooseProgressionPath,
  deleteProgressionPath,
  resetProgressionGoal,
  saveProgressionPath,
  type StepInput,
} from "@/app/progression-actions";
import { FAMILY_LABELS, targetLabel, type ProgressionPath } from "@/lib/progressions";
import type { ProgressionView } from "@/lib/progression-view";

// Under each exercise card: where this movement sits on the path to a skill,
// what to do about it, and the other paths it could lead along.
//
// It often renders inside WorkoutLogForm's <form>, which shapes all of it: no
// nested forms (the actions are called directly), no `name` on any field (or
// the workout would post them), every button type="button", and Enter in the
// editor swallowed so it can't submit the session.

// Who is looking, which only changes how a goal's origin is worded.
export type ProgressionViewer = "athlete" | "coach" | "self";

const isCustom = (path: ProgressionPath) => path.family === "custom";

function sourceLabel(view: ProgressionView, viewer: ProgressionViewer) {
  const { source, byCoach } = view.goal;
  if (source === "auto") return "Auto goal";
  if (source === "custom") return "Custom path";
  if (source === "following") return "Kept from an earlier step";
  if (viewer === "coach") return byCoach ? "Set by you" : "Their pick";
  if (viewer === "athlete" && byCoach) return "Set by your coach";
  return "Your pick";
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden
      className={cn("shrink-0 transition-transform", open && "rotate-180")}
    >
      <path
        d="M2.5 4.5 L6 8 L9.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- One ladder -------------------------------------------------------------
// Each step with its drawing beside it, so what the next rung looks like is in
// view along with how to earn it. `map` is the athlete-free reading — the
// builder, the library, the catalog — where the steps below this movement are
// easier variants rather than rungs anyone has climbed.
export function Ladder({
  path,
  at,
  map = false,
  onPick,
}: {
  path: ProgressionPath;
  at: number;
  map?: boolean;
  // Offers each other step as a swap for this movement: the board's shelf
  // trades an exercise for an easier or harder one this way.
  onPick?: (name: string) => void;
}) {
  return (
    <ol className="relative flex flex-col">
      {path.steps.map((step, i) => {
        const past = !map && i < at;
        const here = i === at;
        const next = i === at + 1;
        const last = i === path.steps.length - 1;
        const badge = targetLabel(step.target);
        return (
          <li key={`${i}-${step.name}`} className="relative flex gap-3 pb-4 last:pb-0">
            {/* The rail between markers. */}
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[9px] top-5 bottom-0 w-px",
                  past ? "bg-jade/50" : "bg-line",
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "metric relative z-[1] mt-0.5 grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                past && "border-jade bg-jade text-white",
                here && "border-jade bg-jade-wash text-jade-strong ring-2 ring-jade/25",
                !past && !here && "border-line bg-paper text-ink-soft",
              )}
            >
              {past ? "✓" : i + 1}
            </span>
            <div className={cn("min-w-0 flex-1", past && "opacity-60")}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-display text-sm font-semibold text-ink">
                  {step.name}
                </span>
                {here ? (
                  <span className="eyebrow text-jade-strong">
                    {map ? "This movement" : <>You&rsquo;re here</>}
                  </span>
                ) : null}
                {next ? <span className="eyebrow text-amber">Next</span> : null}
                {step.weeks && !last ? (
                  <span className="metric text-xs text-ink-soft">{step.weeks}</span>
                ) : null}
              </div>
              {step.how ? (
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">
                  {step.how}
                </p>
              ) : null}
              {step.when ? (
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink">
                  <span className="eyebrow mr-1.5 text-ink-soft">Move on when</span>
                  {step.when}
                  {badge ? (
                    <span className="metric ml-1.5 whitespace-nowrap rounded-[4px] border border-line bg-paper px-1.5 py-0.5 text-[11px] text-ink-soft">
                      {badge}
                    </span>
                  ) : null}
                </p>
              ) : null}
              {last ? <p className="eyebrow mt-1.5 text-jade-strong">The goal</p> : null}
              {onPick && !here ? (
                <button
                  type="button"
                  onClick={() => onPick(step.name)}
                  aria-label={`Switch to ${step.name}`}
                  className={cn(buttonClass("outline", "sm"), "mt-2")}
                >
                  Switch to this
                </button>
              ) : null}
            </div>
            <ExerciseAnimation
              name={step.name}
              className={cn("h-14 w-14 sm:h-16 sm:w-16", past && "opacity-60")}
            />
          </li>
        );
      })}
    </ol>
  );
}

// ---- The editor -------------------------------------------------------------
type Draft = {
  name: string;
  how: string;
  when: string;
  weeks: string;
  kind: "none" | "reps" | "seconds";
  sets: string;
  amount: string;
};

function draftOf(path: ProgressionPath): Draft[] {
  return path.steps.map((s) => ({
    name: s.name,
    how: s.how,
    when: s.when ?? "",
    weeks: s.weeks ?? "",
    kind: s.target?.seconds != null ? "seconds" : s.target?.reps != null ? "reps" : "none",
    sets: s.target ? String(s.target.sets) : "3",
    amount: String(s.target?.seconds ?? s.target?.reps ?? ""),
  }));
}

const int = (v: string) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

function stepInputOf(d: Draft): StepInput {
  return {
    name: d.name,
    how: d.how,
    when: d.when,
    weeks: d.weeks,
    targetSets: d.kind === "none" ? null : int(d.sets),
    targetReps: d.kind === "reps" ? int(d.amount) : null,
    targetSeconds: d.kind === "seconds" ? int(d.amount) : null,
  };
}

// Enter in a text box would submit the workout this panel sits inside.
function swallowEnter(e: KeyboardEvent) {
  if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
}

function PathEditor({
  view,
  start,
  editing,
  onDone,
}: {
  view: ProgressionView;
  // What the draft starts from: the path being edited, or one to copy.
  start: ProgressionPath;
  editing: boolean;
  onDone: () => void;
}) {
  // The whole draft is one useUndoHistory, so Ctrl+Z takes back a step
  // removed or moved as well as what's typed.
  const history = useUndoHistory(() => ({
    goal: editing ? start.goal : "",
    blurb: editing ? start.blurb : "",
    steps: draftOf(start),
  }));
  const { goal, blurb, steps } = history.state;
  const setGoal = (goal: string) => history.set((d) => ({ ...d, goal }));
  const setBlurb = (blurb: string) => history.set((d) => ({ ...d, blurb }));
  const setSteps = (fn: (all: Draft[]) => Draft[]) =>
    history.set((d) => {
      const next = fn(d.steps);
      return next === d.steps ? d : { ...d, steps: next };
    });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const update = (i: number, patch: Partial<Draft>) =>
    setSteps((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, by: number) =>
    setSteps((all) => {
      const j = i + by;
      if (j < 0 || j >= all.length) return all;
      const copy = [...all];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const key = (s: string) => s.trim().toLowerCase();
  const includesThis = steps.some((s) => key(s.name) === key(view.exerciseName));

  const save = () => {
    if (pending) return;
    startTransition(async () => {
      setError(null);
      const result = await saveProgressionPath(
        view.athleteId,
        {
          pathId: editing ? start.id : undefined,
          goal,
          blurb,
          steps: steps.map(stepInputOf),
        },
        view.exerciseName,
      );
      if (result.error) setError(result.error);
      else onDone();
    });
  };
  useFieldHistory(rootRef, { save });

  // A long path puts the bottom button out of sight, so it's beside the
  // heading too.
  const saveButton = (
    <button
      type="button"
      onClick={save}
      disabled={pending}
      className={buttonClass("primary", "sm")}
    >
      {pending ? "Saving…" : "Save path"}
    </button>
  );

  const lastName = steps.filter((s) => s.name.trim()).at(-1)?.name ?? "";

  return (
    <div
      ref={rootRef}
      onKeyDown={swallowEnter}
      className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-line bg-paper p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow text-ink-soft">
          {editing ? "Edit this path" : "Write a custom path"}
        </p>
        <EditorActions>{saveButton}</EditorActions>
      </div>
      <label className="block">
        <span className="text-xs text-ink-soft">Goal</span>
        <Input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={lastName || "The skill it leads to"}
          className="mt-1"
        />
      </label>
      <label className="block">
        <span className="text-xs text-ink-soft">Why this path (optional)</span>
        <Input
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          placeholder="One line on what it builds"
          className="mt-1"
        />
      </label>

      <ol className="flex flex-col gap-2.5">
        {steps.map((s, i) => (
          <li key={i} className="rounded-[var(--radius-sm)] border border-line bg-card p-2.5">
            <div className="flex items-center gap-2">
              <span className="metric w-5 shrink-0 text-xs text-ink-soft">{i + 1}</span>
              <Input
                value={s.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Movement"
                aria-label={`Step ${i + 1} movement`}
                className="flex-1"
              />
              <div className="flex shrink-0">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className={cn(buttonClass("ghost", "sm"), "px-2 sm:px-2")}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === steps.length - 1}
                  aria-label="Move down"
                  className={cn(buttonClass("ghost", "sm"), "px-2 sm:px-2")}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setSteps((all) => all.filter((_, j) => j !== i))}
                  aria-label="Remove step"
                  className={cn(buttonClass("ghost", "sm"), "px-2 text-flag sm:px-2")}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-2 pl-7">
              <Textarea
                value={s.how}
                onChange={(e) => update(i, { how: e.target.value })}
                placeholder="How to train it"
                aria-label={`Step ${i + 1} how`}
                className="min-h-14"
              />
              {i < steps.length - 1 ? (
                <>
                  <Input
                    value={s.when}
                    onChange={(e) => update(i, { when: e.target.value })}
                    placeholder="Move on when…"
                    aria-label={`Step ${i + 1} move on when`}
                  />
                  {/* Input and Select are w-full, so these wrappers size them. */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-44 shrink-0">
                      <Select
                        value={s.kind}
                        onChange={(e) => update(i, { kind: e.target.value as Draft["kind"] })}
                        aria-label={`Step ${i + 1} target`}
                      >
                        <option value="none">Judged by eye</option>
                        <option value="reps">Sets of reps</option>
                        <option value="seconds">Sets of a hold</option>
                      </Select>
                    </span>
                    {s.kind !== "none" ? (
                      <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                        <span className="w-14">
                          <Input
                            value={s.sets}
                            onChange={(e) => update(i, { sets: e.target.value })}
                            inputMode="numeric"
                            aria-label="Sets"
                          />
                        </span>
                        ×
                        <span className="w-16">
                          <Input
                            value={s.amount}
                            onChange={(e) => update(i, { amount: e.target.value })}
                            inputMode="numeric"
                            aria-label={s.kind === "reps" ? "Reps" : "Seconds"}
                          />
                        </span>
                        {s.kind === "seconds" ? "s" : "reps"}
                      </span>
                    ) : null}
                    <span className="min-w-40 flex-1">
                      <Input
                        value={s.weeks}
                        onChange={(e) => update(i, { weeks: e.target.value })}
                        placeholder="How long, e.g. 3–6 weeks"
                        aria-label={`Step ${i + 1} how long`}
                      />
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() =>
          setSteps((all) => [
            ...all,
            { name: "", how: "", when: "", weeks: "", kind: "none", sets: "3", amount: "" },
          ])
        }
        className={cn(buttonClass("outline", "sm"), "self-start")}
      >
        + Add a step
      </button>

      {!includesThis ? (
        <p className="text-xs leading-relaxed text-amber">
          {view.exerciseName} isn&rsquo;t a step on this path, so it won&rsquo;t
          become this movement&rsquo;s goal — it will still be saved, and offered
          on the movements it does include.
        </p>
      ) : null}
      {error ? <p className="text-sm text-flag">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {saveButton}
        <button type="button" onClick={onDone} className={buttonClass("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---- The panel --------------------------------------------------------------
export function ProgressionPanel({
  view,
  viewer,
  resultLabel = "Last time",
}: {
  view: ProgressionView;
  viewer: ProgressionViewer;
  // Whose result `readiness` was judged on, for the badge.
  resultLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [allPaths, setAllPaths] = useState(false);
  const [peek, setPeek] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ start: ProgressionPath; editing: boolean } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { goal, others, readiness } = view;
  const { path, index } = goal;
  const step = path.steps[index];
  const next = path.steps[index + 1];
  const atGoal = !next;

  const run = (action: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.error) setError(result.error);
    });

  let status: { tone: "jade" | "neutral" | "amber"; text: string } | null = null;
  if (atGoal) status = { tone: "jade", text: "At the goal" };
  else if (readiness?.ready) status = { tone: "jade", text: `Ready for ${next.name}` };
  else if (readiness && step.target) {
    status = {
      tone: "neutral",
      text: `${resultLabel}: ${readiness.met} of ${readiness.needed} sets at ${targetLabel(step.target)}`,
    };
  }

  return (
    <div className="border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full min-h-11 items-center gap-2.5 text-left sm:min-h-0"
      >
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-wash text-amber"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1.5 10 L4.5 7 L6.5 8.5 L10.5 3 M7.5 3 H10.5 V6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink">
            <span className="text-ink-soft">Path to </span>
            <span className="font-semibold">{path.goal}</span>
          </span>
          <span className="metric block text-xs text-ink-soft">
            Step {index + 1} of {path.steps.length} · {sourceLabel(view, viewer)}
            {others.length ? ` · ${others.length + 1} paths` : ""}
          </span>
        </span>
        {/* Badge sets its own display, so the wrapper does the hiding. */}
        {status ? (
          <span className="hidden shrink-0 sm:block">
            <Badge tone={status.tone}>{status.text}</Badge>
          </span>
        ) : null}
        <Chevron open={open} />
      </button>
      {status ? (
        <span className="mt-1.5 block sm:hidden">
          <Badge tone={status.tone}>{status.text}</Badge>
        </span>
      ) : null}

      {open ? (
        <div className="mt-3 flex flex-col gap-4">
          {!atGoal && step.when ? (
            <div className="rounded-[var(--radius-sm)] border border-amber/25 bg-amber-wash/50 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-ink">
              <span className="eyebrow mr-1.5 text-amber">Next: {next.name}</span>
              when {step.when.charAt(0).toLowerCase() + step.when.slice(1)}
              {step.weeks ? (
                <span className="text-ink-soft"> Usually {step.weeks} here.</span>
              ) : null}
              {readiness?.ready ? (
                <span className="text-jade-strong">
                  {" "}
                  {resultLabel} you got there — swap {next.name} in next session.
                </span>
              ) : null}
            </div>
          ) : null}

          {path.blurb ? (
            <p className="text-[0.8125rem] leading-relaxed text-ink-soft">{path.blurb}</p>
          ) : null}

          <Ladder path={path} at={index} />

          {error ? <p className="text-sm text-flag">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            {others.length ? (
              <button
                type="button"
                onClick={() => setAllPaths((a) => !a)}
                aria-expanded={allPaths}
                className={buttonClass("outline", "sm")}
              >
                {allPaths ? "Hide other paths" : `See all paths (${others.length + 1})`}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setEditor({ start: path, editing: false })}
              className={buttonClass("outline", "sm")}
            >
              Write a custom path
            </button>
            {isCustom(path) ? (
              <button
                type="button"
                onClick={() => setEditor({ start: path, editing: true })}
                className={buttonClass("ghost", "sm")}
              >
                Edit this path
              </button>
            ) : null}
            {goal.source === "chosen" || goal.source === "following" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => resetProgressionGoal(view.athleteId, view.exerciseName))}
                className={buttonClass("ghost", "sm")}
              >
                Back to auto goal
              </button>
            ) : null}
          </div>

          {editor ? (
            <PathEditor
              key={`${editor.start.id}-${editor.editing}`}
              view={view}
              start={editor.start}
              editing={editor.editing}
              onDone={() => setEditor(null)}
            />
          ) : null}

          {allPaths ? (
            <ul className="flex flex-col gap-2">
              {others.map(({ path: other, index: at }) => {
                const peeking = peek === other.id;
                return (
                  <li
                    key={other.id}
                    className="rounded-[var(--radius-sm)] border border-line bg-paper p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setPeek(peeking ? null : other.id)}
                        aria-expanded={peeking}
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">
                            {other.goal}
                          </span>
                          <span className="metric block text-xs text-ink-soft">
                            {FAMILY_LABELS[other.family]} · step {at + 1} of{" "}
                            {other.steps.length}
                            {at === other.steps.length - 1 ? " · the goal" : ""}
                          </span>
                        </span>
                        <span className="mt-1 text-ink-soft">
                          <Chevron open={peeking} />
                        </span>
                      </button>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(() =>
                              chooseProgressionPath(view.athleteId, view.exerciseName, other.id),
                            )
                          }
                          className={buttonClass("outline", "sm")}
                        >
                          Use this path
                        </button>
                      </div>
                    </div>
                    {peeking ? (
                      <div className="mt-3 flex flex-col gap-3">
                        {other.blurb ? (
                          <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
                            {other.blurb}
                          </p>
                        ) : null}
                        <Ladder path={other} at={at} />
                        {isCustom(other) ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditor({ start: other, editing: true })}
                              className={buttonClass("ghost", "sm")}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                if (confirm(`Delete the path to ${other.goal}?`)) {
                                  run(() => deleteProgressionPath(view.athleteId, other.id));
                                }
                              }}
                              className={buttonClass("danger", "sm")}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
