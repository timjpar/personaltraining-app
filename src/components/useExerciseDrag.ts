"use client";

// Drag and drop for the workout builder: an exercise picked up by its grip
// lands between any two exercises, in any section — so a main lift that's
// really a warm-up moves there without being retyped. The pointer handling is
// usePointerDrag's; this is where things land.
//
// Hit-testing reads positions straight from the DOM, through data attributes
// the builder puts on its boxes: data-drop-section on each section's list and
// data-drag-exercise on an exercise's card.
import { mid, rect, usePointerDrag, type Hit } from "@/components/usePointerDrag";
import { SECTION_ORDER, type ExerciseSection } from "@/lib/constants";

type Rows = Record<ExerciseSection, { id: string }[]>;

export type ExerciseSubject = { id: string; section: ExerciseSection; label: string };
// Where in the section's list it lands, counted with the dragged exercise
// already taken out.
export type ExerciseTarget = { section: ExerciseSection; index: number };

// Half the gap between cards (gap-3), so the line sits in the middle of it.
const ROW_GAP = 6;
// Half the gap under a section's heading (mb-2), where the line goes in a
// section with nothing else in it.
const HEAD_GAP = 4;

function hitTest(rows: Rows, subject: ExerciseSubject, y: number): Hit<ExerciseTarget> | null {
  // The section: whichever list is under the pointer, else the nearest one —
  // so a section's heading and its Add button count toward it, and an empty
  // section, whose list has no height, can still be aimed at.
  let best: { section: ExerciseSection; list: DOMRect; dist: number } | null = null;
  for (const section of SECTION_ORDER) {
    const list = rect(`[data-drop-section="${section}"]`);
    if (!list) continue;
    const dist = y < list.top ? list.top - y : y > list.bottom ? y - list.bottom : 0;
    if (!best || dist < best.dist) best = { section, list, dist };
  }
  if (!best) return null;
  const { section, list } = best;

  const rects = rows[section]
    .filter((r) => r.id !== subject.id)
    .map((r) => rect(`[data-drag-exercise="${r.id}"]`))
    .filter((r): r is DOMRect => r != null);
  const index = rects.filter((r) => mid(r) < y).length;
  const top =
    index < rects.length
      ? rects[index].top - ROW_GAP
      : rects.length
        ? rects[index - 1].bottom + ROW_GAP
        : list.top - HEAD_GAP;
  return {
    target: { section, index },
    line: { top, left: list.left, width: list.width },
  };
}

export function useExerciseDrag(
  rows: Rows,
  onDrop: (subject: ExerciseSubject, target: ExerciseTarget) => void,
) {
  return usePointerDrag<ExerciseSubject, ExerciseTarget>(
    (subject, y) => hitTest(rows, subject, y),
    onDrop,
  );
}
