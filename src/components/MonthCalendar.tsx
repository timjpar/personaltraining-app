import Link from "next/link";
import type { ReactNode } from "react";
import {
  formatMonthLabel,
  formatTime,
  isToday,
  monthGrid,
  monthKey,
  shiftMonth,
  type CalendarItem,
} from "@/lib/calendar";
import { toDateInput } from "@/lib/format";
import { ATTENDANCE, ATTENDANCE_BADGES, type Attendance } from "@/lib/constants";
import { cn } from "@/lib/cn";

// The month view, once. It was written twice — the trainer's calendar and the
// athlete's, near-identically — and the client detail page wanted a third copy,
// which is the point at which a shared component stops being tidiness and
// starts being the only way the three stay the same. What actually differed
// between the two originals was four things, and all four are props here: where
// the month stepper points, whether a day cell is a link, what sits beside the
// stepper, and what an empty month says.
//
// A server component. It renders links and text, holds no state, and both of
// its callers are already server components that did this inline.

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Chips per cell. Fixed at every breakpoint on purpose: a count that changed
// with the viewport would make the "+N more" label wrong at one of them.
const MAX_CHIPS = 3;

export type MonthCalendarProps = {
  // The grid is derived from this by monthGrid, here and in the caller that
  // built `byDay` — the same pure function from the same date, so the range
  // queried and the range rendered cannot drift apart.
  monthStart: Date;
  byDay: Map<string, CalendarItem[]>;

  // Where ‹ and › go, and where "Today" goes. Two props rather than one
  // builder taking a nullable key: the today link is a bare path on every
  // caller, and expressing that as a special case of a month key reads worse
  // than saying it.
  monthHref: (key: string) => string;
  todayHref: string;

  // When absent, a day cell is a plain block and each chip becomes its own
  // link. That is the mode a calendar embedded in a page wants: there is no
  // day page for "this client, this date", but every item on it has somewhere
  // of its own to point.
  dayHref?: (dayKey: string) => string;

  // Sits opposite the month stepper — the trainer's "New event", nothing on a
  // read-only calendar.
  action?: ReactNode;
  // Offered inside the phone empty state, where a whole card of nothing is the
  // natural place to put the way out of it.
  emptyAction?: ReactNode;

  // Colours the chips by who is in the room, and draws the key that explains
  // it. Off by default, which is right for the coach's own calendar: that one
  // is filtered to in-person upstream, so every chip would take the same
  // colour and the key would describe a distinction the page never draws.
  showAttendance?: boolean;
  // What the key calls the two, because the same fact reads from both sides:
  // a coach sees "with you" and the athlete whose calendar it is sees "with
  // your coach". Defaults to the coach's wording.
  attendanceLegend?: Record<Attendance, string>;
};

