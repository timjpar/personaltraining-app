// Shared constants. The schema keeps these as plain String columns rather than
// native Postgres enums, so these are the single source of truth for the values
// and the labels they display as.

export const ROLES = {
  TRAINER: "TRAINER",
  CLIENT: "CLIENT",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

// What the coach's own checkbox says on every "assign to" form — a coach can
// assign a workout, a program or a meal plan to themselves. Deliberately not
// their name: the row sits among people they recognise by name, and "Yourself"
// is the one label that stays unambiguous when a coach and a client share a
// first name. Here rather than beside the rest of the self-assignment machinery
// in src/lib/assignees.ts, which imports Prisma and so can't be reached from the
// client component that draws the box.
export const SELF_LABEL = "Yourself";

// Where someone is in a coach's book: training with them, or being courted.
// A label on an ordinary client account rather than a third role — see
// User.stage in schema.prisma for why that distinction is load-bearing.
export const CLIENT_STAGE = {
  ACTIVE: "ACTIVE",
  PROSPECT: "PROSPECT",
} as const;
export type ClientStage = (typeof CLIENT_STAGE)[keyof typeof CLIENT_STAGE];

// Clients first: it's the column default and the overwhelming majority of a
// roster.
export const CLIENT_STAGE_ORDER = [
  "ACTIVE",
  "PROSPECT",
] as const satisfies readonly ClientStage[];

export const CLIENT_STAGE_LABELS: Record<ClientStage, string> = {
  ACTIVE: "Client",
  PROSPECT: "Prospect",
};

// Plural, for the headings and the "12 of 40 clients" counts. Spelled out
// rather than built by appending an "s", so the day one of these becomes an
// irregular word it's a one-line change here and nowhere else.
export const CLIENT_STAGE_PLURALS: Record<ClientStage, string> = {
  ACTIVE: "Clients",
  PROSPECT: "Prospects",
};

// What picking one actually means, shown under the choice on the add form.
export const CLIENT_STAGE_HINTS: Record<ClientStage, string> = {
  ACTIVE: "Someone you're training now",
  PROSPECT: "A trial or a lead you're working on",
};

// How many of each a coach may have. Two separate allowances rather than one
// pooled cap: the point of the split is that a coach can keep courting people
// without eating into the roster they're paid to train.
//
// Fixed for everyone during the beta, deliberately. A per-coach override would
// be a column and an admin form, and the honest answer for now is that raising
// a cap is a one-line edit here.
export const CLIENT_LIMIT = 40;
export const PROSPECT_LIMIT = 20;

export const STAGE_LIMITS: Record<ClientStage, number> = {
  ACTIVE: CLIENT_LIMIT,
  PROSPECT: PROSPECT_LIMIT,
};

// Same contract as toExerciseSection: anything unrecognised reads as ACTIVE,
// which is the column default, so a legacy row or a tampered form field lands
// on the value the form would have shown.
export function toClientStage(value: unknown): ClientStage {
  const s = String(value ?? "");
  return s in CLIENT_STAGE_LABELS ? (s as ClientStage) : CLIENT_STAGE.ACTIVE;
}

// ---------------------------------------------------------------------------
// Paid sessions
//
// A block of sessions a client has bought, counted down as they train. The
// ledger that holds them is SessionCredit in schema.prisma and every read of it
// lives in src/lib/sessions.ts.
// ---------------------------------------------------------------------------

// What moved credit on or off the account. Not derivable from the sign of the
// entry: an ADJUSTMENT of -2 and a SESSION of -1 are both debits and read
// completely differently on a statement.
export const SESSION_CREDIT_KIND = {
  // The coach sold them a block.
  PURCHASE: "PURCHASE",
  // A finished in-person session, written by the app rather than by anyone.
  SESSION: "SESSION",
  // The coach correcting the number by hand, in either direction.
  ADJUSTMENT: "ADJUSTMENT",
} as const;
export type SessionCreditKind =
  (typeof SESSION_CREDIT_KIND)[keyof typeof SESSION_CREDIT_KIND];

export const SESSION_CREDIT_KIND_LABELS: Record<SessionCreditKind, string> = {
  PURCHASE: "Sessions added",
  SESSION: "Session used",
  ADJUSTMENT: "Adjustment",
};

export function toSessionCreditKind(value: unknown): SessionCreditKind {
  const s = String(value ?? "");
  return s in SESSION_CREDIT_KIND_LABELS
    ? (s as SessionCreditKind)
    : SESSION_CREDIT_KIND.ADJUSTMENT;
}

// The balance at which the app starts saying something. Three because that's
// roughly a week of training for someone on twice-a-week — enough notice to
// have the conversation before the last session, which is the entire point of
// warning at all rather than announcing it when they hit zero.
export const LOW_SESSION_BALANCE = 3;

// The largest block that can be added at once. A guard on a number field that
// reaches a database, not a business rule: it catches the coach who means 10
// and types 100, and it makes a forged post uninteresting.
export const MAX_SESSION_CREDITS = 200;

// A client's standing on their package. `tracked` is the distinction the whole
// feature turns on: a client with no ledger entries is not on one, and the app
// says nothing about their sessions rather than warning that a number nobody
// set has run out. A bare 0 cannot tell those apart, which is why this is a
// pair and not an integer.
export type SessionBalance = {
  // Can go negative — a session trained on an empty account is a real thing
  // that happened, and "owes 1" is the honest reading. Meaningless unless
  // `tracked`.
  balance: number;
  tracked: boolean;
};

export const UNTRACKED: SessionBalance = { balance: 0, tracked: false };

// How loudly to say it. OUT covers zero and below: from the coach's side "none
// left" and "one over" are the same conversation, and the exact figure is
// always on screen beside this.
export type SessionState = "OK" | "LOW" | "OUT";

export function sessionState({ balance, tracked }: SessionBalance): SessionState {
  if (!tracked) return "OK";
  if (balance <= 0) return "OUT";
  return balance <= LOW_SESSION_BALANCE ? "LOW" : "OK";
}

// The phrase on a badge or a roster row. Null when there's nothing worth
// saying — untracked — so callers render nothing rather than a zero that would
// read as "used them all".
export function balanceLabel(entry: SessionBalance): string | null {
  if (!entry.tracked) return null;
  const { balance } = entry;
  if (balance < 0) {
    return `${-balance} session${balance === -1 ? "" : "s"} over`;
  }
  if (balance === 0) return "No sessions left";
  return `${balance} session${balance === 1 ? "" : "s"} left`;
}

// These four sit here rather than beside the queries in src/lib/sessions.ts for
// the reason SELF_LABEL gives above: that module imports Prisma, and the cards
// that render a balance are client components. Same rule, same file.

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

// How a coach reacts to a finished session. A closed set rather than a free
// emoji field: these render in the athlete's app next to their own effort
// rating, and a fixed list is the difference between a coach picking a tone and
// a coach picking a character the app then has to render, sort and explain.
//
// Every one of them is positive on purpose. A reaction is the one-tap gesture;
// anything that needs a caveat is what coachNote is for, where it arrives with
// the words that make it coaching rather than a verdict.
export const COACH_REACTIONS = {
  STRONG: "STRONG",
  FIRE: "FIRE",
  PROUD: "PROUD",
  ONTARGET: "ONTARGET",
} as const;
export type CoachReaction =
  (typeof COACH_REACTIONS)[keyof typeof COACH_REACTIONS];

// The glyph and the words that go with it. The label is not decoration: it's
// the button's accessible name, and it's what the athlete's page says in text
// beside the emoji, so a reaction still means something to a screen reader or
// on a device with no font for it.
export const COACH_REACTION_DISPLAY: Record<
  CoachReaction,
  { emoji: string; label: string }
> = {
  STRONG: { emoji: "💪", label: "Strong work" },
  FIRE: { emoji: "🔥", label: "On fire" },
  PROUD: { emoji: "👏", label: "Proud of this one" },
  ONTARGET: { emoji: "🎯", label: "Right on target" },
};

// Null-returning, unlike its neighbours: there is no sensible default reaction,
// and "no reaction" is the ordinary state of almost every session.
export function toCoachReaction(value: unknown): CoachReaction | null {
  const s = String(value ?? "");
  return s in COACH_REACTION_DISPLAY ? (s as CoachReaction) : null;
}

// How an account came to exist. SELF is the default on the column, so it's also
// what every row predating the audit log reads as.
//
// SELF and GOOGLE are historical: the app is invite-only, so nothing can write
// either any more (see (auth)/register and the Google callback). They stay
// because the rows that carry them do.
export const SIGNUP_SOURCE = {
  SELF: "SELF",
  GOOGLE: "GOOGLE",
  TRAINER: "TRAINER",
  ADMIN: "ADMIN",
} as const;
export type SignupSource = (typeof SIGNUP_SOURCE)[keyof typeof SIGNUP_SOURCE];

export const SIGNUP_SOURCE_LABELS: Record<SignupSource, string> = {
  SELF: "Registered",
  GOOGLE: "Google",
  TRAINER: "Added by trainer",
  ADMIN: "Added by an admin",
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

// Whether the coach is in the room. The one field that decides whether a
// programmed session lands on the *coach's* calendar — see Workout.attendance,
// which spells out why SOLO is the default and why the athlete's own calendar
// ignores this entirely.
export const ATTENDANCE = {
  IN_PERSON: "IN_PERSON",
  SOLO: "SOLO",
} as const;
export type Attendance = (typeof ATTENDANCE)[keyof typeof ATTENDANCE];

// In person first: it's the default, and it's the one the coach's calendar is
// built around.
export const ATTENDANCE_ORDER = [
  "IN_PERSON",
  "SOLO",
] as const satisfies readonly Attendance[];

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  IN_PERSON: "In person with me",
  SOLO: "On their own",
};

// What the choice actually costs, which is the part that isn't obvious from
// the label: one of these takes an hour of the coach's day and the other
// doesn't, and that is the whole reason the field exists.
export const ATTENDANCE_HINTS: Record<Attendance, string> = {
  IN_PERSON: "Books the time on your calendar",
  SOLO: "Assigned as homework — stays off your calendar",
};

// Short form for a badge, where the row already says whose session it is.
export const ATTENDANCE_BADGES: Record<Attendance, string> = {
  IN_PERSON: "In person",
  SOLO: "On their own",
};

// Same contract as toExerciseSection: IN_PERSON is the fallback because it's
// the column default, so a form posted without the field — a page left open
// across this deploy — saves as what the form would have shown.
export function toAttendance(value: unknown): Attendance {
  const s = String(value ?? "");
  return s in ATTENDANCE_LABELS ? (s as Attendance) : ATTENDANCE.IN_PERSON;
}

// How long a session is booked for. A closed set rather than a free number of
// minutes: these are the four blocks a coach actually sells, and a free field
// invites 45s and 75s that make two sessions impossible to line up in a day.
//
// Minutes, matching startMinute and every other time in the app — never an end
// time. A session that moves an hour earlier stays the length it was.
export const SESSION_LENGTHS = [30, 60, 90, 120] as const;
export type SessionLength = (typeof SESSION_LENGTHS)[number];

// An hour, because it's the block almost everything is sold in.
export const DEFAULT_SESSION_LENGTH = 60;

export function sessionLengthLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourLabel = `${hours} hour${hours === 1 ? "" : "s"}`;
  return rest === 0 ? hourLabel : `${hourLabel} ${rest} min`;
}

