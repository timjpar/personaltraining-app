// Parses the intake profile and the weigh-in form into metric, validated data.
// The same job nutrition-form.ts does for the plan and the day log, and the
// same shape: manual reads off FormData returning { data?, error? }, no
// validation library.
//
// Both parsers read a hidden `units` field and do the imperial → metric
// conversion themselves. That keeps conversion on the server in exactly one
// place, so no action, query or column ever sees a pound. A tampered `units`
// value buys nothing — a coach can type any weight they like anyway — so this
// is a correctness marker, not a privilege boundary.
//
// Ranges below reject rather than clamp. Silently turning a mistyped 3 kg a
// week into 1.5 would hand back a plan the coach never asked for and never
// saw changed.
import {
  TAPE_SITES,
  toActivityLevel,
  toBiologicalSex,
  toDietPattern,
  toExperienceLevel,
  toGoalType,
  toTrainingLocation,
  toUnits,
  UNITS,
  type TapeSite,
} from "@/lib/constants";
import { parseDayParam } from "@/lib/calendar";
import { cmFromFeetIn, cmFromIn, kgFromLb } from "@/lib/units";
import { MAX_RATE_KG_PER_WEEK, MIN_RATE_KG_PER_WEEK } from "@/lib/body";

// The state every body form's action returns. It lives here rather than beside
// the trainer's actions because both roles' forms render it — an athlete's
// weigh-in form has no business importing a type out of (trainer).
export type BodyState = { error?: string; ok?: string };

const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 350;
const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;
const MIN_BODY_FAT_PCT = 3;
const MAX_BODY_FAT_PCT = 70;
const MIN_TAPE_CM = 10;
const MAX_TAPE_CM = 200;
const MIN_AGE = 10;
const MAX_AGE = 100;

function numberOrNull(value: unknown): number | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function intOrNull(value: unknown): number | null {
  const n = numberOrNull(value);
  return n == null ? null : Math.trunc(n);
}

// Trimmed and capped. Precedent: parseNutritionLogForm slices the meal label to
// 40 — these are longer because they're prose a coach reads back, but they
// still end up in emails and page layouts and need a ceiling.
function text(value: unknown, max: number): string | null {
  return String(value ?? "").trim().slice(0, max) || null;
}

export type ParsedProfile = {
  sex: string | null;
  birthDate: Date | null;
  heightCm: number | null;
  activityLevel: string | null;
  goalType: string | null;
  goalWeightKg: number | null;
  rateKgPerWeek: number | null;
  trainingDaysPerWeek: number | null;
  experience: string | null;
  trainingLocation: string | null;
  equipmentNotes: string | null;
  injuries: string | null;
  dietPattern: string | null;
  allergies: string | null;
  dietaryNotes: string | null;
  mealsPerDay: number | null;
  notes: string | null;
};

