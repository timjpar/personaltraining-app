"use client";

// Every workout on the board added up: each muscle's sets across all of them,
// the exercises behind those sets, and which day they come from. Every muscle
// is listed, even the ones at zero, because the point is to spot what the week
// leaves out.
//
// On or off is a per-device switch beside Animations.
import { useMemo } from "react";
import { ToggleChip } from "@/components/AnimationToggle";
import { Sources } from "@/components/BoardWorkoutStats";
import type { BoardWorkout } from "@/lib/board-order";
import { cn } from "@/lib/cn";
import { SECTION_ORDER } from "@/lib/constants";
import { parseDateInput } from "@/lib/format";
import { DAY_SHORT, workoutDay } from "@/lib/library-view";
import { useStoredValue } from "@/lib/use-stored-set";
import { formatMinutes, weekStats, type WeekMuscle } from "@/lib/workout-stats";

type Shown = "on" | "off";
const coerce = (raw: unknown): Shown => (raw === "on" ? "on" : "off");

export function useShowWeekTotals(): [boolean, (next: boolean) => void] {
  const [value, store] = useStoredValue("pt_board_totals", coerce);
  return [value === "on", (next) => store(next ? "on" : "off")];
}

export function WeekTotalsToggle({ className }: { className?: string }) {
  const [shown, setShown] = useShowWeekTotals();
  return (
    <ToggleChip pressed={shown} onToggle={() => setShown(!shown)} className={className}>
      Week totals
    </ToggleChip>
  );
}

// Most guidance on building muscle starts at about ten hard sets a week for
// each one (Schoenfeld et al., 2017). The bars mark it and fill at twice that.
const WEEKLY_FLOOR = 10;
const BAR_FULL = WEEKLY_FLOOR * 2;

// "Mon" for a workout that sits on a day, by its title's prefix or its date;
// otherwise its title, cut short. Two that would read the same get their titles.
function shortLabels(workouts: BoardWorkout[]): string[] {
  const titleOf = (w: BoardWorkout) => {
    const t = w.title.trim() || "Untitled";
    return t.length > 16 ? `${t.slice(0, 15)}…` : t;
  };
  const labels = workouts.map((w) => {
    const date = w.kind === "session" && w.date ? parseDateInput(w.date) : null;
    const day = w.kind === "template" ? workoutDay(w.title) : date ? date.getDay() : null;
    return day != null ? DAY_SHORT[day] : titleOf(w);
  });
  return labels.map((l, i) => (labels.indexOf(l) !== labels.lastIndexOf(l) ? titleOf(workouts[i]) : l));
}

