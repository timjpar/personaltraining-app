"use client";

// What a board card works, under its set count: the muscles it hits most in
// one line, opening into the full breakdown — sets and exercises per muscle,
// movement patterns, rep ranges, and the notes worth a second look.
//
// Open or closed is one switch for the whole board, kept per device: the
// breakdowns are for comparing, so opening one opens them all and they line up
// across the columns.
import { Fragment } from "react";
import { Chevron } from "@/components/ProgressionPanel";
import { cn } from "@/lib/cn";
import { useStoredValue } from "@/lib/use-stored-set";
import {
  SESSION_SET_CEILING,
  type MuscleSource,
  type WorkoutStats,
  type ZoneKey,
} from "@/lib/workout-stats";

type Open = "open" | "closed";
const coerce = (raw: unknown): Open => (raw === "open" ? "open" : "closed");

export function useBoardBreakdown(): [boolean, (next: boolean) => void] {
  const [value, store] = useStoredValue("pt_board_breakdown", coerce);
  return [value === "open", (next) => store(next ? "open" : "closed")];
}

const ZONE_FILL: Record<ZoneKey, string> = {
  strength: "bg-amber",
  hypertrophy: "bg-jade",
  endurance: "bg-jade/40",
  timed: "bg-ink-soft/50",
  open: "bg-ink-soft/25",
};

// The muscles the summary line names before it stops.
const SUMMARY_MUSCLES = 4;

export function BoardStatsSummary({
  stats,
  open,
  onToggle,
}: {
  stats: WorkoutStats;
  open: boolean;
  onToggle: () => void;
}) {
  const top = stats.muscles.filter((m) => m.sets > 0).slice(0, SUMMARY_MUSCLES);
  const stretchOnly = top.length === 0;
  const names = stretchOnly ? stats.stretched.slice(0, SUMMARY_MUSCLES) : [];
  if (top.length === 0 && names.length === 0) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={open ? "Hide the breakdown on every workout" : "Show the breakdown on every workout"}
      className="mt-2 flex w-full min-h-11 items-center gap-2 text-left sm:min-h-0"
    >
      <span className="flex min-w-0 flex-1 flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-ink-soft">
        {stretchOnly ? (
          <>
            <span className="eyebrow">Mobility</span>
            {names.map((label) => (
              <span key={label} className="text-ink">
                {label}
              </span>
            ))}
          </>
        ) : (
          top.map((m) => (
            <span key={m.muscle} className="whitespace-nowrap">
              <span className="text-ink">{m.label}</span>{" "}
              <span className="metric">{m.sets}</span>
            </span>
          ))
        )}
      </span>
      <span className="shrink-0 text-ink-soft">
        <Chevron open={open} />
      </span>
    </button>
  );
}

