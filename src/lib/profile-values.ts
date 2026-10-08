// The two jobs both profile pages (a coach's own, and a client's) do with a
// stored ClientProfile before the form sees it: flatten it into form values,
// and work out the activity level its details point to. In one place so the
// two pages can't drift — they did exactly the same mapping by hand.
import type { ProfileValues } from "@/components/ClientProfileForm";
import {
  ACTIVITY_FACTORS,
  bmr,
  bmrInputsFrom,
  suggestActivityLevel,
  type ActivitySuggestion,
  type BmrInputs,
} from "@/lib/body";
import {
  ACTIVITY_LABELS,
  toActivityLevel,
  toOccupationActivity,
} from "@/lib/constants";
import { toDateInput } from "@/lib/format";

type StoredProfile = {
  sex: string | null;
  birthDate: Date | null;
  heightCm: number | null;
  activityLevel: string | null;
  goalType: string | null;
  goalWeightKg: number | null;
  rateKgPerWeek: number | null;
  occupationActivity: string | null;
  dailySteps: number | null;
  sessionMinutes: number | null;
  cardioMinutesPerWeek: number | null;
  goalFocus: string | null;
  goalBodyFatPct: number | null;
  goalWaistCm: number | null;
  goalDate: Date | null;
  goalNotes: string | null;
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

export function profileFormValues(profile: StoredProfile | null): ProfileValues {
  return {
    sex: profile?.sex ?? null,
    birthDate: profile?.birthDate ? toDateInput(profile.birthDate) : "",
    heightCm: profile?.heightCm ?? null,
    activityLevel: profile?.activityLevel ?? null,
    goalType: profile?.goalType ?? null,
    goalWeightKg: profile?.goalWeightKg ?? null,
    rateKgPerWeek: profile?.rateKgPerWeek ?? null,
    occupationActivity: profile?.occupationActivity ?? null,
    dailySteps: profile?.dailySteps ?? null,
    sessionMinutes: profile?.sessionMinutes ?? null,
    cardioMinutesPerWeek: profile?.cardioMinutesPerWeek ?? null,
    goalFocus: profile?.goalFocus ?? null,
    goalBodyFatPct: profile?.goalBodyFatPct ?? null,
    goalWaistCm: profile?.goalWaistCm ?? null,
    goalDate: profile?.goalDate ? toDateInput(profile.goalDate) : "",
    goalNotes: profile?.goalNotes ?? null,
    trainingDaysPerWeek: profile?.trainingDaysPerWeek ?? null,
    experience: profile?.experience ?? null,
    trainingLocation: profile?.trainingLocation ?? null,
    equipmentNotes: profile?.equipmentNotes ?? null,
    injuries: profile?.injuries ?? null,
    dietPattern: profile?.dietPattern ?? null,
    allergies: profile?.allergies ?? null,
    dietaryNotes: profile?.dietaryNotes ?? null,
    mealsPerDay: profile?.mealsPerDay ?? null,
    notes: profile?.notes ?? null,
  };
}

export type ActivityDetail = {
  occupationActivity: string | null;
  dailySteps: number | null;
  trainingDaysPerWeek: number | null;
  sessionMinutes: number | null;
  cardioMinutesPerWeek: number | null;
};

// The level a profile's activity details point to, or null when there are no
// details to go on or no body to scale them against (it needs a weight and the
// resting burn that comes with it).
export function activitySuggestionFor(
  profile: ActivityDetail,
  inputs: BmrInputs,
): ActivitySuggestion | null {
  return suggestActivityLevel({
    occupation: toOccupationActivity(profile.occupationActivity),
    dailySteps: profile.dailySteps,
    trainingDaysPerWeek: profile.trainingDaysPerWeek,
    sessionMinutes: profile.sessionMinutes,
    cardioMinutesPerWeek: profile.cardioMinutesPerWeek,
    weightKg: inputs.weightKg,
    bmrKcal: bmr(inputs),
  });
}

// The line under the activity select: what the details suggest, and whether the
// level chosen agrees.
export function activitySuggestionText(
  profile: (ActivityDetail & {
    sex: string | null;
    birthDate: Date | null;
    heightCm: number | null;
    activityLevel: string | null;
  }) | null,
  latest: { weightKg: number | null } | null,
): string | null {
  if (!profile) return null;
  const { inputs } = bmrInputsFrom(profile, latest);
  if (!inputs) return null;
  const s = activitySuggestionFor(profile, inputs);
  if (!s) return null;

  const chosen = toActivityLevel(profile.activityLevel);
  const assumed = s.assumedSessionMinutes ? ", taking each session as an hour" : "";
  const basis = `Job and steps put daily life at ${s.dailyLifePal.toFixed(2)}×, training adds about ${s.exerciseKcalPerDay} kcal a day${assumed}`;
  const verdict =
    chosen === s.level
      ? "matches the level chosen"
      : chosen
        ? `the level chosen is ${ACTIVITY_LABELS[chosen].toLowerCase()} (${ACTIVITY_FACTORS[chosen]}×)`
        : "nothing chosen yet";
  return `Suggested from the details: ${ACTIVITY_LABELS[s.level]} (≈${s.factor.toFixed(2)}×) — ${verdict}. ${basis}.`;
}
