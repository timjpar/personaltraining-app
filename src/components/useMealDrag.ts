"use client";

// Drag and drop for the plan builder: meals, groups and foods, each picked up
// by its grip. Pointer events rather than the HTML drag API, because that API
// barely exists on a phone, and a phone is where plans get rearranged.
//
// Nothing moves while the drag is in flight. The dragged thing dims in place,
// a line shows where it would land, and the drop is one call to `onDrop` —
// the same pure moves the arrows make (src/lib/meal-order.ts), so the two
// can't disagree about what a group is.
//
// Hit-testing reads positions straight from the DOM, through data attributes
// the builder puts on its boxes: data-drag-meal on a meal card,
// data-drop-list on its list of foods, data-drag-group on a group's box and
// data-drag-food on a food's.
import { useEffect, useRef, useState, type PointerEvent } from "react";
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

type Line = { top: number; left: number; width: number };
type Hit = { target: DragTarget; line: Line };

// Half the gap between rows (gap-2.5) and between meals (gap-5), so the line
// sits in the middle of the gap it's pointing at.
const ROW_GAP = 5;
const MEAL_GAP = 10;
// How close to the top or bottom of the screen starts the page scrolling. A
// phone's bottom nav sits inside it, which is the point: a thumb resting on
// it still scrolls.
const EDGE = 96;
// A grip that's tapped, not dragged, shouldn't flash the drop line.
const SLOP = 4;

const rect = (selector: string) =>
  document.querySelector<HTMLElement>(selector)?.getBoundingClientRect() ?? null;
const mid = (r: DOMRect) => (r.top + r.bottom) / 2;

function hitMeal(meals: Meal[], mealId: string, y: number): Hit | null {
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
): Hit | null {
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

function hitTest(meals: Meal[], subject: DragSubject, y: number): Hit | null {
  return subject.kind === "meal" ? hitMeal(meals, subject.id, y) : hitRows(meals, subject, y);
}

export function useMealDrag(
  meals: Meal[],
  onDrop: (subject: DragSubject, target: DragTarget) => void,
) {
  // What's in hand once the pointer has moved past SLOP; null otherwise.
  const [dragging, setDragging] = useState<DragSubject | null>(null);
  const [line, setLine] = useState<Line | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  // A press on a grip, waiting to see whether it turns into a drag.
  const [pressed, setPressed] = useState<{ subject: DragSubject; x: number; y: number } | null>(
    null,
  );

  // The listeners live for a whole drag; these keep them reading the latest
  // plan and handler without re-subscribing on every render.
  const mealsRef = useRef(meals);
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    mealsRef.current = meals;
    onDropRef.current = onDrop;
  });

  useEffect(() => {
    if (!pressed) return;
    const { subject } = pressed;
    let active = false;
    let last = { x: pressed.x, y: pressed.y };
    let target: DragTarget | null = null;
    let frame = 0;

    const update = () => {
      const hit = hitTest(mealsRef.current, subject, last.y);
      target = hit?.target ?? null;
      setLine(hit?.line ?? null);
    };

    const move = (e: globalThis.PointerEvent) => {
      last = { x: e.clientX, y: e.clientY };
      if (!active) {
        if (Math.hypot(last.x - pressed.x, last.y - pressed.y) < SLOP) return;
        active = true;
        setDragging(subject);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
      setPointer(last);
      update();
    };

    // Scrolls while the pointer rests near an edge, faster the closer it is,
    // re-aiming the line as the page moves under it.
    const tick = () => {
      if (active) {
        const below = window.innerHeight - EDGE;
        const dy =
          last.y < EDGE
            ? -Math.ceil((EDGE - last.y) / 5)
            : last.y > below
              ? Math.ceil((last.y - below) / 5)
              : 0;
        if (dy) {
          window.scrollBy(0, dy);
          update();
        }
      }
      frame = requestAnimationFrame(tick);
    };

    let done = false;
    const finish = (commit: boolean) => {
      if (done) return;
      done = true;
      if (commit && active && target) onDropRef.current(subject, target);
      setPressed(null);
    };
    const up = () => finish(true);
    const cancel = () => finish(false);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      cancelAnimationFrame(frame);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setDragging(null);
      setLine(null);
      setPointer(null);
    };
  }, [pressed]);

  // Spread onto a grip. preventDefault keeps the press from focusing or
  // selecting anything underneath; the grip's touch-none keeps a finger on it
  // from scrolling the page instead.
  const grip = (subject: DragSubject) => ({
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      setPressed({ subject, x: e.clientX, y: e.clientY });
    },
  });

  return { grip, dragging, line, pointer };
}
