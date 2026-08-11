import Link from "next/link";
import { addDays, toDateInput } from "@/lib/format";

// The week as seven cells, with a filled dot on days that have a log. The gap
// in the row is the thing the person reading it is actually looking for.
//
// This used to argue it was a replacement for a history route. It isn't, and
// /me/nutrition/history now exists alongside it — the two answer different
// questions. This one answers "did I log Tuesday?" while you are standing in a
// week; the history answers "what have the last two months looked like?", which
// seven cells can't show at any width.
//
// `basePath` is the whole difference between the two callers — /my/nutrition
// for an athlete's own log and /me/nutrition for a coach's. The index route
// renders today and `${basePath}/${day}` renders any other day, in both.
export function NutritionWeekStrip({
  basePath,
  weekStart,
  logged,
  current,
  today,
}: {
  basePath: string;
  weekStart: Date;
  // The yyyy-mm-dd keys in this week that have something logged against them.
  logged: Set<string>;
  current: string;
  today: string;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const prev = toDateInput(addDays(weekStart, -7));
  const next = toDateInput(addDays(weekStart, 7));

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link
          href={`${basePath}/${prev}`}
          className="metric min-h-11 px-1 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0"
        >
          ‹ Prev
        </Link>
        <Link
          href={`${basePath}/${next}`}
          className="metric min-h-11 px-1 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0"
        >
          Next ›
        </Link>
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = toDateInput(d);
          const isCurrent = key === current;
          const isFuture = key > today;
          const cell = (
            <>
              <span className="eyebrow text-[0.6rem] leading-none">
                {new Intl.DateTimeFormat("en-US", { weekday: "narrow" }).format(d)}
              </span>
              <span className="metric mt-1 text-sm leading-none">
                {d.getDate()}
              </span>
              <span
                aria-hidden
                className={
                  "mt-1.5 h-1.5 w-1.5 rounded-full " +
                  (logged.has(key)
                    ? isCurrent
                      ? "bg-paper"
                      : "bg-jade"
                    : "bg-transparent")
                }
              />
            </>
          );

          // Every day in the week is a link, the ones ahead included: the day
          // page shows the plan whether or not there's anything to log against
          // it, and "what am I eating Thursday" is a fair question to click
          // for. A day that hasn't happened is dimmed rather than dead — it
          // opens, it just has no log form on it.
          return (
            <Link
              key={key}
              href={`${basePath}/${key}`}
              className={
                "flex min-h-14 flex-col items-center justify-center rounded-[var(--radius-sm)] border px-1 py-2 transition-colors hover:border-ink/40 " +
                (isCurrent
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-card text-ink-soft") +
                (isFuture && !isCurrent ? " opacity-60" : "")
              }
            >
              {cell}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
