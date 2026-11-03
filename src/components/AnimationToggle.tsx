"use client";

// Whether the editors draw each exercise's animated demo. One switch shared by
// the workout builder and the board, kept per device in localStorage: it's a
// "how I like my screen" choice, not something a client or another coach
// should inherit. On unless turned off.
import { cn } from "@/lib/cn";
import { useStoredValue } from "@/lib/use-stored-set";

type Shown = "on" | "off";
const coerce = (raw: unknown): Shown => (raw === "off" ? "off" : "on");

export function useShowAnimations(): [boolean, (next: boolean) => void] {
  const [value, store] = useStoredValue("pt_editor_animations", coerce);
  return [value === "on", (next) => store(next ? "on" : "off")];
}

export function AnimationToggle({ className }: { className?: string }) {
  const [shown, setShown] = useShowAnimations();
  return (
    <button
      type="button"
      aria-pressed={shown}
      onClick={() => setShown(!shown)}
      className={cn(
        "eyebrow inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 transition-colors sm:min-h-8",
        shown
          ? "border-jade/50 bg-jade-wash text-jade-strong"
          : "border-line text-ink-soft hover:border-jade hover:text-ink",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("inline-block h-2 w-2 rounded-full", shown ? "bg-jade" : "border border-ink-soft/60")}
      />
      Animations
    </button>
  );
}
