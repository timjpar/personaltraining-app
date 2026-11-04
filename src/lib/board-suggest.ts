// Where a workout from the board's shelf would fit in the week on screen.
//
// A muscle trained hard wants a day or two before it's trained hard again —
// the usual 48 hours for a session of several working sets — so a day is a
// poor fit when the day itself, or the day either side, already works what
// this workout works. A day that already holds a session is a poorer fit than
// a free one, since two sessions in a day is a bigger ask than one. Pure, so
// the board and its tests agree on the same answer.
import { SECTION_ORDER } from "@/lib/constants";
import { workoutStats } from "@/lib/workout-stats";
import type { BoardWorkout } from "@/lib/board-order";

// The muscles a workout trains enough to need recovering from: two or more
// direct working sets. A single set of something in a warm-up doesn't count.
const HARD_SETS = 2;

export type Muscles = Map<string, string>; // muscle key → label

export function hardMuscles(w: BoardWorkout): Muscles {
  const stats = workoutStats(
    SECTION_ORDER.flatMap((section) => w.rows[section].map((row) => ({ ...row, section }))),
    w.discipline,
  );
  return new Map(stats.muscles.filter((m) => m.sets >= HARD_SETS).map((m) => [m.muscle, m.label]));
}

export type DayLoad = {
  // Hidden days get no suggestion: the coach has said they don't train then.
  // Nor do days already gone.
  shown: boolean;
  label: string;
  count: number;
  muscles: Muscles;
};

export type Suggestion = { day: number; reason: string };

const list = (labels: string[]) =>
  labels.length <= 2
    ? labels.join(" and ")
    : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;

const shared = (a: Muscles, b: Muscles) => [...a.keys()].filter((k) => b.has(k));

/**
 * The best days for a workout with these muscles, best first, at most `limit`.
 * `cyclic` is for the library's week, which repeats, so Saturday sits beside
 * Sunday; a person's dated week doesn't wrap. `skip` is a day it's already on.
 */
export function suggestDays(
  muscles: Muscles,
  days: DayLoad[],
  { cyclic, skip = null, limit = 2 }: { cyclic: boolean; skip?: number | null; limit?: number },
): Suggestion[] {
  const n = days.length;
  const near = (i: number, d: number) => {
    const j = i + d;
    if (cyclic) return days[(j + n) % n];
    return j >= 0 && j < n ? days[j] : undefined;
  };

  const scored = days.flatMap((day, i) => {
    if (!day.shown || i === skip) return [];
    const same = shared(muscles, day.muscles);
    const sides = [near(i, -1), near(i, 1)].filter((d) => d != null);
    const beside = sides.flatMap((d) => shared(muscles, d.muscles).map((m) => ({ m, d })));
    const busySides = sides.filter((d) => d.count > 0).length;
    // A clash on the day itself is worse than one a day away; a session
    // already there outweighs a single clash a day away; a free day between
    // two free days breaks the last tie.
    const score = day.count * 4 + same.length * 3 + beside.length * 2 + busySides * 0.5;

    const label = (k: string) => muscles.get(k) ?? k;
    let reason: string;
    if (same.length === 0 && beside.length === 0) {
      const what = [...muscles.values()].slice(0, 3);
      reason =
        (day.count === 0 ? "A free day" : `Already has ${day.count} session${day.count === 1 ? "" : "s"}`) +
        (what.length ? `, and nothing for ${list(what.map((s) => s.toLowerCase()))} the day before or after` : "");
    } else {
      const parts: string[] = [];
      if (same.length) parts.push(`${list(same.map(label).map((s) => s.toLowerCase()))} that day`);
      const byDay = new Map<string, string[]>();
      for (const { m, d } of beside) byDay.set(d.label, [...(byDay.get(d.label) ?? []), label(m).toLowerCase()]);
      for (const [d, ms] of byDay) parts.push(`${list([...new Set(ms)])} on ${d}`);
      reason = `Fewest clashes in the week: ${parts.join("; ")}`;
    }
    return [{ day: i, score, reason }];
  });

  scored.sort((a, b) => a.score - b.score || a.day - b.day);
  return scored.slice(0, limit).map(({ day, reason }) => ({ day, reason }));
}
