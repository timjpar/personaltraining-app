// Shared constants. SQLite has no enums, so these mirror the String columns
// used across the Prisma schema.

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

// Program structure. Days are 1..7 offsets *within* a week, not calendar
// weekdays — the real dates are computed from the assignment's start date.
export const DAYS_PER_WEEK = 7;
export const PROGRAM_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const dayLabel = (day: number) => `Day ${day}`;