export function MonthCalendar({
  monthStart,
  byDay,
  monthHref,
  todayHref,
  dayHref,
  action,
  emptyAction,
  showAttendance = false,
  attendanceLegend = ATTENDANCE_BADGES,
}: MonthCalendarProps) {
  const grid = monthGrid(monthStart);
  const month = monthStart.getMonth();

  const inMonthCount = grid.reduce(
    (n, d) =>
      d.getMonth() === month ? n + (byDay.get(toDateInput(d))?.length ?? 0) : n,
    0,
  );

  // Days of *this* month that have something on them, in order. The grid's
  // leading and trailing cells belong to the neighbouring months, so they are
  // dropped here — on the grid they give the weeks their shape, but in a list
  // they would just be someone else's appointments.
  const agenda = grid
    .filter((d) => d.getMonth() === month)
    .map((day) => ({ day, items: byDay.get(toDateInput(day)) ?? [] }))
    .filter(({ items }) => items.length > 0);

  return (
    <>
      {/* Month stepping and whatever acts on the month belong on one row — they
          are both "operate on the month you're looking at", and stacking them
          cost a third of the screen above the first date on a phone.

          Segmented control rather than three bare words: at 16px tall those
          were the smallest targets on the page, and stepping months is the
          thing you do repeatedly here. */}
      <div className="flex items-center justify-between gap-3">
        <div className="metric inline-flex items-center overflow-hidden rounded-[var(--radius-sm)] border border-line text-xs text-ink-soft">
          <Link
            href={monthHref(monthKey(shiftMonth(monthStart, -1)))}
            aria-label="Previous month"
            className="grid h-10 w-11 place-items-center transition-colors hover:bg-card hover:text-ink sm:h-8"
          >
            ‹
          </Link>
          <Link
            href={todayHref}
            className="grid h-10 place-items-center border-x border-line px-4 transition-colors hover:bg-card hover:text-ink sm:h-8"
          >
            Today
          </Link>
          <Link
            href={monthHref(monthKey(shiftMonth(monthStart, 1)))}
            aria-label="Next month"
            className="grid h-10 w-11 place-items-center transition-colors hover:bg-card hover:text-ink sm:h-8"
          >
            ›
          </Link>
        </div>

        {action}
      </div>

      {/* ---- Agenda (phones) -------------------------------------------------
          A 7-column month grid at 375px gives each day about 47px, which
          truncated every title to a letter and an ellipsis ("Fu…", "G…") while
          padding four empty weeks down the screen. A month grid answers "what
          shape is my month"; on a phone the question is "what's next", so the
          phone gets the days that actually have something on them. */}
      <ol className="mt-3 flex flex-col gap-2 sm:hidden">
        {agenda.map(({ day, items }) => {
          const key = toDateInput(day);
          const today = isToday(day);
          const inner = (
            <>
              {/* Date block, mono — the same tabular treatment the
                  prescription numbers get. */}
              <span
                className={cn(
                  "metric flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)] leading-none",
                  today
                    ? "bg-jade text-white"
                    : "border border-line bg-paper text-ink",
                )}
              >
                <span className="text-[0.5625rem] uppercase tracking-[0.14em] opacity-70">
                  {WEEKDAYS[(day.getDay() + 6) % 7]}
                </span>
                <span className="mt-1 text-base font-semibold">
                  {day.getDate()}
                </span>
              </span>

              <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                {items.map((item) => (
                  <Chip
                    key={`${item.source}-${item.id}`}
                    item={item}
                    linked={!dayHref}
                    showAttendance={showAttendance}
                  />
                ))}
              </span>

              {dayHref ? <span className="self-center text-ink-soft">›</span> : null}
            </>
          );

          const shell =
            "flex gap-3.5 rounded-[var(--radius-card)] border bg-card p-3 " +
            (today ? "border-jade" : "border-line");

          return (
            <li key={key}>
              {dayHref ? (
                <Link
                  href={dayHref(key)}
                  className={cn(
                    shell,
                    "transition-colors active:bg-jade-wash/40",
                  )}
                >
                  {inner}
                </Link>
              ) : (
                <div className={shell}>{inner}</div>
              )}
            </li>
          );
        })}

        {agenda.length === 0 ? (
          <li className="rounded-[var(--radius-card)] border border-line bg-card px-4 py-10 text-center">
            <p className="text-sm text-ink-soft">
              Nothing scheduled in {formatMonthLabel(monthStart)}.
            </p>
            {emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
          </li>
        ) : null}
      </ol>

      {/* gap-px over a line-coloured container draws the hairline separators,
          so no cell needs a border of its own and nothing doubles up. */}
      <div className="mt-3 hidden grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-card px-2 py-1.5">
            <span className="eyebrow text-ink-soft/70">{d}</span>
          </div>
        ))}

        {grid.map((day) => {
          const key = toDateInput(day);
          const items = byDay.get(key) ?? [];
          const outside = day.getMonth() !== month;
          const today = isToday(day);

          const inner = (
            <>
              <span
                className={cn(
                  "metric grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs",
                  today
                    ? "bg-jade font-medium text-white"
                    : outside
                      ? "text-ink-soft/60"
                      : "text-ink-soft",
                )}
              >
                {day.getDate()}
              </span>

              {items.slice(0, MAX_CHIPS).map((item) => (
                <Chip
                  key={`${item.source}-${item.id}`}
                  item={item}
                  linked={!dayHref}
                  showAttendance={showAttendance}
                />
              ))}
              {items.length > MAX_CHIPS ? (
                <span className="metric px-0.5 text-[0.625rem] text-ink-soft/70">
                  +{items.length - MAX_CHIPS} more
                </span>
              ) : null}
            </>
          );

          const shell = cn(
            "flex min-h-28 flex-col gap-1 p-1.5",
            outside ? "bg-paper" : "bg-card",
            today ? "ring-1 ring-inset ring-jade" : "",
          );

          return dayHref ? (
            // One link for the whole cell: chips can't be links inside a link,
            // the touch target is bigger this way, and the per-item detail
            // belongs on the day page anyway.
            <Link
              key={key}
              href={dayHref(key)}
              className={cn(shell, "transition-colors hover:bg-jade-wash/40")}
            >
              {inner}
            </Link>
          ) : (
            <div key={key} className={shell}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* A colour that isn't explained is decoration. One line, only on the
          calendars that actually show both kinds — the coach's own is filtered
          to in-person, so a key there would describe a distinction it never
          draws. */}
      {showAttendance ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-jade"
            />
            {attendanceLegend[ATTENDANCE.IN_PERSON]}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-soft/50"
            />
            {attendanceLegend[ATTENDANCE.SOLO]}
          </span>
        </p>
      ) : null}

      {/* The agenda carries its own empty state, so this is the grid's. */}
      {inMonthCount === 0 ? (
        <p className="mt-4 hidden text-sm text-ink-soft sm:block">
          Nothing scheduled in {formatMonthLabel(monthStart)}.
        </p>
      ) : null}
    </>
  );
}