// Null-returning, like toCoachReaction: "no set length" is a real state — every
// session written before this column existed, and every one with no time of day
// to hang a block off. Anything that isn't one of the four offered is refused
// rather than rounded, so a tampered 37 can't become an appointment nobody
// chose.
export function toSessionLength(value: unknown): SessionLength | null {
  const n = Number(value);
  return (SESSION_LENGTHS as readonly number[]).includes(n)
    ? (n as SessionLength)
    : null;
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

// A conversation is either between two people or among several. Same contract
// as toEventKind: DIRECT is the column default, so a row written before groups
// existed reads as what it is.
export const THREAD_KINDS = {
  DIRECT: "DIRECT",
  GROUP: "GROUP",
} as const;
export type ThreadKind = (typeof THREAD_KINDS)[keyof typeof THREAD_KINDS];

export function toThreadKind(value: unknown): ThreadKind {
  const s = String(value ?? "");
  return s === THREAD_KINDS.GROUP ? THREAD_KINDS.GROUP : THREAD_KINDS.DIRECT;
}

// Who a scheduled message goes to. ALL resolves at send time rather than being
// expanded into recipient rows when it's saved, so a client added on Thursday
// gets Friday's message without the coach editing anything.
export const BROADCAST_AUDIENCES = {
  ALL: "ALL",
  PICKED: "PICKED",
} as const;
export type BroadcastAudience =
  (typeof BROADCAST_AUDIENCES)[keyof typeof BROADCAST_AUDIENCES];

export function toBroadcastAudience(value: unknown): BroadcastAudience {
  const s = String(value ?? "");
  return s === BROADCAST_AUDIENCES.PICKED
    ? BROADCAST_AUDIENCES.PICKED
    : BROADCAST_AUDIENCES.ALL;
}

// Calendar weekdays, 0=Sunday, matching Date.getDay() and the Intl weekday
// index — unlike PROGRAM_DAYS above, which is a 1..7 offset within a program
// and has nothing to do with what day it is. Two different things that both
// look like "day numbers", so they stay far apart in naming.
export const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;

export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

// Form data reaching a query, so this is a gate rather than a formality:
// anything that isn't an integer 0-6 is dropped, duplicates collapse, and the
// result is sorted so two equivalent selections store identically.
export function parseWeekdays(value: unknown): number[] {
  const raw = Array.isArray(value) ? value : [value];
  const days = new Set<number>();
  for (const entry of raw) {
    const n = Number(entry);
    if (Number.isInteger(n) && n >= 0 && n <= 6) days.add(n);
  }
  return [...days].sort((a, b) => a - b);
}

// Same shape as parseWeekdays' contract, for the hour a scheduled message goes
// out at. Out-of-range values are rejected rather than clamped: a tampered 99
// silently becoming 23 would send at a time nobody chose.
export function parseHour(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : null;
}

// Long enough for anything a coach would type into a chat box, short enough
// that it can't be used to push a megabyte into a column or an email. Enforced
// in the action — the textarea's maxLength is a courtesy to the person typing,
// not a control.
export const MAX_MESSAGE_LENGTH = 4000;

// ---------------------------------------------------------------------------
// Body: intake profile and measurements
//
// Note which coercers below return null. The ones that fall back to a value do
// so because their column has a default, so an unrecognised string is a legacy
// row or a tampered field and there is an honest thing to read it as. The rest
// follow toCoachReaction: there is no default sex or activity level, and
// guessing one produces a confidently wrong calorie number (see body.ts).
// ---------------------------------------------------------------------------

// Which units a person reads numbers in. A *viewer* preference — bodies are
// stored canonical metric (see ClientProfile in schema.prisma), so this only
// ever decides rendering.
export const UNITS = {
  METRIC: "METRIC",
  IMPERIAL: "IMPERIAL",
} as const;
export type Units = (typeof UNITS)[keyof typeof UNITS];

export const UNIT_LABELS: Record<Units, string> = {
  METRIC: "Metric (kg, cm)",
  IMPERIAL: "Imperial (lb, in)",
};

// Short form for the toggle itself, where the parenthetical is the whole cell.
export const UNIT_SHORT_LABELS: Record<Units, string> = {
  METRIC: "kg / cm",
  IMPERIAL: "lb / in",
};

// Falls back to the same value the column defaults to, so "no answer" means
// one thing across the app rather than two. Reached only by garbage: the column
// is non-null with a default, and every body form carries a hidden units field.
export function toUnits(value: unknown): Units {
  const s = String(value ?? "");
  return s in UNIT_LABELS ? (s as Units) : UNITS.IMPERIAL;
}

// The metabolic input to Mifflin–St Jeor, which is the only thing that reads
// it — the profile form says exactly that under the field. Two values because
// that is what the equation takes; it is not a question about identity, and
// labelling it honestly ("Used for the calorie estimate") is the difference
// between asking for a number and asking someone to categorise themselves.
export const BIOLOGICAL_SEX = {
  MALE: "MALE",
  FEMALE: "FEMALE",
} as const;
export type BiologicalSex =
  (typeof BIOLOGICAL_SEX)[keyof typeof BIOLOGICAL_SEX];

export const SEX_ORDER = ["FEMALE", "MALE"] as const satisfies
  readonly BiologicalSex[];

export const SEX_LABELS: Record<BiologicalSex, string> = {
  FEMALE: "Female",
  MALE: "Male",
};

export function toBiologicalSex(value: unknown): BiologicalSex | null {
  const s = String(value ?? "");
  return s in SEX_LABELS ? (s as BiologicalSex) : null;
}

// How much the rest of their life moves. Deliberately the *only* input to the
// TDEE multiplier: ClientProfile.trainingDaysPerWeek is programming context,
// and feeding both into the same number counts the training twice.
export const ACTIVITY_LEVELS = {
  SEDENTARY: "SEDENTARY",
  LIGHT: "LIGHT",
  MODERATE: "MODERATE",
  ACTIVE: "ACTIVE",
  VERY_ACTIVE: "VERY_ACTIVE",
} as const;
export type ActivityLevel =
  (typeof ACTIVITY_LEVELS)[keyof typeof ACTIVITY_LEVELS];

export const ACTIVITY_ORDER = [
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
] as const satisfies readonly ActivityLevel[];

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: "Sedentary",
  LIGHT: "Lightly active",
  MODERATE: "Moderately active",
  ACTIVE: "Active",
  VERY_ACTIVE: "Very active",
};

