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
      "Barbell Single-Leg RDL",
      "Sumo Deadlift",
      "Deficit Deadlift",
      "Rack Pull",
      "Barbell Row",
      "Pendlay Row",
      "Overhead Press",
      "Push Press",
      "Landmine Press",
      "Barbell Front Raise to Overhead",
      "Barbell Cuban Press",
      "Bazooka Squat",
      "Bazooka Pistol Squat",
      "Barbell Hip Thrust",
      "Good Morning",
      "Seated Good Morning",
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
      "Side-Lying Supraspinatus Raise",
      "Incline Dumbbell Y Raise",
      "Rear Delt Fly",
      "Weighted Prone Y Raise",
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
      "Seated Dumbbell External Rotation",
      "Side-Lying Dumbbell Internal Rotation",
      "Triceps Pushdown",
      "Cable Overhead Triceps Extension",
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
      "Reverse Pec Deck",
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
      "Negative Pull-Up",
      "Chest-to-Bar Pull-Up",
      "Explosive Pull-Up",
      "Wide-Grip Pull-Up",
      "Archer Pull-Up",
      "Typewriter Pull-Up",
      "One-Arm Pull-Up",
      "Negative Muscle-Up",
      "Muscle-Down",
      "Muscle-Up",
      "Bar Pullover",
      "One-Arm Pullover Negative",
      "One-Arm Pullover",
      "Push-Up",
      "Incline Push-Up",
      "Diamond Push-Up",
      "Deficit Push-Up",
      "Archer Push-Up",
      "One-Arm Incline Push-Up",
      "One-Arm Push-Up",
      "Decline Scapular Push-Up",
      "Weighted Scapular Push-Up",
      "Push-Up Plus",
      "Pike Push-Up",
      "Elevated Pike Push-Up",
      "Planche Lean",
      "Pseudo Planche Push-Up",
      "Tuck Planche",
      "Tuck Planche Push-Up",
      "Dip",
      "Straight-Bar Dip",
      "Straight-Bar Support Hold",
      "Ring Support Hold",
      "Rear Support Hold",
      "Korean Dip Negative",
      "Korean Dip",
      "Hang to Rear Support",
      "German Hang",
      "Skin the Cat",
      "Tuck Back Lever",
      "Advanced Tuck Back Lever",
      "Straddle Back Lever",
      "Back Lever",
      "Rear Support to Back Lever",
      "Ring Row",
      "Single-Arm Ring Row with Dumbbell Press",
      "Lateral Australian Pull-Up",
      "Inverted Row",
      "Air Squat",
      "Sissy Squat",
      "Pistol Squat",
      "Box Pistol Squat",
      "Assisted Pistol Squat",
      "Shrimp Squat",
      "Assisted Shrimp Squat",
      "Advanced Shrimp Squat",
      "Dragon Squat",
      "Assisted Dragon Squat",
      "Skater Squat",
      "Banded Skater Squat",
      "Figure-4 Squat",
      "Box Figure-4 Squat",
      "Nordic Hamstring Curl",
      "Band-Assisted Nordic Curl",
      "Glute Bridge",
      "Single-Leg Glute Bridge",
      "Calf Raise",
      "Handstand Hold",
      "Handstand Push-Up",
      "Deficit Handstand Push-Up",
      "Freestanding Handstand",
      "Box Pike Shoulder Stack",
      "Wall Handstand Single-Leg Pull",
      "Wall Handstand Shoulder Stack",
      "Wall L-Handstand Leg Sweep",
      "Chest-to-Wall Toe Pull",
      "Tuck Press Negative",
      "Tuck Press to Handstand",
      "Hanging Tuck Sweep",
      "Vertical Flag",
      "Tuck Flag",
      "Human Flag Negative",
      "Straddle Flag",
      "Human Flag",
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
      "Depth Jump",
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
      "Wall Single-Leg RDL",
      "Kettlebell Goblet Squat",
      "Kettlebell Deficit Sumo Squat",
      "Kettlebell Clean",
      "Kettlebell Snatch",
      "Turkish Get-Up",
      "Kettlebell Front Rack Carry",
      "Kettlebell Windmill",
      "Kettlebell Archer Swing",
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
      "Stability Ball Rollout",
      "Wall-Stop Ab Wheel Rollout",
      "Ab Wheel Rollout",
      "Standing Wall-Stop Ab Wheel Rollout",
      "Standing Ab Wheel Negative",
      "Standing Ab Wheel Rollout",
      "Cable Crunch",
      "Russian Twist",
      "Barbell Seesaw",
      "Plate Woodchop",
      "Landmine Rainbow",
      "Seated Medicine Ball Throw",
      "Twisting Alternating Tuck",
      "Bench Bridge Kettlebell Rainbow",
      "Pallof Press",
      "V-Up",
      "Seated Leg Lift",
      "Tuck L-Sit",
      "One-Leg L-Sit",
      "L-Sit",
      "Wall One-Leg V-Sit",
      "Wall V-Sit",
      "Banded V-Sit",
      "V-Sit",
      "Block Pike Compression Lean",
      "Chair Press Leg Pass",
      "Wall Pike Press Lean",
      "L-Sit Press to Handstand",
      "Tuck Dragon Flag",
      "Dragon Flag Negative",
      "Dragon Flag",
      "Sit-Up",
      "Copenhagen Plank",
      "Copenhagen Plank Knee Tuck",
      "Bench Hip Flexor Plank",
      "Side Hyperextension",
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
      "Wall Scapular Push-Up",
      "Incline Scapular Push-Up",
      "Kneeling Scapular Push-Up",
      "Wall Slide",
      "Child's Pose Lift-Off",
      "Prone Y Raise",
      "Bench Prone Y Raise",
      "Arm Circles",
      "Plate Halo",
      "Leg Swings",
      "Inchworm",
      "World's Greatest Stretch",
      "Cat-Cow",
      "Banded Cat-Cow",
      "Hip Airplane",
      "Supported Kettlebell Hip Airplane",
      "Quadruped Roller Hurdle",
      "Ankle Rock",
      "Goblet Squat Ankle Shift",
      "Empty Bar Warm-Up",
      "A-Skip",
    ],
  },
  {
    label: "Mobility & Cool-down",
    discipline: DISCIPLINES.MOBILITY,
    exercises: [
      "Couch Stretch",
      "Rear-Foot-Elevated Hip Flexor Stretch",
      "Eccentric Thomas Test",
      "Pigeon Stretch",
      "Hamstring Stretch",
      "Hip Flexor Stretch",
      "Child's Pose",
      "Thread the Needle",
      "Thoracic Extension over Foam Roller",
      "Feet-on-Wall Overhead Plate Reach",
      "Feet-on-Wall Overhead Reach over Foam Roller",
      "Foam Roll Quads",
      "Foam Roll Glutes",
      "Foam Roll Lats",
      "Calf Stretch",
      "Doorway Pec Stretch",
      "Seated Forward Fold",
      "Piked TKE",
      "Banded SAQ in Pike",
      "Seated Straddle Leg Lifts over Blocks",
      "Butterfly Stretch",
      "Feet-Elevated Butterfly Stretch",
      "Kettlebell Butterfly Stretch",
      "Feet-Elevated Kettlebell Butterfly Stretch",
      "Kettlebell Half-Butterfly Knee Lift",
      "Half-Butterfly Straight-Leg Lift",
      "Frog Stretch",
      "Pancake Stretch",
      "Half Split",
      "Front Split",
      "Full Bridge",
      "Jefferson Curl",
      "Zercher Jefferson Curl",
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