export function parseProfileForm(
  formData: FormData,
): { data?: ParsedProfile; error?: string } {
  const units = toUnits(formData.get("units"));
  const imperial = units === UNITS.IMPERIAL;

  // Height is two boxes in imperial and one in metric, so the form submits
  // whichever pair it rendered.
  let heightCm: number | null = null;
  if (imperial) {
    const feet = numberOrNull(formData.get("heightFeet"));
    const inches = numberOrNull(formData.get("heightInches")) ?? 0;
    if (feet != null) heightCm = cmFromFeetIn(feet, inches);
  } else {
    heightCm = numberOrNull(formData.get("heightCm"));
  }
  if (
    heightCm != null &&
    (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM)
  ) {
    return { error: "That height doesn't look right." };
  }

  const goalWeightRaw = numberOrNull(formData.get("goalWeight"));
  const goalWeightKg =
    goalWeightRaw == null
      ? null
      : imperial
        ? kgFromLb(goalWeightRaw)
        : goalWeightRaw;
  if (
    goalWeightKg != null &&
    (goalWeightKg < MIN_WEIGHT_KG || goalWeightKg > MAX_WEIGHT_KG)
  ) {
    return { error: "That goal weight doesn't look right." };
  }

  // The rate is entered in the viewer's mass unit per week, like every other
  // mass on the form — asking a coach who works in pounds for kilos here would
  // be the one place the toggle didn't hold.
  const rateRaw = numberOrNull(formData.get("rateKgPerWeek"));
  const rateKgPerWeek =
    rateRaw == null ? null : imperial ? kgFromLb(rateRaw) : rateRaw;
  if (
    rateKgPerWeek != null &&
    (rateKgPerWeek < MIN_RATE_KG_PER_WEEK ||
      rateKgPerWeek > MAX_RATE_KG_PER_WEEK)
  ) {
    return {
      error: imperial
        ? "Pick a rate between 0.1 and 3.3 lb a week."
        : "Pick a rate between 0.05 and 1.5 kg a week.",
    };
  }

  let birthDate: Date | null = null;
  const birthRaw = String(formData.get("birthDate") ?? "").trim();
  if (birthRaw) {
    birthDate = parseDayParam(birthRaw);
    if (!birthDate) return { error: "That date of birth doesn't look right." };
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const month = now.getMonth() - birthDate.getMonth();
    if (month < 0 || (month === 0 && now.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    if (age < MIN_AGE || age > MAX_AGE) {
      return { error: "That date of birth doesn't look right." };
    }
  }

  const trainingDaysPerWeek = intOrNull(formData.get("trainingDaysPerWeek"));
  if (
    trainingDaysPerWeek != null &&
    (trainingDaysPerWeek < 0 || trainingDaysPerWeek > 7)
  ) {
    return { error: "Training days must be 0 to 7." };
  }

  const mealsPerDay = intOrNull(formData.get("mealsPerDay"));
  if (mealsPerDay != null && (mealsPerDay < 1 || mealsPerDay > 10)) {
    return { error: "Meals per day must be 1 to 10." };
  }

  return {
    data: {
      sex: toBiologicalSex(formData.get("sex")),
      birthDate,
      heightCm,
      activityLevel: toActivityLevel(formData.get("activityLevel")),
      goalType: toGoalType(formData.get("goalType")),
      goalWeightKg,
      rateKgPerWeek,
      trainingDaysPerWeek,
      experience: toExperienceLevel(formData.get("experience")),
      trainingLocation: toTrainingLocation(formData.get("trainingLocation")),
      equipmentNotes: text(formData.get("equipmentNotes"), 1000),
      injuries: text(formData.get("injuries"), 2000),
      dietPattern: toDietPattern(formData.get("dietPattern")),
      allergies: text(formData.get("allergies"), 500),
      dietaryNotes: text(formData.get("dietaryNotes"), 2000),
      mealsPerDay,
      notes: text(formData.get("notes"), 2000),
    },
  };
}

export type ParsedMeasurement = {
  date: Date;
  weightKg: number | null;
  bodyFatPct: number | null;
  notes: string | null;
} & { [K in TapeSite]: number | null };

export function parseMeasurementForm(
  formData: FormData,
): { data?: ParsedMeasurement; error?: string } {
  const units = toUnits(formData.get("units"));
  const imperial = units === UNITS.IMPERIAL;

  const date = parseDayParam(formData.get("date"));
  if (!date) return { error: "Pick a date for this measurement." };

  // Compared against the end of today rather than now, so an athlete's own
  // "today" always passes whatever the hour. The same guard saveNutritionLog
  // uses, and for the same reason.
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (date > endOfToday) {
    return { error: "You can't record a day that hasn't happened yet." };
  }

  const weightRaw = numberOrNull(formData.get("weight"));
  const weightKg =
    weightRaw == null ? null : imperial ? kgFromLb(weightRaw) : weightRaw;
  if (
    weightKg != null &&
    (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG)
  ) {
    return { error: "That weight doesn't look right." };
  }

  const bodyFatPct = numberOrNull(formData.get("bodyFatPct"));
  if (
    bodyFatPct != null &&
    (bodyFatPct < MIN_BODY_FAT_PCT || bodyFatPct > MAX_BODY_FAT_PCT)
  ) {
    return {
      error: `Body fat percentage should be between ${MIN_BODY_FAT_PCT} and ${MAX_BODY_FAT_PCT}.`,
    };
  }

  const tape = {} as { [K in TapeSite]: number | null };
  for (const site of TAPE_SITES) {
    const raw = numberOrNull(formData.get(site.key));
    const cm = raw == null ? null : imperial ? cmFromIn(raw) : raw;
    if (cm != null && (cm < MIN_TAPE_CM || cm > MAX_TAPE_CM)) {
      return {
        error: `That ${site.label.toLowerCase()} measurement doesn't look right.`,
      };
    }
    tape[site.key] = cm;
  }

  // Unlike a nutrition log, an empty measurement is not a way to clear a day —
  // deleting is. A row of nothing is a slip, so it's refused here rather than
  // written and puzzled over later.
  const anyFigure =
    weightKg != null ||
    bodyFatPct != null ||
    TAPE_SITES.some((site) => tape[site.key] != null);
  if (!anyFigure) {
    return { error: "Add a weight, or at least one measurement." };
  }

  return {
    data: {
      date,
      weightKg,
      bodyFatPct,
      notes: text(formData.get("notes"), 2000),
      ...tape,
    },
  };
}
