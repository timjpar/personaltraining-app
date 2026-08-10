// Month-grid maths and the merged shape the calendar renders. Kept apart from
// format.ts, which is a grab-bag of display helpers imported almost everywhere;
// this module has its own types and its own merge rules. It builds on format.ts
// rather than reimplementing any of it.

import {
  toAttendance,
  toEventKind,
  WORKOUT_STATUS,
  type Attendance,
  type EventKind,
} from "@/lib/constants";
import { addDays, parseDateInput, toDateInput } from "@/lib/format";

// ?m=2026-08
export const MONTH_PARAM = "m";

const CELLS = 42;

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Monday-first, matching the dashboard's week stat — and it's a training app.
export function startOfWeek(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(value: unknown): Date | null {
  const s = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(s)) return null;
  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(5, 7));
  if (month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

export function shiftMonth(monthStart: Date, delta: number): Date {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + delta, 1);
}

// Always six rows. A grid that switches between five and six makes the page
// jump height as you page through months, which is worse than one trailing row
// of greyed-out days.
//
// The day maths goes through addDays (setDate), never millisecond arithmetic —
// a spring-forward day is 23 hours long and adding 86_400_000 drifts the grid
// by an hour until it eventually lands on the wrong date.
export function monthGrid(monthStart: Date): Date[] {
  const offset = (monthStart.getDay() + 6) % 7;
  const first = addDays(monthStart, -offset);
  return Array.from({ length: CELLS }, (_, i) => addDays(first, i));
}

// The range to query for a grid — which is wider than the month. The first cell
// can be six days before the 1st and the last twelve days after it; querying
// the month itself leaves those cells silently empty.
export function gridRange(grid: Date[]): { start: Date; end: Date } {
  return { start: grid[0], end: addDays(grid[grid.length - 1], 1) };
}

export function formatMonthLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(d);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

// The /calendar/[date] param. Guarded with a regex first, because engines
// happily parse "2026-8-3T00:00:00" into a real date and that produces a URL
// toDateInput would never emit — the route has to round-trip exactly.
export function parseDayParam(value: unknown): Date | null {
  const s = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const date = parseDateInput(s);
  // Rejects the likes of 2026-02-31, which Date rolls forward into March.
  return date && toDateInput(date) === s ? date : null;
}

// <input type="time"> always submits 24-hour "HH:MM" however it displays.
export function minutesFromTimeInput(value: unknown): number | null {
  const s = String(value ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const hours = Number(m[1]);
  const mins = Number(m[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

export function timeInputFromMinutes(minute: number | null | undefined): string {
  if (minute == null) return "";
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatTime(minute: number | null | undefined): string {
  if (minute == null) return "";
  const d = new Date(2000, 0, 1, Math.floor(minute / 60), minute % 60);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

// Workouts and events collapse to one shape so the grid and the day page each
// render a single list rather than interleaving two.
export type CalendarItem = {
  id: string;
  source: "workout" | "event";
  title: string;
  date: Date;
  startMinute: number | null;
  endMinute: number | null; // always null for workouts
  clientId: string | null;
  clientName: string | null;
  kind: EventKind | null; // null for workouts
  completed: boolean; // workouts only
  // Workouts only; null on events, which are the coach's own time by
  // definition. Carried on the item rather than left in the query because the
  // one calendar that shows both kinds — a client's, on their client page —
  // has to draw them differently: the coach's own calendar filters this out
  // upstream and never reads it.
  attendance: Attendance | null;
  href: string;
};

// Where an item's link points, which is the one thing the two calendars can't
// agree on: the trainer's hrefs are all under /calendar and /workouts, and
// src/proxy.ts bounces a client away from both.
export type ItemLinks = {
  workout(id: string): string;
  event(id: string, day: string): string;
};

export const TRAINER_LINKS: ItemLinks = {
  workout: (id) => `/workouts/${id}`,
  // Editing happens on the day page, via a query param rather than a third
  // route.
  event: (id, day) => `/calendar/${day}?edit=${id}`,
};

export const CLIENT_LINKS: ItemLinks = {
  workout: (id) => `/my/workouts/${id}`,
  // No ?edit= — a client's calendar is a reading surface. The day page is the
  // most specific thing there is to point at.
  event: (_id, day) => `/my/calendar/${day}`,
};

// Structural parameters rather than Prisma types, so this module stays free of
// the generated client and the pages can select only the columns they need.
//
// `links` is required rather than defaulted, and that is not an oversight.
// These are used as bare callbacks — `workouts.map(workoutItem)` — and
// Array.prototype.map passes the *index* as the second argument, so a
// defaulted parameter would silently receive 0 at every existing call site.
// Requiring it makes the compiler walk you through them.
export function workoutItem(
  w: {
    id: string;
    title: string;
    scheduledDate: Date;
    startMinute: number | null;
    status: string;
    // Optional so the two calendars that filter on it upstream — and so never
    // need it back — can leave it out of their select. Absent reads as SOLO,
    // the column default, exactly as toAttendance does.
    attendance?: string;
    client: { id: string; name: string } | null;
  },
  links: ItemLinks,
): CalendarItem {
  return {
    id: w.id,
    source: "workout",
    title: w.title,
    date: w.scheduledDate,
    startMinute: w.startMinute,
    endMinute: null,
    clientId: w.client?.id ?? null,
    clientName: w.client?.name ?? null,
    kind: null,
    completed: w.status === WORKOUT_STATUS.COMPLETED,
    attendance: toAttendance(w.attendance),
    href: links.workout(w.id),
  };
}

export function eventItem(
  e: {
    id: string;
    title: string;
    date: Date;
    startMinute: number | null;
    endMinute: number | null;
    kind: string;
    client: { id: string; name: string } | null;
  },
  links: ItemLinks,
): CalendarItem {
  return {
    id: e.id,
    source: "event",
    title: e.title,
    date: e.date,
    startMinute: e.startMinute,
    endMinute: e.endMinute,
    clientId: e.client?.id ?? null,
    clientName: e.client?.name ?? null,
    kind: toEventKind(e.kind),
    completed: false,
    // An event is time the coach has booked — there is no version of one they
    // aren't part of, so the question workouts answer here doesn't apply.
    attendance: null,
    href: links.event(e.id, toDateInput(e.date)),
  };
}

// Untimed entries first — they're "sometime today", which is the convention
// every calendar uses — then by time. Ties break on source and then title so
// the order is stable across renders.
export function compareItems(a: CalendarItem, b: CalendarItem): number {
  if (a.startMinute == null || b.startMinute == null) {
    if (a.startMinute !== b.startMinute) return a.startMinute == null ? -1 : 1;
  } else if (a.startMinute !== b.startMinute) {
    return a.startMinute - b.startMinute;
  }
  if (a.source !== b.source) return a.source === "workout" ? -1 : 1;
  return a.title.localeCompare(b.title);
}

export function groupByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = toDateInput(item.date);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(item);
    else byDay.set(key, [item]);
  }
  for (const bucket of byDay.values()) bucket.sort(compareItems);
  return byDay;
}