function Chip({
  item,
  linked,
  showAttendance,
}: {
  item: CalendarItem;
  linked: boolean;
  showAttendance: boolean;
}) {
  const inPerson = item.attendance === "IN_PERSON";

  const body = (
    <>
      {/* Two signals, one dot. Filled means a programmed workout and hollow
          means everything else, as it always did; the *colour* of a filled one
          now says who is in the room — the accent for a session with the
          coach, plain ink for homework.

          No new hue for either. The accent slot changes meaning with the
          trainer's chosen theme and amber is spoken for by effort, so the only
          honest axis left is accent-versus-neutral — which is also the right
          ranking: a booked hour should be the thing your eye lands on. */}
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          item.source !== "workout"
            ? "border border-line"
            : inPerson
              ? "bg-jade"
              : "bg-ink-soft/50",
        )}
      />
      {item.startMinute != null ? (
        <span className="metric shrink-0 text-[0.625rem] text-ink-soft">
          {formatTime(item.startMinute)}
        </span>
      ) : null}
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          item.completed ? "text-ink-soft line-through" : "text-ink",
        )}
      >
        {item.title}
      </span>
    </>
  );

  // The tint is the "different colour" at chip scale — a 1.5px dot is the right
  // signal in a dense grid but not something you can pick a week's bookings out
  // by. Gated on showAttendance rather than applied whenever a session is
  // in-person: on the coach's own calendar every workout is in-person, so
  // tinting them all would colour the whole month and say nothing.
  //
  // A wash, not a solid fill: these sit three to a cell under a date number,
  // and a saturated block at that size fights the text inside it.
  const shell = cn(
    "flex items-center gap-1 rounded-[4px] px-0.5 text-[0.6875rem] leading-tight",
    showAttendance && inPerson && item.source === "workout"
      ? "bg-jade-wash px-1"
      : "",
  );

  return linked ? (
    <Link
      href={item.href}
      title={
        item.source === "workout" && item.attendance
          ? ATTENDANCE_BADGES[item.attendance]
          : undefined
      }
      className={cn(shell, "hover:bg-jade-wash/50")}
    >
      {body}
    </Link>
  ) : (
    <span className={shell}>{body}</span>
  );
}