export function BoardWeekTotals({ workouts }: { workouts: BoardWorkout[] }) {
  const stats = useMemo(() => {
    const labels = shortLabels(workouts);
    return weekStats(
      workouts.map((w, i) => ({
        key: w.key,
        label: labels[i],
        discipline: w.discipline,
        exercises: SECTION_ORDER.flatMap((section) =>
          w.rows[section].map((row) => ({ ...row, section })),
        ),
      })),
    );
  }, [workouts]);

  const push = stats.patterns.find((p) => p.key === "push")?.sets ?? 0;
  const pull = stats.patterns.find((p) => p.key === "pull")?.sets ?? 0;

  return (
    <section
      aria-label="Week totals"
      className="mt-6 rounded-[var(--radius-card)] border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5"
    >
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-semibold text-ink">Week totals</h2>
        <p className="metric flex flex-wrap items-baseline gap-x-3 text-xs text-ink-soft">
          <span>
            <span className="text-sm text-ink">{stats.workouts}</span> workout
            {stats.workouts === 1 ? "" : "s"}
          </span>
          <span>
            <span className="text-sm text-ink">{stats.sets}</span> sets
          </span>
          {stats.minutes > 0 ? <span>{formatMinutes(stats.minutes)}</span> : null}
        </p>
      </header>

      {stats.untargeted.length || stats.assistingOnly.length ? (
        <div className="mt-3 flex flex-col gap-1.5 text-[0.8125rem] leading-relaxed">
          {stats.untargeted.length ? (
            <p className="rounded-[var(--radius-sm)] border border-flag/25 bg-flag/5 px-3 py-2 text-ink">
              <span className="eyebrow mr-2 text-flag">Not targeted</span>
              {stats.untargeted.join(" · ")}
            </p>
          ) : null}
          {stats.assistingOnly.length ? (
            <p className="rounded-[var(--radius-sm)] border border-amber/25 bg-amber-wash/50 px-3 py-2 text-ink">
              <span className="eyebrow mr-2 text-amber">Only assisting</span>
              {stats.assistingOnly.join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {stats.regions.map((region) => (
          <div key={region.label}>
            <div className="mb-2.5 flex items-baseline gap-2">
              <h3 className="eyebrow flex-1 text-ink-soft">{region.label}</h3>
              <span className="whitespace-nowrap text-[0.6875rem] text-ink-soft/70">
                exercises · sets
              </span>
            </div>
            <ul className="flex flex-col gap-3.5">
              {region.muscles.map((m) => (
                <MuscleRow key={m.muscle} muscle={m} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {stats.patterns.length ? (
        <div className="mt-6 border-t border-line pt-4">
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
          {push > 0 || pull > 0 ? (
            <p className="metric mt-2 text-xs text-ink-soft">
              Push : pull{" "}
              <span className={pull > 0 && push >= pull * 1.5 ? "text-amber" : "text-ink"}>
                {push} : {pull}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {stats.stretched.length ? (
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          <span className="eyebrow mr-2">Mobility work</span>
          <span className="text-ink">{stats.stretched.join(" · ")}</span>
        </p>
      ) : null}

      <p className="mt-4 text-[0.6875rem] leading-relaxed text-ink-soft">
        Sets from the main block of every workout open on the board. A muscle&rsquo;s sets come
        from the exercises that work it most; the ones it only helps in are listed apart. The mark
        on each bar is {WEEKLY_FLOOR} sets a week, where most guidance on building muscle starts.
      </p>
    </section>
  );
}

function MuscleRow({ muscle: m }: { muscle: WeekMuscle }) {
  const none = !m.works.length && !m.assists.length;
  const assisting = !m.works.length && m.assists.length > 0;
  return (
    <li>
      <div className="flex items-baseline gap-2 text-xs">
        <span className={cn("min-w-0 flex-1 truncate", none ? "text-ink-soft" : "text-ink")}>
          {m.label}
        </span>
        {none ? (
          <span className="eyebrow shrink-0 text-flag">Not targeted</span>
        ) : assisting ? (
          <span className="eyebrow shrink-0 text-amber">Only assisting</span>
        ) : (
          <span className="metric shrink-0 text-ink-soft">
            {m.works.length} · <span className="text-ink">{m.sets}</span>
          </span>
        )}
      </div>
      <div
        className={cn(
          "relative mt-1 h-[3px] rounded-full",
          none ? "border-t border-dashed border-flag/40" : "bg-line",
        )}
        aria-hidden
      >
        {none ? null : (
          <>
            <div
              className="h-full rounded-full bg-jade/70"
              style={{ width: `${Math.min(1, m.sets / BAR_FULL) * 100}%` }}
            />
            <span
              className="absolute -top-[3px] h-[9px] w-px bg-ink-soft/50"
              style={{ left: `${(WEEKLY_FLOOR / BAR_FULL) * 100}%` }}
            />
          </>
        )}
      </div>
      {m.byWorkout.length ? (
        <p className="metric mt-1.5 text-[0.6875rem] text-ink-soft">
          {m.byWorkout.map((w, i) => (
            <span key={w.key}>
              {i ? " · " : ""}
              {w.label} <span className="text-ink">{w.sets}</span>
            </span>
          ))}
        </p>
      ) : null}
      {m.works.length ? <Sources sources={m.works} className="mt-0.5" /> : null}
      {m.assists.length ? (
        <Sources label="Helps in" sources={m.assists} className="mt-0.5 opacity-75" />
      ) : null}
    </li>
  );
}
