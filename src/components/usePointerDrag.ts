"use client";

// Drag and drop by a grip, the part every builder shares: a press that turns
// into a drag once it moves, a line where it would land, the page scrolling
// under a pointer resting near an edge, and one call to `onDrop` on release.
// Pointer events rather than the HTML drag API, because that API barely exists
// on a phone, and a phone is where plans get rearranged.
//
// Nothing moves while the drag is in flight. The dragged thing dims in place
// and the line shows where it would land. Where that is belongs to the
// caller's `hitTest`, which reads positions straight from the DOM — see
// useMealDrag and useExerciseDrag.
import { useEffect, useRef, useState, type PointerEvent } from "react";

export type Line = { top: number; left: number; width: number };
export type Hit<T> = { target: T; line: Line };

// How close to the top or bottom of the screen starts the page scrolling. A
// phone's bottom nav sits inside it, which is the point: a thumb resting on
// it still scrolls.
const EDGE = 96;
// A grip that's tapped, not dragged, shouldn't flash the drop line.
const SLOP = 4;

export const rect = (selector: string) =>
  document.querySelector<HTMLElement>(selector)?.getBoundingClientRect() ?? null;
export const mid = (r: DOMRect) => (r.top + r.bottom) / 2;

export function usePointerDrag<S extends { label: string }, T>(
  hitTest: (subject: S, y: number) => Hit<T> | null,
  onDrop: (subject: S, target: T) => void,
) {
  // What's in hand once the pointer has moved past SLOP; null otherwise.
  const [dragging, setDragging] = useState<S | null>(null);
  const [line, setLine] = useState<Line | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  // A press on a grip, waiting to see whether it turns into a drag.
  const [pressed, setPressed] = useState<{ subject: S; x: number; y: number } | null>(null);

  // The listeners live for a whole drag; these keep them reading the latest
  // rows and handler without re-subscribing on every render.
  const hitTestRef = useRef(hitTest);
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    hitTestRef.current = hitTest;
    onDropRef.current = onDrop;
  });

  useEffect(() => {
    if (!pressed) return;
    const { subject } = pressed;
    let active = false;
    let last = { x: pressed.x, y: pressed.y };
    let target: T | null = null;
    let frame = 0;

    const update = () => {
      const hit = hitTestRef.current(subject, last.y);
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
  const grip = (subject: S) => ({
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      setPressed({ subject, x: e.clientX, y: e.clientY });
    },
  });

  return { grip, dragging, line, pointer };
}