// The hint is what makes the choice answerable. "Moderately active" means
// nothing on its own, and the gap between two of these levels is several
// hundred calories a day — so the description is load-bearing, not decoration.
export const ACTIVITY_HINTS: Record<ActivityLevel, string> = {
  SEDENTARY: "Desk job, little deliberate exercise",
  LIGHT: "Light exercise 1–3 days a week",
  MODERATE: "Moderate exercise 3–5 days a week",
  ACTIVE: "Hard exercise 6–7 days a week, or on their feet all day",
  VERY_ACTIVE: "Physical job plus hard daily training",
};

export function toActivityLevel(value: unknown): ActivityLevel | null {
  const s = String(value ?? "");
  return s in ACTIVITY_LABELS ? (s as ActivityLevel) : null;
}

// Which direction the plan is going. Paired with ClientProfile.rateKgPerWeek,
// which is always a positive magnitude — direction is this field's job, so the
// two can never disagree and leave one of them to win silently.
export const GOAL_TYPES = {
  LOSE: "LOSE",
  MAINTAIN: "MAINTAIN",
  GAIN: "GAIN",
} as const;
export type GoalType = (typeof GOAL_TYPES)[keyof typeof GOAL_TYPES];

export const GOAL_ORDER = ["LOSE", "MAINTAIN", "GAIN"] as const satisfies
  readonly GoalType[];

