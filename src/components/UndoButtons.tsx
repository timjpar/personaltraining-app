"use client";

import { useSyncExternalStore } from "react";
import { redo, undo, useUndoAvailability } from "@/components/undo-stack";
import { cn } from "@/lib/cn";

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

// Undo and redo as buttons, beside an editor's top save: for a phone with no
// keyboard to press Ctrl+Z on, and so the keys are written down somewhere.
// They work the page's one history, the same one the keys do.
export function UndoButtons({ size = "sm", className }: { size?: "sm" | "md"; className?: string }) {
  const { canUndo, canRedo } = useUndoAvailability();
  const mac = useSyncExternalStore(
    () => () => {},
    isMac,
    () => false,
  );
  const buttons = [
    {
      label: "Undo",
      keys: mac ? "⌘Z" : "Ctrl+Z",
      on: undo,
      can: canUndo,
      path: "M7.5 4.5 4 8l3.5 3.5M4.5 8H12a4 4 0 0 1 0 8H9.5",
    },
    {
      label: "Redo",
      keys: mac ? "⇧⌘Z" : "Ctrl+Y",
      on: redo,
      can: canRedo,
      path: "M12.5 4.5 16 8l-3.5 3.5M15.5 8H8a4 4 0 0 0 0 8h2.5",
    },
  ];
  return (
    <div className={cn("flex items-center", className)}>
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={() => b.on()}
          disabled={!b.can}
          aria-label={b.label}
          title={`${b.label} (${b.keys})`}
          className={cn(
            "grid place-items-center rounded-[var(--radius-sm)] text-ink-soft transition-colors hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-35",
            size === "sm" ? "h-11 w-10 sm:h-9 sm:w-9" : "h-12 w-11 sm:h-11",
          )}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d={b.path} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}

