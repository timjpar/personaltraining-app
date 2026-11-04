"use client";

// Drag and drop for the side-by-side board. Two things can be picked up:
//
// - an exercise, which lands between any two exercises of any workout on the
//   board — the card under the pointer, or the nearest one, then its nearest
//   section, then a place in it — unless that card is a logged session;
// - a whole workout, which in Columns lands between two columns and in Week
//   lands on a day;
// - an exercise off the shelf (BoardShelf), which lands as a dragged one does.
//
// The pointer handling is usePointerDrag's. Unlike the single-workout drags,
// this reads x as well as y, because the workouts sit side by side, and it
// reads everything inside one card's own box, because seven cards each have a
// "MAIN" section and a page-wide selector would only ever find the first.
// Data attributes on the board's boxes:
//
//   data-board-workout=<key>   a workout's card (data-locked on a logged one)
//   data-board-section=<s>     a section's list of rows, inside a card
//   data-board-exercise=<id>   one row
//   data-board-column=<key>    a column, in Columns
//   data-board-day=<0-6|none>  a day, in Week, and data-board-day-list its list
import { mid, usePointerDrag, type Hit } from "@/components/usePointerDrag";
import { SECTION_ORDER, type ExerciseSection } from "@/lib/constants";

export type BoardSubject =
  | { kind: "exercise"; key: string; id: string; label: string }
  | { kind: "workout"; key: string; label: string }
  // An exercise off the shelf (BoardShelf), on its way into a workout. `key`
  // is its name.
  | { kind: "shelf"; key: string; label: string };

export type BoardTarget =
  // Before `index` in that section, counted with the dragged exercise out.
  | { kind: "exercise"; key: string; section: ExerciseSection; index: number }
  // Before `index` among the columns, counted with the dragged one out.
  | { kind: "column"; index: number }
  // A day of the week; null is the library's "No day" tray.
  | { kind: "day"; day: number | null };

// Half the gap between rows (gap-1.5) and between columns (gap-3), so the line
// sits in the middle of the gap.
const ROW_GAP = 3;
const COLUMN_GAP = 6;

function distance(r: DOMRect, x: number, y: number): number {
  const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
  const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
  return Math.hypot(dx, dy);
}

// The box under the pointer, else the closest one.
function nearest(els: Iterable<HTMLElement>, x: number, y: number) {
  let best: { el: HTMLElement; r: DOMRect; dist: number } | null = null;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const dist = distance(r, x, y);
    if (!best || dist < best.dist) best = { el, r, dist };
  }
  return best;
}

function hitExercise(
  subject: { id: string },
  x: number,
  y: number,
): Hit<BoardTarget> | null {
  // Nearest of every card, logged ones included, so a pointer over a logged
  // session is aiming at nothing — not at whichever card sits beside it.
  const card = nearest(document.querySelectorAll<HTMLElement>("[data-board-workout]"), x, y);
  const key = card?.el.dataset.boardWorkout;
  if (!card || !key || card.el.hasAttribute("data-locked")) return null;

  // Within the card, the section by height alone, as useExerciseDrag picks it:
  // a heading or the Add button counts toward the section beside it.
  let best: { el: HTMLElement; r: DOMRect; dist: number } | null = null;
  for (const el of card.el.querySelectorAll<HTMLElement>("[data-board-section]")) {
    const r = el.getBoundingClientRect();
    const dist = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
    if (!best || dist < best.dist) best = { el, r, dist };
  }
  const section = best?.el.dataset.boardSection as ExerciseSection | undefined;
  if (!best || !section || !SECTION_ORDER.includes(section)) return null;

  const rects = [...best.el.querySelectorAll<HTMLElement>("[data-board-exercise]")]
    .filter((el) => el.dataset.boardExercise !== subject.id)
    .map((el) => el.getBoundingClientRect());
  const index = rects.filter((r) => mid(r) < y).length;
  const top =
    index < rects.length
      ? rects[index].top - ROW_GAP
      : rects.length
        ? rects[index - 1].bottom + ROW_GAP
        : // An empty section is a drop zone of its own; aim at its middle.
          mid(best.r);
  return {
    target: { kind: "exercise", key, section, index },
    line: { top, left: best.r.left, width: best.r.width },
  };
}

function hitColumn(subject: { key: string }, x: number): Hit<BoardTarget> | null {
  const all = [...document.querySelectorAll<HTMLElement>("[data-board-column]")];
  if (all.length === 0) return null;
  const rects = all.map((el) => el.getBoundingClientRect());
  const others = all
    .map((el, i) => ({ el, r: rects[i] }))
    .filter(({ el }) => el.dataset.boardColumn !== subject.key)
    .map(({ r }) => r);

  const index = others.filter((r) => (r.left + r.right) / 2 < x).length;
  const left =
    index < others.length
      ? others[index].left - COLUMN_GAP
      : others.length
        ? others[index - 1].right + COLUMN_GAP
        : rects[0].left;
  // Down the visible part of the row, not the whole of a column taller than
  // the screen.
  const top = Math.max(Math.min(...rects.map((r) => r.top)), 8);
  const bottom = Math.min(Math.max(...rects.map((r) => r.bottom)), window.innerHeight - 8);
  return {
    target: { kind: "column", index },
    line: { top, left, width: 0, height: Math.max(bottom - top, 24) },
  };
}

function hitDay(x: number, y: number): Hit<BoardTarget> | null {
  const day = nearest(document.querySelectorAll<HTMLElement>("[data-board-day]"), x, y);
  const raw = day?.el.dataset.boardDay;
  if (!day || raw == null) return null;
  // Under the last workout already on that day, which is where it will go.
  const list =
    day.el.querySelector<HTMLElement>("[data-board-day-list]")?.getBoundingClientRect() ??
    day.r;
  return {
    target: { kind: "day", day: raw === "none" ? null : Number(raw) },
    line: { top: list.bottom + 4, left: list.left, width: list.width },
  };
}

export function useBoardDrag(
  layout: "columns" | "week",
  onDrop: (subject: BoardSubject, target: BoardTarget) => void,
  scroller: () => HTMLElement | null,
) {
  return usePointerDrag<BoardSubject, BoardTarget>(
    (subject, y, x) => {
      if (subject.kind === "exercise") return hitExercise(subject, x, y);
      if (subject.kind === "shelf") return hitExercise({ id: "" }, x, y);
      return layout === "columns" ? hitColumn(subject, x) : hitDay(x, y);
    },
    onDrop,
    { scrollX: scroller },
  );
}
