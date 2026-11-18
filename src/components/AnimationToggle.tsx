"use client";

// Whether the editors draw each exercise's animated demo. One switch shared by
// the workout builder and the board, kept per tab (useTabValue): it's a "how I
// like my screen" choice, not something a client or another coach should
// inherit, and one tab can have it on while another has it off. A new tab
// starts from the last choice. On unless turned off.
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useTabValue } from "@/lib/use-stored-set";

type Shown = "on" | "off";
const coerce = (raw: unknown): Shown => (raw === "off" ? "off" : "on");

export function useShowAnimations(): [boolean, (next: boolean) => void] {
  const [value, store] = useTabValue("pt_editor_animations", coerce);
  return [value === "on", (next) => store(next ? "on" : "off")];
}

export function AnimationToggle({ className }: { className?: string }) {
  const [shown, setShown] = useShowAnimations();
  return (
    <ToggleChip pressed={shown} onToggle={() => setShown(!shown)} className={className}>
      Animations
    </ToggleChip>
  );
}

// The pill these switches share, so a row of them reads as one set.
export function ToggleChip({
  pressed,
  onToggle,
  className,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        "eyebrow inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 transition-colors sm:min-h-8",
        pressed
          ? "border-jade/50 bg-jade-wash text-jade-strong"
          : "border-line text-ink-soft hover:border-jade hover:text-ink",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("inline-block h-2 w-2 rounded-full", pressed ? "bg-jade" : "border border-ink-soft/60")}
      />
      {children}
    </button>
  );
}
