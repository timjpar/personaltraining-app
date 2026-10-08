// Turning an intake profile and a bodyweight into a calorie and macro
// suggestion. Pure — no Prisma, no React, no formatting — so it can be checked
// against a worked example without standing anything up.
//
// The result is a *suggestion*, and nothing here writes it anywhere. It is a
// pure function of the profile plus the newest weigh-in, so storing it would
// create a second copy that goes stale the moment either changes; every caller
// recomputes at render instead. A coach accepts it into
// NutritionPlan.target* by hand — see SuggestedTargets.tsx.
//
// Every figure below is a working estimate. Mifflin–St Jeor is the equation
// with the best track record for people who aren't lean athletes, and it is
// still ±10% on an individual. That is why the UI shows the derivation rather
// than a bare number, and why the coach is the one who accepts it.
import {
  ACTIVITY_LABELS,
  ACTIVITY_ORDER,
  GOAL_TYPES,
  type ActivityLevel,
  type BiologicalSex,
  type GoalType,
  type OccupationActivity,
} from "@/lib/constants";

// Harris–Benedict style multipliers, the set Mifflin–St Jeor is conventionally
// paired with. Physiology, so it lives here rather than in constants.ts —
// changing a multiplier should never touch the file every form imports.
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

// ~7,700 kcal per kg of body mass. A working figure, not a constant of nature,
// and the single place the whole suggestion depends on it.
export const KCAL_PER_KG = 7700;

// No more than a quarter off maintenance, however fast the coach asked to go.
// Past that, the deficit stops being a nutrition plan and starts being the
// reason someone can't train.
export const MAX_DEFICIT_FRACTION = 0.25;

// And a hard floor underneath that, because a small older client on a
// sedentary multiplier can have a maintenance low enough that even a capped
// deficit lands somewhere no coach would prescribe.
export const CALORIE_FLOOR: Record<BiologicalSex, number> = {
  MALE: 1500,
  FEMALE: 1200,
};

// Protein per kg of reference weight. Higher in a deficit, where protein is
// what protects lean mass; the extra is cheap and the downside of guessing low
// is the thing the whole plan is trying to avoid.
export const PROTEIN_PER_KG_CUTTING = 1.8;
export const PROTEIN_PER_KG_OTHER = 1.6;

// Fat gets two floors and takes whichever binds: grams per kg (hormonal
// sufficiency) and a share of energy (which is what actually bites at a high
// calorie target).
export const FAT_PER_KG_FLOOR = 0.8;
export const FAT_ENERGY_FRACTION = 0.2;

export const DEFAULT_RATE_LOSING = 0.5;
export const DEFAULT_RATE_GAINING = 0.25;
export const MIN_RATE_KG_PER_WEEK = 0.05;
export const MAX_RATE_KG_PER_WEEK = 1.5;

