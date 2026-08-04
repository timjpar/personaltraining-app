// Shared constants. The schema keeps these as plain String columns rather than
// native Postgres enums, so these are the single source of truth for the values
// and the labels they display as.

export const ROLES = {
  TRAINER: "TRAINER",
  CLIENT: "CLIENT",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const WORKOUT_STATUS = {
  ASSIGNED: "ASSIGNED",
  COMPLETED: "COMPLETED",
} as const;
export type WorkoutStatus = (typeof WORKOUT_STATUS)[keyof typeof WORKOUT_STATUS];

export const FEED_TYPE = {
  WORKOUT_COMPLETED: "WORKOUT_COMPLETED",
} as const;

// Where an exercise sits in the session. A grouping label, not an ordering key:
// `order` stays global 1..N across the whole workout (see workout-form.ts).
export const EXERCISE_SECTIONS = {
  WARMUP: "WARMUP",
  MAIN: "MAIN",
  COOLDOWN: "COOLDOWN",
} as const;
export type ExerciseSection =
  (typeof EXERCISE_SECTIONS)[keyof typeof EXERCISE_SECTIONS];

// Fixed top-to-bottom order. Never sort the section strings themselves —
// alphabetically that gives COOLDOWN < MAIN < WARMUP, i.e. cool-downs first.
export const SECTION_ORDER = [
  "WARMUP",
  "MAIN",
  "COOLDOWN",
] as const satisfies readonly ExerciseSection[];

export const SECTION_LABELS: Record<ExerciseSection, string> = {
  WARMUP: "Warm-up",
  MAIN: "Main work",
  COOLDOWN: "Cool-down",
};

// Anything unrecognised (a legacy row, a tampered form field) reads as MAIN, so
// display code can index SECTION_LABELS without a runtime crash.
export function toExerciseSection(value: unknown): ExerciseSection {
  const s = String(value ?? "");
  return (SECTION_ORDER as readonly string[]).includes(s)
    ? (s as ExerciseSection)
    : EXERCISE_SECTIONS.MAIN;
}

// Calendar entries that aren't programmed sessions. Workouts have no kind —
// they're distinguished by being workouts.
export const EVENT_KINDS = {
  SESSION: "SESSION",
  CONSULT: "CONSULT",
  CHECKIN: "CHECKIN",
  PERSONAL: "PERSONAL",
} as const;
export type EventKind = (typeof EVENT_KINDS)[keyof typeof EVENT_KINDS];

export const EVENT_KIND_ORDER = [
  "SESSION",
  "CONSULT",
  "CHECKIN",
  "PERSONAL",
] as const satisfies readonly EventKind[];

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  SESSION: "Session",
  CONSULT: "Consult",
  CHECKIN: "Check-in",
  PERSONAL: "Personal",
};

// Same contract as toExerciseSection: anything unrecognised reads as SESSION so
// display code can index EVENT_KIND_LABELS without a runtime crash.
export function toEventKind(value: unknown): EventKind {
  const s = String(value ?? "");
  return (EVENT_KIND_ORDER as readonly string[]).includes(s)
    ? (s as EventKind)
    : EVENT_KINDS.SESSION;
}

// Program structure. Days are 1..7 offsets *within* a week, not calendar
// weekdays — the real dates are computed from the assignment's start date.
export const DAYS_PER_WEEK = 7;
export const PROGRAM_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const dayLabel = (day: number) => `Day ${day}`;
