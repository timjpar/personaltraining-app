"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { animationFor, muscleLabel } from "@/lib/exercise-anim/lookup";

// The two muscle tints the drawings use, so the legend matches the picture
// rather than the app's theme. Fixed for the same reason the chart series
// palette is: they mean "this muscle", not "the accent".
const WORKS = "#e2463b";
const ASSISTS = "#f0a493";

// An exercise's animated demo: a thumbnail that opens a larger view with the
// muscles it works. Renders nothing for an exercise with no drawing — a
// trainer's own custom movements, mostly — so callers can drop it in
// unconditionally.
export function ExerciseAnimation({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const info = animationFor(name);
  if (!info) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Show how to do ${name}`}
        className={cn(
          "block shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-line bg-[#f4f6f5] transition-colors hover:border-jade/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- an animated
            SVG; next/image would rasterise or proxy it for nothing. */}
        <img src={info.src} alt="" loading="lazy" decoding="async" className="block h-full w-full" />
      </button>

      <dialog
        ref={dialog}
        aria-label={name}
        // A click that lands on the dialog itself, not its contents, is a
        // click on the backdrop.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[min(92vw,460px)] rounded-[var(--radius-card)] border border-line bg-card p-0 text-ink shadow-[var(--shadow-card)] backdrop:bg-black/60"
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
          <h2 className="font-display text-lg font-semibold leading-tight">{name}</h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close"
            className="-mr-1.5 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-jade sm:h-9 sm:w-9"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-4 pt-3 sm:px-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- see above. */}
          <img
            src={info.src}
            alt={`${name}, animated`}
            loading="lazy"
            decoding="async"
            className="block aspect-square w-full rounded-[var(--radius-sm)] border border-line bg-[#f4f6f5]"
          />
        </div>
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2.5 px-4 pb-5 pt-4 sm:px-5">
          <MuscleRow label="Works" tint={WORKS} muscles={info.primary} />
          <MuscleRow label="Assists" tint={ASSISTS} muscles={info.secondary} />
        </dl>
      </dialog>
    </>
  );
}

function MuscleRow({ label, tint, muscles }: { label: string; tint: string; muscles: string[] }) {
  if (muscles.length === 0) return null;
  return (
    <>
      <dt className="eyebrow flex items-center gap-1.5 text-ink-soft/80">
        <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: tint }} />
        {label}
      </dt>
      <dd className="text-sm leading-relaxed text-ink">{muscles.map(muscleLabel).join(" · ")}</dd>
    </>
  );
}
