// The shipped exercise catalog. Kept in code rather than the database on
// purpose: it works the moment it deploys, with no seeding step against the
// live Postgres, and adding a movement is a one-line edit. Trainer-authored
// names live in the TrainerExercise table instead (see exercise-catalog.ts).
//
// This module is imported by a client component, so it stays data-only.

export type PresetCategory = {
  label: string;
  exercises: string[];
};

export const EXERCISE_PRESETS: PresetCategory[] = [
  {
    label: "Barbell",
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
  {
    label: "Warm-up & Activation",
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

export const PRESET_NAMES: string[] = EXERCISE_PRESETS.flatMap((c) => c.exercises);

export const PRESET_SLUGS: Set<string> = new Set(
  PRESET_NAMES.map(normalizeExerciseName),
);

export function isPresetName(name: string): boolean {
  return PRESET_SLUGS.has(normalizeExerciseName(name));
}