export const GOAL_LABELS: Record<GoalType, string> = {
  LOSE: "Lose weight",
  MAINTAIN: "Maintain",
  GAIN: "Gain weight",
};

export function toGoalType(value: unknown): GoalType | null {
  const s = String(value ?? "");
  return s in GOAL_LABELS ? (s as GoalType) : null;
}

export const EXPERIENCE_LEVELS = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
} as const;
export type ExperienceLevel =
  (typeof EXPERIENCE_LEVELS)[keyof typeof EXPERIENCE_LEVELS];

export const EXPERIENCE_ORDER = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
] as const satisfies readonly ExperienceLevel[];

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const EXPERIENCE_HINTS: Record<ExperienceLevel, string> = {
  BEGINNER: "New to structured training, or coming back after years off",
  INTERMEDIATE: "Trains consistently, knows the main lifts",
  ADVANCED: "Years of consistent training, needs specific programming",
};

export function toExperienceLevel(value: unknown): ExperienceLevel | null {
  const s = String(value ?? "");
  return s in EXPERIENCE_LABELS ? (s as ExperienceLevel) : null;
}

// Where they train. Paired with ClientProfile.equipmentNotes, and both are kept
// because either alone is useless: the closed set is what a program filter
// would ever key on and is one tap at intake, while the prose is what actually
// decides the session ("adjustable dumbbells to 24kg, no rack").
export const TRAINING_LOCATIONS = {
  COMMERCIAL_GYM: "COMMERCIAL_GYM",
  HOME_GYM: "HOME_GYM",
  MINIMAL: "MINIMAL",
  OUTDOORS: "OUTDOORS",
} as const;
export type TrainingLocation =
  (typeof TRAINING_LOCATIONS)[keyof typeof TRAINING_LOCATIONS];