export function BoardStatsBreakdown({ stats }: { stats: WorkoutStats }) {
  const zoneTotal = stats.zones.reduce((t, z) => t + z.sets, 0);
  const worked = stats.muscles.filter((m) => m.works.length > 0);
  const assisting = stats.muscles.filter((m) => m.works.length === 0);

  return (
    <div className="mx-2.5 mb-2 flex flex-col gap-4 rounded-[var(--radius-sm)] border border-line bg-paper/60 p-3">
      {stats.muscles.length ? (
        <section>
          <div className="mb-2 flex items-baseline gap-2">
            <h3 className="eyebrow flex-1 text-ink-soft">Muscles</h3>
            <span className="whitespace-nowrap text-[0.6875rem] text-ink-soft/70">exercises · sets</span>
          </div>
          <ul className="flex flex-col gap-3">
            {worked.map((m) => (
              <li key={m.muscle}>
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-ink">{m.label}</span>
                  <span className="metric shrink-0 text-ink-soft">
                    {m.works.length} ·{" "}
                    <span className={m.sets > SESSION_SET_CEILING ? "text-amber" : "text-ink"}>
                      {m.sets}
                    </span>
                  </span>
                </div>
                {/* A fixed scale, so the same muscle's bars compare across
                    columns: full where one session's sets stop paying. */}
                <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-line" aria-hidden>
                  <div
                    className="h-full bg-jade/70"
                    style={{ width: `${Math.min(1, m.sets / SESSION_SET_CEILING) * 100}%` }}
                  />
                </div>
                <Sources sources={m.works} className="mt-1.5" />
                {m.assists.length ? (
                  <Sources label="Helps in" sources={m.assists} className="mt-0.5 opacity-75" />
                ) : null}
              </li>
            ))}
          </ul>
          {/* Muscles no exercise works most, apart and without a bar: they're
              along for the ride, and ranking them with the rest would bury the
              ones the workout is for. */}
          {assisting.length ? (
            <>
              <h3 className="eyebrow mb-2 mt-4 text-ink-soft">Only assisting</h3>
              <ul className="flex flex-col gap-2.5">
                {assisting.map((m) => (
                  <li key={m.muscle}>
                    <div className="flex items-baseline gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate text-ink">{m.label}</span>
                      <span className="metric shrink-0 text-ink-soft">
                        {m.assists.length} · {m.assistSets}
                      </span>
                    </div>
                    <Sources sources={m.assists} className="mt-0.5" />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      {stats.stretched.length ? (
        <section>
          <h3 className="eyebrow mb-1.5 text-ink-soft">Mobility for</h3>
          <p className="text-xs leading-relaxed text-ink">{stats.stretched.join(" · ")}</p>
        </section>
      ) : null}

      {stats.patterns.length ? (
        <section>
          <h3 className="eyebrow mb-2 text-ink-soft">Movement · sets</h3>
          <ul className="flex flex-wrap gap-1.5">
            {stats.patterns.map((p) => (
              <li
                key={p.key}
                className={cn(
                  "inline-flex items-baseline gap-1.5 rounded-full border px-2.5 py-0.5 text-xs",
                  p.exercises
                    ? "border-jade/40 bg-jade-wash text-ink"
                    : "border-dashed border-line text-ink-soft/70",
                )}
              >
                {p.label}
                <span className="metric text-ink-soft">{p.exercises ? p.sets : "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {zoneTotal > 0 ? (
        <section>
          <h3 className="eyebrow mb-2 text-ink-soft">Rep ranges · sets</h3>
          <div className="flex h-1.5 gap-px overflow-hidden rounded-full" aria-hidden>
            {stats.zones.map((z) => (
              <div
                key={z.key}
                className={ZONE_FILL[z.key]}
                style={{ width: `${(z.sets / zoneTotal) * 100}%` }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {stats.zones.map((z) => (
              <li key={z.key} className="flex items-baseline gap-2 text-xs">
                <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", ZONE_FILL[z.key])} />
                <span className="min-w-0 flex-1 text-ink">
                  {z.label} <span className="text-ink-soft">{z.range}</span>
                </span>
                <span className="metric shrink-0 text-ink">{z.sets}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {stats.notes.length ? (
        <section>
          <h3 className="eyebrow mb-1.5 text-ink-soft">Notes</h3>
          <ul className="flex flex-col gap-1.5">
            {stats.notes.map((n) => (
              <li key={n.text} className="flex gap-2 text-xs leading-relaxed text-ink">
                <span
                  aria-hidden
                  className={cn(
                    "mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full",
                    n.tone === "flag" ? "bg-amber" : "bg-ink-soft/50",
                  )}
                />
                {n.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-[0.6875rem] leading-relaxed text-ink-soft">
        Main block only. A muscle&rsquo;s sets come from the exercises that work it most; the
        ones it only helps in are listed apart.
      </p>
    </div>
  );
}

// The exercises behind a muscle's count: "Back Squat 4 · Leg Press 3".
export function Sources({
  sources,
  label,
  className,
}: {
  sources: MuscleSource[];
  label?: string;
  className?: string;
}) {
  return (
    <p className={cn("text-[0.6875rem] leading-snug text-ink-soft", className)}>
      {label ? <span className="mr-1 italic">{label}</span> : null}
      {sources.map((src, i) => (
        <Fragment key={src.name}>
          {i ? " · " : ""}
          {src.name} <span className="metric text-ink">{src.sets}</span>
        </Fragment>
      ))}
    </p>
  );
}
