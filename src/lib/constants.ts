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
  NUTRITION_LOGGED: "NUTRITION_LOGGED",
} as const;
export type FeedType = (typeof FEED_TYPE)[keyof typeof FEED_TYPE];

export const FEED_TYPE_LABELS: Record<FeedType, string> = {
  WORKOUT_COMPLETED: "Finished a session",
  NUTRITION_LOGGED: "Logged nutrition",
};

// Same contract as toDiscipline. WORKOUT_COMPLETED is the fallback because it
// is the column default, so every feed row written before nutrition logging
// existed reads as what it actually is.
export function toFeedType(value: unknown): FeedType {
  const s = String(value ?? "");
  return s in FEED_TYPE_LABELS
    ? (s as FeedType)
    : FEED_TYPE.WORKOUT_COMPLETED;
}

// How a logged food got its numbers. MANUAL is the column default and the
// honest fallback: typed in by hand is what every other value degrades to.
export const FOOD_SOURCE = {
  MANUAL: "MANUAL",
  PRESET: "PRESET",
  BARCODE: "BARCODE",
  PHOTO: "PHOTO",
} as const;
export type FoodSource = (typeof FOOD_SOURCE)[keyof typeof FOOD_SOURCE];

export const FOOD_SOURCE_LABELS: Record<FoodSource, string> = {
  MANUAL: "Typed in",
  PRESET: "From the catalog",
  BARCODE: "Scanned barcode",
  PHOTO: "From a photo",
};

export function toFoodSource(value: unknown): FoodSource {
  const s = String(value ?? "");
  return s in FOOD_SOURCE_LABELS ? (s as FoodSource) : FOOD_SOURCE.MANUAL;
}

// How an account came to exist. SELF is the default on the column, so it's also
// what every row predating the audit log reads as.
export const SIGNUP_SOURCE = {
  SELF: "SELF",
  GOOGLE: "GOOGLE",
  TRAINER: "TRAINER",
} as const;
export type SignupSource = (typeof SIGNUP_SOURCE)[keyof typeof SIGNUP_SOURCE];

export const SIGNUP_SOURCE_LABELS: Record<SignupSource, string> = {
  SELF: "Registered",
  GOOGLE: "Google",
  TRAINER: "Added by trainer",
};

export function toSignupSource(value: unknown): SignupSource {
  const s = String(value ?? "");
  return s in SIGNUP_SOURCE_LABELS
    ? (s as SignupSource)
    : SIGNUP_SOURCE.SELF;
}

// How someone tried to sign in, and how it went. NO_ACCOUNT and BAD_PASSWORD
// are deliberately distinguished here and deliberately *not* distinguished in
// the message the visitor sees — the split exists for the audit log only.
export const LOGIN_METHOD = {
  PASSWORD: "PASSWORD",
  GOOGLE: "GOOGLE",
  // Signed in by following an emailed reset link. Its own method rather than a
  // PASSWORD success, because "this account was taken over via a reset" is the
  // single most useful line the audit log can show — it's how a compromise
  // through the mail flow becomes visible at all.
  RESET: "RESET",
} as const;
export type LoginMethod = (typeof LOGIN_METHOD)[keyof typeof LOGIN_METHOD];

export const LOGIN_METHOD_LABELS: Record<LoginMethod, string> = {
  PASSWORD: "Password",
  GOOGLE: "Google",
  RESET: "Reset link",
};

// Same contract as toLoginOutcome. PASSWORD is the safe fallback: it's what
// every row predating the other two methods is.
export function toLoginMethod(value: unknown): LoginMethod {
  const s = String(value ?? "");
  return s in LOGIN_METHOD_LABELS
    ? (s as LoginMethod)
    : LOGIN_METHOD.PASSWORD;
}

export const LOGIN_OUTCOME = {
  SUCCESS: "SUCCESS",
  NO_ACCOUNT: "NO_ACCOUNT",
  BAD_PASSWORD: "BAD_PASSWORD",
  GOOGLE_ONLY: "GOOGLE_ONLY",
  GOOGLE_UNVERIFIED: "GOOGLE_UNVERIFIED",
} as const;
export type LoginOutcome = (typeof LOGIN_OUTCOME)[keyof typeof LOGIN_OUTCOME];

export const LOGIN_OUTCOME_LABELS: Record<LoginOutcome, string> = {
  SUCCESS: "Signed in",
  NO_ACCOUNT: "No such account",
  BAD_PASSWORD: "Wrong password",
  GOOGLE_ONLY: "Password on a Google-only account",
  GOOGLE_UNVERIFIED: "Unverified Google email",
};

// The order the filter dropdown offers, successes first.
export const LOGIN_OUTCOME_ORDER = [
  "SUCCESS",
  "BAD_PASSWORD",
  "NO_ACCOUNT",
  "GOOGLE_ONLY",
  "GOOGLE_UNVERIFIED",
] as const satisfies readonly LoginOutcome[];

// Same contract as toExerciseSection: anything unrecognised gets a safe value
// so display code can index LOGIN_OUTCOME_LABELS without a runtime crash.
export function toLoginOutcome(value: unknown): LoginOutcome {
  const s = String(value ?? "");
  return (LOGIN_OUTCOME_ORDER as readonly string[]).includes(s)
    ? (s as LoginOutcome)
    : LOGIN_OUTCOME.NO_ACCOUNT;
}

// What kind of training something is. Set on a workout or template by the coach
// who writes it, and on a trainer's own movements; the shipped catalog derives
// its own from the category a movement sits in (see exercise-presets.ts).
export const DISCIPLINES = {
  STRENGTH: "STRENGTH",
  CARDIO: "CARDIO",
  CLIMBING: "CLIMBING",
  MOBILITY: "MOBILITY",
  OTHER: "OTHER",
} as const;
export type Discipline = (typeof DISCIPLINES)[keyof typeof DISCIPLINES];

// Strength first because it's the column default and the common case; OTHER
// last because it's the escape hatch, not a choice anyone reaches for.
export const DISCIPLINE_ORDER = [
  "STRENGTH",
  "CARDIO",
  "CLIMBING",
  "MOBILITY",
  "OTHER",
] as const satisfies readonly Discipline[];

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  STRENGTH: "Strength",
  CARDIO: "Cardio",
  CLIMBING: "Climbing",
  MOBILITY: "Mobility",
  OTHER: "Other",
};

// Same contract as toExerciseSection. STRENGTH is the fallback because it's the
// column default, so every session written before this field existed reads as
// what it actually was.
export function toDiscipline(value: unknown): Discipline {
  const s = String(value ?? "");
  return (DISCIPLINE_ORDER as readonly string[]).includes(s)
    ? (s as Discipline)
    : DISCIPLINES.STRENGTH;
}

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
