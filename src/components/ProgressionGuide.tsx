"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui";
import { Chevron, Ladder } from "@/components/ProgressionPanel";
import { cn } from "@/lib/cn";
import type { Discipline } from "@/lib/constants";
import { FAMILY_LABELS, pathsThrough } from "@/lib/progressions";

// The progressions through one movement with nobody's history attached: the
// builder, a library workout, the exercise catalog. Same ladders the athlete's
// ProgressionPanel draws, read as a map — the path the app would pick first,
// then every other one on request. Choosing a path is the athlete's (or their
// coach's, on the athlete's session), so nothing here writes — unless the caller passes `onPick`, which offers
// each step as a swap.
//
// Every control is type="button": the builder renders this inside its form.

export function ProgressionPaths({
  name,
  discipline,
  onPick,
}: {
  name: string;
  discipline?: Discipline;
  // Lets a step be picked in place of this movement (see Ladder).
  onPick?: (name: string) => void;
}) {
  const [allPaths, setAllPaths] = useState(false);
  const [peek, setPeek] = useState<string | null>(null);
  const places = pathsThrough(name, { discipline });
  if (places.length === 0) return null;

  const [{ path, index }, ...others] = places;
  const step = path.steps[index];
  const next = path.steps[index + 1];

  return (
    <div className="flex flex-col gap-4">
      {next && step.when ? (
        <div className="rounded-[var(--radius-sm)] border border-amber/25 bg-amber-wash/50 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-ink">
          <span className="eyebrow mr-1.5 text-amber">Next: {next.name}</span>
          when {step.when.charAt(0).toLowerCase() + step.when.slice(1)}
          {step.weeks ? (
            <span className="text-ink-soft"> Usually {step.weeks} here.</span>
          ) : null}
        </div>
      ) : null}

      {path.blurb ? (
        <p className="text-[0.8125rem] leading-relaxed text-ink-soft">{path.blurb}</p>
      ) : null}

      <Ladder path={path} at={index} map onPick={onPick} />

      {others.length ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setAllPaths((a) => !a)}
            aria-expanded={allPaths}
            className={cn(buttonClass("outline", "sm"), "self-start")}
          >
            {allPaths ? "Hide other paths" : `See all paths (${places.length})`}
          </button>
          {allPaths ? (
            <ul className="flex flex-col gap-2">
              {others.map(({ path: other, index: at }) => {
                const peeking = peek === other.id;
                return (
                  <li
                    key={other.id}
                    className="rounded-[var(--radius-sm)] border border-line bg-paper p-3"
                  >
                    <button
                      type="button"
                      onClick={() => setPeek(peeking ? null : other.id)}
                      aria-expanded={peeking}
                      className="flex w-full items-start gap-2 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">
                          Path to {other.goal}
                        </span>
                        <span className="metric block text-xs text-ink-soft">
                          {FAMILY_LABELS[other.family]} · step {at + 1} of{" "}
                          {other.steps.length}
                          {at === other.steps.length - 1 ? " · the goal" : ""}
                        </span>
                      </span>
                      <span className="mt-1 text-ink-soft">
                        <Chevron open={peeking} />
                      </span>
                    </button>
                    {peeking ? (
                      <div className="mt-3 flex flex-col gap-3">
                        {other.blurb ? (
                          <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
                            {other.blurb}
                          </p>
                        ) : null}
                        <Ladder path={other} at={at} map onPick={onPick} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// The collapsed row that opens ProgressionPaths, for a card's footer.
export function ProgressionGuide({
  name,
  discipline,
  className,
  onPick,
}: {
  name: string;
  discipline?: Discipline;
  className?: string;
  onPick?: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const places = pathsThrough(name, { discipline });
  if (places.length === 0) return null;
  const { path, index } = places[0];

  return (
    <div className={cn("border-t border-line pt-3", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full min-h-11 items-center gap-2.5 text-left sm:min-h-0"
      >
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-wash text-amber"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1.5 10 L4.5 7 L6.5 8.5 L10.5 3 M7.5 3 H10.5 V6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink">
            <span className="text-ink-soft">Progressions · Path to </span>
            <span className="font-semibold">{path.goal}</span>
          </span>
          <span className="metric block text-xs text-ink-soft">
            Step {index + 1} of {path.steps.length}
            {places.length > 1 ? ` · ${places.length} paths` : ""}
          </span>
        </span>
        <span className="text-ink-soft">
          <Chevron open={open} />
        </span>
      </button>
      {open ? (
        <div className="mt-3">
          <ProgressionPaths name={name} discipline={discipline} onPick={onPick} />
        </div>
      ) : null}
    </div>
  );
}
