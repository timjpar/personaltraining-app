"use client";

// Drag and drop for the plan builder: meals, groups and foods, each picked up
// by its grip. The pointer handling is usePointerDrag's; this is where things
// land. The drop is one call to `onDrop` — the same pure moves the arrows
// make (src/lib/meal-order.ts), so the two can't disagree about what a group
// is.
//
// Hit-testing reads positions straight from the DOM, through data attributes
// the builder puts on its boxes: data-drag-meal on a meal card,
// data-drop-list on its list of foods, data-drag-group on a group's box and
// data-drag-food on a food's.
import { mid, rect, usePointerDrag, type Hit } from "@/components/usePointerDrag";
import { foodBlocks } from "@/lib/food-groups";
import type { Drop } from "@/lib/meal-order";

type Row = { id: string; groupId: string | null };
type Meal = { id: string; foods: Row[] };

export type DragSubject =
  | { kind: "food"; id: string; mealId: string; label: string }
  | { kind: "group"; id: string; mealId: string; label: string }
  | { kind: "meal"; id: string; label: string };

export type DragTarget =
  | { kind: "rows"; drop: Drop }
  | { kind: "meal"; index: number };

// Half the gap between rows (gap-2.5) and between meals (gap-5), so the line
// sits in the middle of the gap it's pointing at.
const ROW_GAP = 5;
const MEAL_GAP = 10;

function hitMeal(meals: Meal[], mealId: string, y: number): Hit<DragTarget> | null {
  const cards = meals
    .filter((m) => m.id !== mealId)
    .map((m) => rect(`[data-drag-meal="${m.id}"]`))
    .filter((r): r is DOMRect => r != null);
  if (!cards.length) return null;
  const index = cards.filter((r) => mid(r) < y).length;
  const top =
    index < cards.length ? cards[index].top - MEAL_GAP : cards[index - 1].bottom + MEAL_GAP;
  return {
    target: { kind: "meal", index },
    line: { top, left: cards[0].left, width: cards[0].width },
  };
}

function hitRows(
  meals: Meal[],
  subject: Extract<DragSubject, { kind: "food" | "group" }>,
  y: number,
): Hit<DragTarget> | null {
  // The meal: whichever food list is under the pointer, else the nearest one.
  let best: { meal: Meal; list: DOMRect; dist: number } | null = null;
  for (const meal of meals) {
    const list = rect(`[data-drop-list="${meal.id}"]`);
    if (!list) continue;
    const dist = y < list.top ? list.top - y : y > list.bottom ? y - list.bottom : 0;
    if (!best || dist < best.dist) best = { meal, list, dist };
  }
  if (!best) return null;
  const { meal, list } = best;

  const moving = (f: Row) =>
    subject.kind === "food" ? f.id === subject.id : f.groupId === subject.id;
  const rest = meal.foods.filter((f) => !moving(f));

  // A food over a group's box goes into that group. A group never does —
  // groups don't nest.
  if (subject.kind === "food") {
    const groupIds = new Set(meal.foods.map((f) => f.groupId).filter((g) => g != null));
    for (const groupId of groupIds) {
      const box = rect(`[data-drag-group="${groupId}"]`);
      if (!box || y < box.top || y > box.bottom) continue;
      const members = rest.filter((f) => f.groupId === groupId);
      const rects = members
        .map((f) => rect(`[data-drag-food="${f.id}"]`))
        .filter((r): r is DOMRect => r != null);
      const self = rect(`[data-drag-food="${subject.id}"]`);
      const k = rects.filter((r) => mid(r) < y).length;
      // A group whose only food is the one in hand: dropping it back in puts
      // it back where it was.
      const index = members.length
        ? rest.indexOf(members[0]) + k
        : meal.foods.findIndex((f) => f.id === subject.id);
      const ref = rects[0] ?? self;
      if (!ref) return null;
      const top = !rects.length
        ? ref.top - ROW_GAP
        : k < rects.length
          ? rects[k].top - ROW_GAP
          : rects[k - 1].bottom + ROW_GAP;
      return {
        target: { kind: "rows", drop: { mealId: meal.id, index, groupId } },
        line: { top, left: ref.left, width: ref.width },
      };
    }
  }

  // Anywhere else lands loose, between whole blocks, so nothing ends up
  // inside a group by brushing past it.
  const blocks = foodBlocks(rest, (f) => f.groupId);
  const rects = blocks
    .map((b) =>
      rect(b.group ? `[data-drag-group="${b.group}"]` : `[data-drag-food="${b.foods[0].id}"]`),
    )
    .filter((r): r is DOMRect => r != null);
  const n = rects.filter((r) => mid(r) < y).length;
  const index = blocks.slice(0, n).reduce((sum, b) => sum + b.foods.length, 0);
  const top =
    n < rects.length
      ? rects[n].top - ROW_GAP
      : rects.length
        ? rects[n - 1].bottom + ROW_GAP
        : list.top;
  return {
    target: { kind: "rows", drop: { mealId: meal.id, index, groupId: null } },
    line: { top, left: list.left, width: list.width },
  };
}

function hitTest(meals: Meal[], subject: DragSubject, y: number): Hit<DragTarget> | null {
  return subject.kind === "meal" ? hitMeal(meals, subject.id, y) : hitRows(meals, subject, y);
}

export function useMealDrag(
  meals: Meal[],
  onDrop: (subject: DragSubject, target: DragTarget) => void,
) {
  return usePointerDrag<DragSubject, DragTarget>(
    (subject, y) => hitTest(meals, subject, y),
    onDrop,
  );
}