const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Whole years, counting whether this year's birthday has happened yet. Derived
// on every read and never stored: a stored age is wrong within a year, and it
// would drift every calorie figure downstream of it without anyone noticing.
export function ageFrom(birthDate: Date, on: Date = new Date()): number {
  let age = on.getFullYear() - birthDate.getFullYear();
  const month = on.getMonth() - birthDate.getMonth();
  if (month < 0 || (month === 0 && on.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

// Mifflin–St Jeor.
export function bmr(input: {
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base =
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.sex === "MALE" ? base + 5 : base - 161;
}

export function tdee(bmrKcal: number, activity: ActivityLevel): number {
  return bmrKcal * ACTIVITY_FACTORS[activity];
}

// ---- Suggesting an activity level from what sits behind it ---------------
//
// activityLevel stays the one input to the TDEE multiplier (see ClientProfile),
// so this never sets it. It answers the question the select can't: given a desk
// job, 8,000 steps and three hours of lifting a week, which level is that? The
// coach reads the suggestion beside the select and decides.
//
// Built factorially, the way a PAL is: the movement of daily life as a multiple
// of resting burn, plus the net energy of deliberate exercise on top.

// Daily life, from steps when they're known — Tudor-Locke's step bands, which
// already count the walking a job involves — or from the job when they aren't.
// Both, and the larger wins: steps miss the lifting and carrying of a physical
// job, and a job category misses the evening walk.
const STEP_BANDS: { min: number; pal: number }[] = [
  { min: 12500, pal: 1.6 },
  { min: 10000, pal: 1.5 },
  { min: 7500, pal: 1.4 },
  { min: 5000, pal: 1.3 },
  { min: 0, pal: 1.2 },
];
const OCCUPATION_PAL: Record<OccupationActivity, number> = {
  DESK: 1.2,
  MIXED: 1.3,
  ON_FEET: 1.45,
  PHYSICAL: 1.6,
};

// Net METs — above the resting 1.0 that BMR already counts — from the 2011
// Compendium of Physical Activities: a general weight-training session (~5) and
// moderate-to-vigorous cardio (~7).
const NET_MET_LIFTING = 4;
const NET_MET_CARDIO = 6;
// A training day with no session length given is taken as an hour, the usual
// booking; the suggestion says so rather than hiding the assumption.
const DEFAULT_SESSION_MINUTES = 60;

export type ActivitySuggestion = {
  level: ActivityLevel;
  // The multiplier the details actually imply, before rounding to a level.
  factor: number;
  dailyLifePal: number;
  exerciseKcalPerDay: number;
  assumedSessionMinutes: boolean;
};

export function suggestActivityLevel(input: {
  occupation: OccupationActivity | null;
  dailySteps: number | null;
  trainingDaysPerWeek: number | null;
  sessionMinutes: number | null;
  cardioMinutesPerWeek: number | null;
  weightKg: number;
  bmrKcal: number;
}): ActivitySuggestion | null {
  const fromSteps =
    input.dailySteps != null
      ? STEP_BANDS.find((b) => input.dailySteps! >= b.min)!.pal
      : null;
  const fromJob = input.occupation ? OCCUPATION_PAL[input.occupation] : null;
  if (fromSteps == null && fromJob == null) return null;
  const dailyLifePal = Math.max(fromSteps ?? 0, fromJob ?? 0);

  const days = input.trainingDaysPerWeek ?? 0;
  const assumedSessionMinutes = days > 0 && input.sessionMinutes == null;
  const sessionMinutes = input.sessionMinutes ?? DEFAULT_SESSION_MINUTES;
  const liftingHours = (days * sessionMinutes) / 60;
  const cardioHours = (input.cardioMinutesPerWeek ?? 0) / 60;
  const exerciseKcalPerDay =
    ((liftingHours * NET_MET_LIFTING + cardioHours * NET_MET_CARDIO) *
      input.weightKg) /
    7;

  const factor = dailyLifePal + exerciseKcalPerDay / input.bmrKcal;
  const level = ACTIVITY_ORDER.reduce((best, l) =>
    Math.abs(ACTIVITY_FACTORS[l] - factor) < Math.abs(ACTIVITY_FACTORS[best] - factor)
      ? l
      : best,
  );

  return {
    level,
    factor,
    dailyLifePal,
    exerciseKcalPerDay: Math.round(exerciseKcalPerDay),
    assumedSessionMinutes,
  };
}

// ---- Where a calorie intake leads ----------------------------------------
//
// Today's maintenance comes from the same Mifflin–St Jeor × activity figure the
// rest of the app uses. How the weight moves from there comes from Hall et al.'s
// NIH body-weight model (Lancet 2011), through its two published rules of
// thumb rather than a home-made line:
//
//   - every 10 kcal a day of sustained change moves weight about 1 lb (0.45 kg)
//     by the time it settles — so the settling point is gap / 22 kcal per kg;
//   - about half of that change has happened within a year.
//
// The equation's own slope (10 kcal per kg of BMR, times the activity factor)
// would put the settling point a third further out, because it misses the
// falling cost of moving a lighter body; the "7,700 kcal per kg" rule misses
// the slowing altogether and has a deficit running at full rate for ever.
// Hall's figures were fitted to adults carrying extra weight, and a lean lifter
// can run differently — the panel says so.
export const KCAL_PER_DAY_PER_KG_SETTLED = 10 / 0.45359237;
export const HALF_CHANGE_DAYS = 365;

export type WeightProjection = {
  maintenance: number;
  // Intake minus today's maintenance; negative is a deficit.
  gap: number;
  settleKg: number;
  // Days for half of the eventual change to happen.
  halfLifeDays: number;
  points: { weeks: number; weightKg: number }[];
  // null when there's no goal weight; Infinity when this intake settles short
  // of it and the goal is never reached.
  weeksToGoal: number | null;
};

export function projectWeight(input: {
  bmr: BmrInputs;
  factor: number;
  intakeKcal: number;
  goalWeightKg: number | null;
  weeks?: number[];
}): WeightProjection {
  const weightKg = input.bmr.weightKg;
  const maintenance = input.factor * bmr(input.bmr);
  const gap = input.intakeKcal - maintenance;

  const settleKg = weightKg + gap / KCAL_PER_DAY_PER_KG_SETTLED;
  const tauDays = HALF_CHANGE_DAYS / Math.LN2;
  const at = (days: number) =>
    settleKg + (weightKg - settleKg) * Math.exp(-days / tauDays);

  const points = (input.weeks ?? [4, 12, 26, 52]).map((w) => ({
    weeks: w,
    weightKg: at(w * 7),
  }));

  let weeksToGoal: number | null = null;
  const goal = input.goalWeightKg;
  if (goal != null) {
    const from = weightKg - settleKg;
    const to = goal - settleKg;
    if (Math.abs(weightKg - goal) < 0.05) weeksToGoal = 0;
    else if (from !== 0 && to / from > 0 && Math.abs(to) < Math.abs(from)) {
      weeksToGoal = Math.ceil((tauDays * Math.log(from / to)) / 7);
    } else weeksToGoal = Infinity;
  }

  return {
    maintenance: Math.round(maintenance),
    gap: Math.round(gap),
    settleKg,
    halfLifeDays: HALF_CHANGE_DAYS,
    points,
    weeksToGoal,
  };
}

export type TargetInputs = {
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  age: number;
  activity: ActivityLevel;
  goal: GoalType;
  goalWeightKg: number | null;
  rateKgPerWeek: number | null;
};

export type Targets = {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // Signed kcal/day against maintenance — negative when cutting. Reported
  // after the cap and the floor, so it is what the calorie figure actually
  // implies rather than what was asked for.
  deficit: number;
  // Likewise: the rate the accepted calorie figure delivers. If the cap or the
  // floor bound, this is slower than rateKgPerWeek, and weeksToGoal derives
  // from THIS — promising the requested timeline after clamping is a lie.
  effectiveRateKgPerWeek: number;
  proteinPerKg: number;
  referenceKg: number;
  weeksToGoal: number | null;
  warnings: string[];
};

export function suggestTargets(input: TargetInputs): Targets {
  const bmrRaw = bmr({
    sex: input.sex,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age: input.age,
  });
  const tdeeRaw = tdee(bmrRaw, input.activity);
  const warnings: string[] = [];

  const maintaining = input.goal === GOAL_TYPES.MAINTAIN;
  const requestedRate = maintaining
    ? 0
    : clamp(
        input.rateKgPerWeek ??
          (input.goal === GOAL_TYPES.LOSE
            ? DEFAULT_RATE_LOSING
            : DEFAULT_RATE_GAINING),
        MIN_RATE_KG_PER_WEEK,
        MAX_RATE_KG_PER_WEEK,
      );

  let delta = maintaining ? 0 : (requestedRate * KCAL_PER_KG) / 7;

  const maxDelta = tdeeRaw * MAX_DEFICIT_FRACTION;
  if (delta > maxDelta) {
    delta = maxDelta;
    warnings.push(
      `${requestedRate} kg a week is more than a quarter off maintenance, so this is capped at ${Math.round(maxDelta)} kcal a day.`,
    );
  }

  let signed =
    input.goal === GOAL_TYPES.LOSE
      ? -delta
      : input.goal === GOAL_TYPES.GAIN
        ? delta
        : 0;
  let caloriesRaw = tdeeRaw + signed;

  const floor = CALORIE_FLOOR[input.sex];
  if (caloriesRaw < floor) {
    caloriesRaw = floor;
    signed = caloriesRaw - tdeeRaw;
    warnings.push(
      `That deficit would land below ${floor} kcal, so this is held at the floor. Progress will be slower than the rate asks for.`,
    );
  }

  // To the nearest ten. A suggestion that says 2,143 kcal claims a precision
  // the underlying equation does not have.
  const calories = Math.round(caloriesRaw / 10) * 10;

  // For someone losing, this is the goal weight — protein set off a body they
  // are carrying rather than the one they're heading for overshoots. For
  // someone gaining, it's the current weight, because you don't feed a body
  // you haven't built yet. One line, right in both directions.
  const referenceKg =
    input.goalWeightKg != null
      ? Math.min(input.weightKg, input.goalWeightKg)
      : input.weightKg;

  const proteinPerKg =
    input.goal === GOAL_TYPES.LOSE
      ? PROTEIN_PER_KG_CUTTING
      : PROTEIN_PER_KG_OTHER;
  const protein = Math.round(proteinPerKg * referenceKg);

  const fatFloorG = FAT_PER_KG_FLOOR * referenceKg;
  let fat = Math.round(
    Math.max(fatFloorG, (FAT_ENERGY_FRACTION * calories) / KCAL_PER_G_FAT),
  );

  // Carbs take whatever energy is left, which is what keeps the three macros
  // tied to the calorie figure instead of each drifting on its own rounding.
  // They land within ±2 kcal of it rather than exactly on it, because a carb
  // gram is 4 kcal and the remainder is rarely a multiple of four. Closing
  // that gap would mean nudging fat off its floor by up to 3 g — distorting a
  // real nutritional threshold to tidy up arithmetic nobody performs.
  let carbs = Math.round(
    (calories - KCAL_PER_G_PROTEIN * protein - KCAL_PER_G_FAT * fat) /
      KCAL_PER_G_CARB,
  );

  if (carbs < 0) {
    // Only reachable at a very low calorie target against a high reference
    // weight. Give the energy back from fat down to its bare g/kg floor first.
    fat = Math.round(fatFloorG);
    carbs = Math.round(
      (calories - KCAL_PER_G_PROTEIN * protein - KCAL_PER_G_FAT * fat) /
        KCAL_PER_G_CARB,
    );
  }
  if (carbs < 0) {
    carbs = 0;
    warnings.push(
      "Protein and fat alone already reach this calorie target. Worth revisiting the rate or the goal weight.",
    );
  }

  const effectiveRateKgPerWeek = (Math.abs(signed) * 7) / KCAL_PER_KG;

  let weeksToGoal: number | null = null;
  if (
    !maintaining &&
    input.goalWeightKg != null &&
    effectiveRateKgPerWeek > 0
  ) {
    const gap = Math.abs(input.weightKg - input.goalWeightKg);
    weeksToGoal = gap > 0 ? Math.ceil(gap / effectiveRateKgPerWeek) : 0;
  }

  return {
    bmr: Math.round(bmrRaw),
    tdee: Math.round(tdeeRaw),
    calories,
    protein,
    carbs,
    fat,
    deficit: Math.round(signed),
    effectiveRateKgPerWeek,
    proteinPerKg,
    referenceKg,
    weeksToGoal,
    warnings,
  };
}

export type BmrInputs = {
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  age: number;
};

// Both gates below return the missing pieces as prose, so they need to know
// whose body is being described: a coach reads "their height" about a client
// and "your height" about themselves. `on` rides along in the same object
// rather than staying a positional date — it is the testing seam for age, and
// nothing in the app passes either, so one options bag is cheaper to read than
// two trailing arguments nobody supplies.
export type InputsOptions = {
  on?: Date;
  possessive?: "their" | "your";
};

// The gate in front of bmr(), and deliberately a lower bar than
// targetInputsFrom below: resting burn is a fact about a body, so it needs
// only sex, age, height and a weight. No goal, no activity level, no target
// rate. That matters because it is the half of the picture a coach can see
// straight after intake, before any of the coaching decisions have been made.
export function bmrInputsFrom(
  profile: {
    sex: string | null;
    birthDate: Date | null;
    heightCm: number | null;
  } | null,
  latest: { weightKg: number | null } | null,
  { on = new Date(), possessive = "their" }: InputsOptions = {},
): { inputs?: BmrInputs; missing: string[] } {
  const missing: string[] = [];

  const sex =
    profile?.sex === "MALE" || profile?.sex === "FEMALE" ? profile.sex : null;
  if (!sex) missing.push("whether to use the male or female equation");
  if (!profile?.birthDate) missing.push(`${possessive} date of birth`);
  if (profile?.heightCm == null) missing.push(`${possessive} height`);
  if (latest?.weightKg == null) missing.push("a weigh-in");

  if (
    !sex ||
    !profile?.birthDate ||
    profile.heightCm == null ||
    latest?.weightKg == null
  ) {
    return { missing };
  }

  return {
    missing,
    inputs: {
      sex,
      weightKg: latest.weightKg,
      heightCm: profile.heightCm,
      age: ageFrom(profile.birthDate, on),
    },
  };
}

// The gate in front of suggestTargets. Returns either a complete set of inputs
// or the human list of what is still missing, so the UI can say "add a height
// and a date of birth" instead of rendering a confident wrong number off a
// guessed default.
export function targetInputsFrom(
  profile: {
    sex: string | null;
    birthDate: Date | null;
    heightCm: number | null;
    activityLevel: string | null;
    goalType: string | null;
    goalWeightKg: number | null;
    rateKgPerWeek: number | null;
  } | null,
  latest: { weightKg: number | null } | null,
  { on = new Date(), possessive = "their" }: InputsOptions = {},
): { inputs?: TargetInputs; missing: string[] } {
  const missing: string[] = [];

  if (!profile) {
    return {
      missing: [
        `${possessive} date of birth`,
        `${possessive} height`,
        "whether to use the male or female equation",
        "an activity level",
        "a goal",
        "a recent weigh-in",
      ],
    };
  }

  const sex = profile.sex === "MALE" || profile.sex === "FEMALE" ? profile.sex : null;
  if (!sex) missing.push("whether to use the male or female equation");
  if (!profile.birthDate) missing.push(`${possessive} date of birth`);
  if (profile.heightCm == null) missing.push(`${possessive} height`);

  const activity =
    profile.activityLevel && profile.activityLevel in ACTIVITY_LABELS
      ? (profile.activityLevel as ActivityLevel)
      : null;
  if (!activity) missing.push("an activity level");

  const goal =
    profile.goalType === "LOSE" ||
    profile.goalType === "MAINTAIN" ||
    profile.goalType === "GAIN"
      ? (profile.goalType as GoalType)
      : null;
  if (!goal) missing.push("a goal");

  if (latest?.weightKg == null) missing.push("a recent weigh-in");

  if (
    !sex ||
    !profile.birthDate ||
    profile.heightCm == null ||
    !activity ||
    !goal ||
    latest?.weightKg == null
  ) {
    return { missing };
  }

  return {
    missing,
    inputs: {
      sex,
      weightKg: latest.weightKg,
      heightCm: profile.heightCm,
      age: ageFrom(profile.birthDate, on),
      activity,
      goal,
      goalWeightKg: profile.goalWeightKg,
      rateKgPerWeek: profile.rateKgPerWeek,
    },
  };
}

// ---- Which targets a day of food is measured against ----------------------

export type DailyTargets = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

// An assigned plan's numbers, or the suggestion derived from the file, or
// nothing — in that order, and the order is the whole content of this function.
//
// It exists because a coach can now assign a meal plan to themselves, which
// makes /me the one place in the app where both answers can be present at once.
// An athlete only ever had the plan; /me/nutrition only ever had the
// suggestion, and its own comment said so. The plan wins because it is a
// decision somebody made and the suggestion is arithmetic: accepting the
// suggested figures into a plan is exactly what SuggestedTargets exists for, so
// letting the derived number override the accepted one would undo that by hand.
//
// A plan with all four targets blank is treated as no plan, not as four blank
// targets. Those columns are optional and a plan is routinely written without
// them, so the alternative would let a meal plan with no numbers on it silently
// switch off the figures the coach was already reading.
export function dailyTargets(
  plan: DailyTargets | null,
  suggested: DailyTargets | null,
): DailyTargets | null {
  if (plan && Object.values(plan).some((v) => v != null)) return plan;
  return suggested;
}
