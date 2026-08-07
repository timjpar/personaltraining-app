// The shipped exercise catalog. Kept in code rather than the database on
// purpose: it works the moment it deploys, with no seeding step against the
// live Postgres, and adding a movement is a one-line edit. Trainer-authored
// names live in the TrainerExercise table instead (see exercise-catalog.ts).
//
// This module is imported by a client component, so it stays data-only.

import { CLIMBING_GROUPS } from "./climbing-presets";
import { DISCIPLINES, type Discipline } from "./constants";

export type PresetCategory = {
  label: string;
  // What kind of training the whole category is. Carried on the category rather
  // than each name so a movement can't disagree with the group it sits in, and
  // so renaming a label can never silently orphan its discipline.
  discipline: Discipline;
  // Shown under the heading on /exercises. Only the climbing groups arrived
  // with one, so it stays optional rather than inventing copy for the rest.
  blurb?: string;
  exercises: string[];
};

// Everything that isn't climbing or warm-up/cool-down work.
const STRENGTH_AND_CONDITIONING: PresetCategory[] = [
  {
    label: "Barbell",
    discipline: DISCIPLINES.STRENGTH,
    exercises: [
      "Back Squat",
      "Front Squat",
      "Box Squat",
      "Overhead Squat",
      "Bench Press",
      "Incline Bench Press",
      "Close-Grip Bench Press",
      "Floor Press",
      "Deadlift",
      "Romanian Deadlift",
      "Sumo Deadlift",
      "Deficit Deadlift",
      "Rack Pull",
      "Barbell Row",
      "Pendlay Row",
      "Overhead Press",
      "Push Press",
      "Barbell Hip Thrust",
      "Good Morning",
      "Barbell Curl",
      "Barbell Lunge",
      "Barbell Split Squat",
    ],
  },
  {
    label: "Dumbbell",
    discipline: DISCIPLINES.STRENGTH,
    exercises: [
      "Dumbbell Bench Press",
      "Incline Dumbbell Press",
      "Dumbbell Shoulder Press",
      "Arnold Press",
      "Dumbbell Row",
      "Chest-Supported Row",
      "Dumbbell Lateral Raise",
      "Rear Delt Fly",
      "Dumbbell Fly",
      "Dumbbell Pullover",
      "Dumbbell Curl",
      "Hammer Curl",
      "Incline Curl",
      "Dumbbell Skullcrusher",
      "Overhead Triceps Extension",
      "Goblet Squat",
      "Dumbbell Romanian Deadlift",
      "Bulgarian Split Squat",
      "Walking Lunge",
      "Reverse Lunge",
      "Step-Up",
      "Dumbbell Thruster",
      "Farmer Carry",
    ],
  },
  {
    label: "Machine & Cable",
    discipline: DISCIPLINES.STRENGTH,
    exercises: [
      "Lat Pulldown",
      "Neutral-Grip Pulldown",
      "Seated Cable Row",
      "Straight-Arm Pulldown",
      "Cable Fly",
      "Cable Lateral Raise",
      "Face Pull",
      "Triceps Pushdown",
      "Cable Curl",
      "Leg Press",
      "Hack Squat",
      "Leg Extension",
      "Lying Leg Curl",
      "Seated Leg Curl",
      "Hip Abduction",
      "Hip Adduction",
      "Standing Calf Raise",
      "Seated Calf Raise",
      "Chest Press Machine",
      "Shoulder Press Machine",
      "Pec Deck",
      "Back Extension",
      "Cable Pull-Through",
      "Cable Woodchop",
    ],
  },
  {
    label: "Bodyweight",
    discipline: DISCIPLINES.STRENGTH,
    exercises: [
      "Pull-Up",
      "Chin-Up",
      "Neutral-Grip Pull-Up",
      "Push-Up",
      "Incline Push-Up",
      "Diamond Push-Up",
      "Dip",
      "Ring Row",
      "Inverted Row",
      "Air Squat",
      "Pistol Squat",
      "Nordic Hamstring Curl",
      "Glute Bridge",
      "Single-Leg Glute Bridge",
      "Calf Raise",
      "Handstand Hold",
      "Handstand Push-Up",
      "Burpee",
    ],
  },
  {
    label: "Olympic & Power",
    discipline: DISCIPLINES.STRENGTH,
    exercises: [
      "Clean",
      "Power Clean",
      "Hang Clean",
      "Hang Power Clean",
      "Clean Pull",
      "Snatch",
      "Power Snatch",
      "Hang Snatch",
      "Snatch Pull",
      "Clean & Jerk",
      "Split Jerk",
      "Push Jerk",
      "Thruster",
      "Box Jump",
      "Broad Jump",
      "Medicine Ball Slam",
      "Medicine Ball Chest Pass",
    ],
  },
  {
    label: "Kettlebell",
    discipline: DISCIPLINES.STRENGTH,
    exercises: [
      "Kettlebell Swing",
      "American Kettlebell Swing",
      "Kettlebell Goblet Squat",
      "Kettlebell Clean",
      "Kettlebell Snatch",
      "Turkish Get-Up",
      "Kettlebell Front Rack Carry",
      "Kettlebell Windmill",
      "Suitcase Carry",
    ],
  },
  {
    label: "Core",
    discipline: DISCIPLINES.STRENGTH,
    exercises: [
      "Plank",
      "Side Plank",
      "Hollow Hold",
      "Dead Bug",
      "Bird Dog",
      "Hanging Knee Raise",
      "Hanging Leg Raise",
      "Toes-to-Bar",
      "Ab Wheel Rollout",
      "Cable Crunch",
      "Russian Twist",
      "Pallof Press",
      "V-Up",
      "Sit-Up",
      "Copenhagen Plank",
    ],
  },
  {
    label: "Conditioning",
    discipline: DISCIPLINES.CARDIO,
    exercises: [
      "Row (Erg)",
      "Assault Bike",
      "Echo Bike",
      "SkiErg",
      "Treadmill Run",
      "Outdoor Run",
      "Sled Push",
      "Sled Drag",
      "Battle Ropes",
      "Jump Rope",
      "Double-Unders",
      "Stair Climber",
      "Shuttle Run",
      "Sprint Intervals",
    ],
  },
];

