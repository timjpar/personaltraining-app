"use client";

// The board's shelf: library workouts the coach means to put on the week, set
// out above it. Each says which days it would fit best (board-suggest.ts) as
// buttons that place it there, and its grip drags it onto any day. On the
// library's week, placing one gives its title that day; on a person's week it
// schedules them a session of it on that date.
//
// Which workouts are on the shelf is kept per device, like the board's other
// switches: it's the coach's own scratch list, not part of anyone's program.
import { useState } from "react";
import type { PointerEvent } from "react";
import { Grip } from "@/components/Drag";
import { Select, buttonClass } from "@/components/ui";
import type { BoardSubject } from "@/components/useBoardDrag";
import { exerciseCount, type BoardPickerItem, type BoardWorkout } from "@/lib/board-order";
import type { Suggestion } from "@/lib/board-suggest";
import { cn } from "@/lib/cn";

export type ShelfItem = {
  key: string;
  title: string;
  workout: BoardWorkout | null;
  muscles: string[];
  suggestions: Suggestion[];
  // The day it already sits on, on the library's week.
  on: number | null;
};

export function BoardShelf({
  items,
  library,
  dayLabels,
  personal,
  busy,
  dragging,
  grip,
  onAdd,
  onRemove,
  onPlace,
}: {
  items: ShelfItem[];
  library: BoardPickerItem[];
  dayLabels: string[];
  // A person's week, where placing schedules a session, rather than the library's.
  personal: boolean;
  busy: boolean;
  dragging: string | null;
  grip: (subject: BoardSubject) => { onPointerDown: (e: PointerEvent) => void };
  onAdd: (key: string) => void;
  onRemove: (key: string) => void;
  onPlace: (key: string, day: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const onShelf = new Set(items.map((i) => i.key));
  const choices = library.filter((l) => !onShelf.has(l.key));

  return (
    <section
      aria-label="Workout library"
      className="mt-5 rounded-[var(--radius-card)] border border-line bg-card/60 p-4"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="eyebrow text-ink">Workout library</h2>
        <span className="metric text-xs text-ink-soft/70">{items.length || ""}</span>
        <p className="w-full text-xs text-ink-soft sm:w-auto sm:flex-1">
          {personal
            ? "Workouts to put on this week. Drag one onto a day, or tap a suggested day, to schedule it."
            : "Workouts to put on your week. Drag one onto a day, or tap a suggested day, to give it that day."}
        </p>
        {adding ? (
          <div className="flex w-full items-center gap-2 sm:w-72">
            <Select
              autoFocus
              value=""
              aria-label="Workout to add to the shelf"
              onChange={(e) => {
                if (e.target.value) onAdd(e.target.value);
                setAdding(false);
              }}
              onBlur={() => setAdding(false)}
              className="min-w-0 flex-1 py-1.5 text-sm sm:min-h-9"
            >
              <option value="">Choose a workout…</option>
              {choices.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.title}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={choices.length === 0}
            className={buttonClass("outline", "sm")}
          >
            + Add workout
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          Nothing here yet. Add the workouts you want this week, and each will say where it fits
          best.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.key}
              data-board-shelf={item.key}
              className={cn(
                "flex min-w-0 flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-paper p-3 transition-opacity",
                dragging === item.key && "opacity-40",
              )}
            >
              <div className="flex items-start gap-2">
                <Grip
                  label={item.title}
                  className="mt-0.5 h-9 w-6 hover:bg-card"
                  {...grip({ kind: "shelf", key: item.key, label: item.title })}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                  <p className="metric truncate text-xs text-ink-soft">
                    {item.workout
                      ? `${exerciseCount(item.workout)} exercises${item.muscles.length ? ` · ${item.muscles.slice(0, 3).join(" · ")}` : ""}`
                      : "Loading…"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.key)}
                  aria-label={`Take ${item.title} off the shelf`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] text-ink-soft/70 transition-colors hover:bg-card hover:text-ink sm:h-7 sm:w-7"
                >
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {item.on != null ? (
                <p className="eyebrow text-jade-strong">On {dayLabels[item.on]}</p>
              ) : null}
              {item.workout && item.suggestions.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="eyebrow text-ink-soft/70">
                    {item.on != null ? "Or" : "Suggested"}
                  </span>
                  {item.suggestions.map((s) => (
                    <button
                      key={s.day}
                      type="button"
                      disabled={busy}
                      title={s.reason}
                      aria-label={`${personal ? "Schedule" : "Put"} ${item.title} on ${dayLabels[s.day]}. ${s.reason}.`}
                      onClick={() => onPlace(item.key, s.day)}
                      className="eyebrow inline-flex min-h-10 items-center rounded-full border border-jade/50 bg-jade-wash px-3 text-jade-strong transition-colors hover:border-jade disabled:opacity-50 sm:min-h-7"
                    >
                      {dayLabels[s.day]}
                    </button>
                  ))}
                </div>
              ) : null}
              {item.workout && item.suggestions[0] ? (
                <p className="text-xs leading-snug text-ink-soft">
                  {dayLabels[item.suggestions[0].day]}: {item.suggestions[0].reason}.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