export const TRAINING_LOCATION_ORDER = [
  "COMMERCIAL_GYM",
  "HOME_GYM",
  "MINIMAL",
  "OUTDOORS",
] as const satisfies readonly TrainingLocation[];

export const TRAINING_LOCATION_LABELS: Record<TrainingLocation, string> = {
  COMMERCIAL_GYM: "Commercial gym",
  HOME_GYM: "Home gym",
  MINIMAL: "Minimal equipment",
  OUTDOORS: "Outdoors",
};

export function toTrainingLocation(value: unknown): TrainingLocation | null {
  const s = String(value ?? "");
  return s in TRAINING_LOCATION_LABELS ? (s as TrainingLocation) : null;
}

// How they eat, as a pattern. Allergies are a separate column on purpose: one
// is a safety fact and the other is taste, and a single "dietary notes" box
// puts a nut allergy in the same paragraph as not liking mushrooms.
export const DIET_PATTERNS = {
  OMNIVORE: "OMNIVORE",
  VEGETARIAN: "VEGETARIAN",
  VEGAN: "VEGAN",
  PESCATARIAN: "PESCATARIAN",
  OTHER: "OTHER",
} as const;
export type DietPattern = (typeof DIET_PATTERNS)[keyof typeof DIET_PATTERNS];