// Preparation and cool-down work, which every discipline borrows from. Filed
// under Mobility rather than split across the others: a coach looking for
// Cat-Cow is looking for warm-up work, not for whatever it warms up for.
const WARMUP_AND_MOBILITY: PresetCategory[] = [
  {
    label: "Warm-up & Activation",
    discipline: DISCIPLINES.MOBILITY,
    exercises: [
      "Bike Easy",
      "Row Easy",
      "Jog Easy",
      "Jumping Jacks",
      "Band Pull-Apart",
      "Band Face Pull",
      "Banded Glute Bridge",
      "Banded Monster Walk",
      "Clamshell",
      "Scapular Pull-Up",
      "Wall Slide",
      "Arm Circles",
      "Leg Swings",
      "Inchworm",
      "World's Greatest Stretch",
      "Cat-Cow",
      "Hip Airplane",
      "Ankle Rock",
      "Empty Bar Warm-Up",
      "A-Skip",
    ],
  },
  {
    label: "Mobility & Cool-down",
    discipline: DISCIPLINES.MOBILITY,
    exercises: [
      "Couch Stretch",
      "Pigeon Stretch",
      "Hamstring Stretch",
      "Hip Flexor Stretch",
      "Child's Pose",
      "Thread the Needle",
      "Thoracic Extension over Foam Roller",
      "Foam Roll Quads",
      "Foam Roll Glutes",
      "Foam Roll Lats",
      "Calf Stretch",
      "Doorway Pec Stretch",
      "Seated Forward Fold",
      "Supine Twist",
      "Box Breathing",
      "Easy Walk",
    ],
  },
];

// The whole catalog, climbing broken out into the seven groups it was authored
// as. This is what /exercises browses: there, structure is the point, and
// "Fingers & Grip" is a more useful heading than a wall of 57 names.
export const EXERCISE_CATEGORIES: PresetCategory[] = [
  ...STRENGTH_AND_CONDITIONING,
  ...CLIMBING_GROUPS.map((g) => ({
    label: g.label,
    discipline: DISCIPLINES.CLIMBING,
    blurb: g.blurb,
    exercises: g.exercises.map((e) => e.name),
  })),
  ...WARMUP_AND_MOBILITY,
];

// The picker's view of the same catalog, with the climbing groups collapsed
// back into one entry. A trainer scrolls this dropdown every session and most
// of them don't coach climbing — seven extra groups is a cost they'd pay every
// time. The page is where the structure belongs.
export const EXERCISE_PRESETS: PresetCategory[] = [
  ...STRENGTH_AND_CONDITIONING,
  {
    label: "Rock Climbing",
    discipline: DISCIPLINES.CLIMBING,
    exercises: CLIMBING_GROUPS.flatMap((g) => g.exercises.map((e) => e.name)),
  },
  ...WARMUP_AND_MOBILITY,
];

// Warm-up and cool-down rows lead with the category that fits them, so the
// picker opens on something useful instead of a wall of barbell work.
export const SECTION_PRESET_CATEGORY: Record<string, string> = {
  WARMUP: "Warm-up & Activation",
  COOLDOWN: "Mobility & Cool-down",
};

// Names are matched and deduped on this key, so "bench press" and "Bench Press"
// are the same exercise. Display always uses the name as it was typed.
export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Deduped, because a movement can legitimately belong to two categories —
// climbers warm up with the same Band Pull-Apart everyone else does. The picker
// dedupes at render time too (first group wins); this is so the count the
// /exercises page prints as "the N built-in movements" stays honest.
const seenNames = new Set<string>();
export const PRESET_NAMES: string[] = EXERCISE_PRESETS.flatMap(
  (c) => c.exercises,
).filter((name) => {
  const key = normalizeExerciseName(name);
  if (seenNames.has(key)) return false;
  seenNames.add(key);
  return true;
});

export const PRESET_SLUGS: Set<string> = new Set(
  PRESET_NAMES.map(normalizeExerciseName),
);

export function isPresetName(name: string): boolean {
  return PRESET_SLUGS.has(normalizeExerciseName(name));
}

// The protocol line shown beneath a movement on /exercises. Only the climbing
// movements were authored with one — everything else renders as a bare name,
// which is why this is a lookup rather than a field on the category.
export const EXERCISE_NOTES: Map<string, string> = new Map(
  CLIMBING_GROUPS.flatMap((g) =>
    g.exercises.map((e) => [normalizeExerciseName(e.name), e.note] as const),
  ),
);

// A movement's discipline comes from the category it sits in. First category
// wins, matching the picker's dedupe — so Push-Up, which Bodyweight claims
// before the climbing groups reach it, reads as Strength.
const PRESET_DISCIPLINE: Map<string, Discipline> = new Map();
for (const category of EXERCISE_CATEGORIES) {
  for (const name of category.exercises) {
    const key = normalizeExerciseName(name);
    if (!PRESET_DISCIPLINE.has(key)) PRESET_DISCIPLINE.set(key, category.discipline);
  }
}

// Undefined for a name the catalog has never heard of — a trainer's own
// movement, whose discipline is stored on the row instead.
export function disciplineForName(name: string): Discipline | undefined {
  return PRESET_DISCIPLINE.get(normalizeExerciseName(name));
}
