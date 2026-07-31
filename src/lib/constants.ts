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

// Program structure. Days are 1..7 offsets *within* a week, not calendar
// weekdays — the real dates are computed from the assignment's start date.
export const DAYS_PER_WEEK = 7;
export const PROGRAM_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const dayLabel = (day: number) => `Day ${day}`;
