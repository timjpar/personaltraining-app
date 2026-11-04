"use client";

// The board's shelf: single exercises the coach means to fit into the week,
// set out above it. Each says which workouts it would fit best
// (board-suggest.ts) as buttons that add it there, and its grip drags it into
// any workout on the board, at the spot it's dropped — the same as dragging an
// exercise across from another workout. Either way it's an edit like any
// other, waiting for Save and undone with Ctrl+Z.
//
// What's on the shelf is saved to the coach's account as it changes, so it's
// there to come back to on any device. It's their own scratch list, not part
// of anyone's program.
import { useState } from "react";
import type { PointerEvent } from "react";
import { Grip } from "@/components/Drag";
import { ExerciseAnimation } from "@/components/ExerciseAnimation";
import { ProgressionGuide } from "@/components/ProgressionGuide";
import { animationFor, muscleLabel } from "@/lib/exercise-anim/lookup";
import { ExercisePicker } from "@/components/ExercisePicker";
import { buttonClass } from "@/components/ui";
import type { BoardSubject } from "@/components/useBoardDrag";
import type { Suggestion } from "@/lib/board-suggest";
import { cn } from "@/lib/cn";
import type { PickerCatalog } from "@/lib/exercise-catalog";

export type ShelfItem = {
  name: string;
  muscles: string[];
  suggestions: Suggestion[];
};

export function BoardShelf({
  items,
  catalog,
  dayLabels,
  dragging,
  grip,
  onAdd,
  onRemove,
  onPlace,
  saveState,
  dropping,
}: {
  items: ShelfItem[];
  catalog: PickerCatalog;
  dayLabels: string[];
  dragging: string | null;
  grip: (subject: BoardSubject) => { onPointerDown: (e: PointerEvent) => void };
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  onPlace: (name: string, workoutKey: string) => void;
  saveState: "saved" | "saving" | "error";
  // An exercise from a workout is in hand, and can be dropped here.
  dropping: boolean;
}) {
  const [draft, setDraft] = useState("");
  // Bumped on each add, so the picker starts empty again.
  const [round, setRound] = useState(0);
  const add = () => {
    const name = draft.trim();
    if (!name) return;
    onAdd(name);
    setDraft("");
    setRound((r) => r + 1);
  };

  return (
    <section
      aria-label="Exercise library"
      data-board-shelf-drop
      className={cn(
        "mt-5 rounded-[var(--radius-card)] border border-line bg-card/60 p-4 transition-colors",
        dropping && "border-dashed border-jade bg-jade-wash/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="eyebrow text-ink">Exercise library</h2>
        <span className="metric text-xs text-ink-soft/70">{items.length || ""}</span>
        <p className="w-full text-xs text-ink-soft sm:w-auto sm:flex-1">
          Exercises to fit into the week, saved to your account so they’re here when you come
          back. Drag one into a workout, or tap a suggestion, to move it there; drag an exercise
          out of a workout and drop it here to set it aside.
        </p>
        <span
          role="status"
          className={cn("metric text-xs", saveState === "error" ? "text-flag" : "text-ink-soft/70")}
        >
          {saveState === "saving"
            ? "Saving…"
            : saveState === "error"
              ? "Couldn't save the shelf. It'll try again on your next change."
              : items.length
                ? "Saved"
                : ""}
        </span>
      </div>
      <div
        className="mt-3 flex items-center gap-2 sm:max-w-md"
        onKeyDown={(e) => {
          // The picker keeps Enter while its list is open; a closed field's
          // Enter adds what's typed.
          if (e.key === "Enter" && !e.defaultPrevented) {
            e.preventDefault();
            add();
          }
        }}
      >
        <div className="min-w-0 flex-1">
          <ExercisePicker
            key={round}
            name="shelf_exercise"
            catalog={catalog}
            onValueChange={setDraft}
            placeholder="Find an exercise"
            aria-label="Exercise to add to the shelf"
          />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className={buttonClass("outline", "sm")}
        >
          Add
        </button>
      </div>

      {dropping ? (
        <p className="eyebrow mt-3 text-jade-strong">Drop here to take it out and keep it for later</p>
      ) : null}
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          Nothing here yet. Add the exercises you want in this week, and each will say which
          workout it fits best.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.name}
              data-board-shelf={item.name}
              className={cn(
                "flex min-w-0 flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-paper p-3 transition-opacity",
                dragging === item.name && "opacity-40",
              )}
            >
              <div className="flex items-start gap-2">
                <Grip
                  label={item.name}
                  className="mt-0.5 h-9 w-6 hover:bg-card"
                  {...grip({ kind: "shelf", key: item.name, label: item.name })}
                />
                {/* Its demo, which opens larger with the muscles named. */}
                <ExerciseAnimation name={item.name} className="h-14 w-14" />
                <p className="min-w-0 flex-1 self-center text-sm font-semibold leading-snug text-ink">
                  {item.name}
                </p>
                <button
                  type="button"
                  onClick={() => onRemove(item.name)}
                  aria-label={`Take ${item.name} off the shelf`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] text-ink-soft/70 transition-colors hover:bg-card hover:text-ink sm:h-7 sm:w-7"
                >
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <Muscles name={item.name} fallback={item.muscles} />
              {item.suggestions.length ? (
                <>
                  <span className="eyebrow text-ink-soft/70">Suggested</span>
                  <div className="flex flex-col gap-1.5">
                    {item.suggestions.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        title={s.reason}
                        aria-label={`Add ${item.name} to ${s.title} on ${dayLabels[s.day]}. ${s.reason}.`}
                        onClick={() => onPlace(item.name, s.key)}
                        className="flex min-h-10 min-w-0 items-center gap-2 rounded-[var(--radius-sm)] border border-jade/50 bg-jade-wash px-2.5 text-left text-xs text-jade-strong transition-colors hover:border-jade sm:min-h-8"
                      >
                        <span className="eyebrow shrink-0">{dayLabels[s.day]}</span>
                        <span className="truncate">{s.title}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs leading-snug text-ink-soft">{item.suggestions[0].reason}.</p>
                </>
              ) : (
                <p className="text-xs text-ink-soft">
                  No workout on the days shown to put it in yet.
                </p>
              )}
              {/* Where this movement leads, as on a workout's own rows. */}
              <ProgressionGuide name={item.name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// What an exercise targets, in the drawings' own two tints: the muscles it
// works, then the ones it assists. A movement with no drawing falls back to
// what the week's stats know about it.
function Muscles({ name, fallback }: { name: string; fallback: string[] }) {
  const info = animationFor(name);
  const works = info?.primary.map(muscleLabel) ?? fallback;
  const assists = info?.secondary.map(muscleLabel) ?? [];
  if (works.length === 0 && assists.length === 0) {
    return <p className="text-xs text-ink-soft">Nothing on file for it</p>;
  }
  const row = (label: string, tint: string, list: string[]) =>
    list.length ? (
      <p className="flex items-baseline gap-1.5 text-xs leading-snug text-ink-soft">
        <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 translate-y-[-0.1em] rounded-full" style={{ background: tint }} />
        <span className="eyebrow w-14 shrink-0 text-ink-soft/70">{label}</span>
        <span className="min-w-0">{list.join(" · ")}</span>
      </p>
    ) : null;
  return (
    <div className="flex flex-col gap-1">
      {row("Works", "#e2463b", works)}
      {row("Assists", "#f0a493", assists)}
    </div>
  );
}