export const DIET_PATTERN_ORDER = [
  "OMNIVORE",
  "VEGETARIAN",
  "PESCATARIAN",
  "VEGAN",
  "OTHER",
] as const satisfies readonly DietPattern[];

export const DIET_PATTERN_LABELS: Record<DietPattern, string> = {
  OMNIVORE: "Omnivore",
  VEGETARIAN: "Vegetarian",
  PESCATARIAN: "Pescatarian",
  VEGAN: "Vegan",
  OTHER: "Other",
};

export function toDietPattern(value: unknown): DietPattern | null {
  const s = String(value ?? "");
  return s in DIET_PATTERN_LABELS ? (s as DietPattern) : null;
}

// Who put a measurement in. Not cosmetic: a coach reads their own tape reading
// differently from a figure an athlete typed off a bathroom scale, and it is
// the only signal self-logging will ever produce about whether it gets used.
// The same call LoggedFood.source makes. TRAINER is the column default, so it
// is also what any unrecognised value honestly reads as.
export const MEASUREMENT_SOURCE = {
  TRAINER: "TRAINER",
  CLIENT: "CLIENT",
} as const;
export type MeasurementSource =
  (typeof MEASUREMENT_SOURCE)[keyof typeof MEASUREMENT_SOURCE];

export const MEASUREMENT_SOURCE_LABELS: Record<MeasurementSource, string> = {
  TRAINER: "Coach",
  CLIENT: "Self-logged",
};

export function toMeasurementSource(value: unknown): MeasurementSource {
  const s = String(value ?? "");
  return s in MEASUREMENT_SOURCE_LABELS
    ? (s as MeasurementSource)
    : MEASUREMENT_SOURCE.TRAINER;
}

// The tape sites, in the order both the weigh-in form and the history table lay
// them out. One list rather than two literals, so a site can never appear in
// the form and quietly vanish from the table — the same job SECTION_ORDER and
// TAPE_SITES' neighbours above do for their own columns.
export const TAPE_SITES = [
  { key: "neckCm", label: "Neck" },
  { key: "chestCm", label: "Chest" },
  { key: "waistCm", label: "Waist" },
  { key: "hipsCm", label: "Hips" },
  { key: "thighCm", label: "Thigh" },
  { key: "armCm", label: "Arm" },
  { key: "calfCm", label: "Calf" },
] as const;
export type TapeSite = (typeof TAPE_SITES)[number]["key"];
