"use client";

// The visible half of usePointerDrag, shared by the builders that use it.
import type { PointerEvent } from "react";
import type { Line } from "@/components/usePointerDrag";
import { cn } from "@/lib/cn";

// What drag and drop picks a thing up by. Out of the tab order and hidden from
// screen readers: where a builder offers arrows beside it, they make the same
// moves by keyboard. touch-none so a finger on it drags instead of scrolling
// the page.
export function Grip({
  label,
  className,
  onPointerDown,
}: {
  label: string;
  className?: string;
  onPointerDown: (e: PointerEvent) => void;
}) {
  return (
    <span
      aria-hidden
      title={`Drag to move ${label}`}
      onPointerDown={onPointerDown}
      className={cn(
        "grid shrink-0 cursor-grab touch-none place-items-center rounded-[8px] text-ink-soft/70 transition-colors hover:text-ink active:cursor-grabbing",
        className,
      )}
    >
      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
        {[3, 8, 13].map((y) =>
          [2.5, 7.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />),
        )}
      </svg>
    </span>
  );
}

// Where a drag would land, and what's in hand. Fixed to the viewport because
// that's what the hit-test measures in.
export function DragOverlay({
  line,
  label,
  pointer,
}: {
  line: Line | null;
  label: string | undefined;
  pointer: { x: number; y: number } | null;
}) {
  return (
    <>
      {line ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 h-0.5 rounded-full bg-jade"
          style={{ top: line.top - 1, left: line.left, width: line.width }}
        >
          <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full border-2 border-jade bg-card" />
        </div>
      ) : null}
      {label != null && pointer ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 max-w-[14rem] truncate rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper shadow-[var(--shadow-card)]"
          style={{
            top: pointer.y - 44,
            left: Math.max(8, Math.min(pointer.x + 14, window.innerWidth - 232)),
          }}
        >
          {label}
        </div>
      ) : null}
    </>
  );
}
