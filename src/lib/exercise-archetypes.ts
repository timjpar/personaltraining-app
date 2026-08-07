// Maps an exercise name to a movement archetype, which drives the stick-figure
// illustration in the picker.
//
// Keyword rules rather than a 178-entry table, for two reasons: a trainer's own
// custom exercises get a figure for free, and the mapping doesn't rot as the
// preset list grows. The cost is that ORDER IS LOAD-BEARING — several names
// contain two matching keywords and only the first rule wins. Every rule marked
// "guard" below exists because a real preset would otherwise be misread.
//
// Data-only: imported by a client component.

import { normalizeExerciseName } from "@/lib/exercise-presets";

export const ARCHETYPES = [
  "squat",
  "hinge",
  "lunge",
  "press-horizontal",
  "press-overhead",
  "pull-vertical",
  "pull-horizontal",
  "carry",
  "core",
  "cardio",
  "stretch",
  "explosive",
  "climb",
  "neutral",
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

type Rule = { archetype: Archetype; match: string[] };

const RULES: Rule[] = [
  // First, because climbing names collide with half the list below: "Finger
  // Rolls" would be a curl, "Boulder 4x4" nothing at all. Deliberately narrow —
  // "climbing" rather than "climb" (Stair Climber is cardio), "arc training"
  // rather than "arc", and no "hang" on its own, which would take Hanging Leg
  // Raise off the core rule. Pull-ups are left to pull-vertical: a climber's
  // weighted pull-up is still a pull-up, and that figure is the better one.
  {
    archetype: "climb",
    match: [
      "hangboard", "dead hang", "max hang", "assisted hang", "repeater",
      "crimp", "open-hand", "finger", "pinch", "campus", "boulder",
      "traverse", "lock-off", "front lever", "climbing", "arc training",
      // guard: "straight-arm" alone takes Straight-Arm Pulldown off the
      // pull-vertical rule, so the drill is matched by its full name.
      "frenchie", "flagging", "silent feet", "straight-arm drill", "route ",
      "circuit board", "cut-loose", "rice bucket", "windshield",
    ],
  },

  // guard: "Row (Erg)", "SkiErg" and "Row Easy" must not read as barbell rows;
  // rope/jack work is conditioning rather than a power movement.
  {
    archetype: "cardio",
    match: [
      "erg", "skierg", "assault bike", "echo bike", "row easy",
      "jump rope", "jumping jack", "double-under",
    ],
  },

  // guard: anything explicitly a stretch, before "hamstring" claims it for
  // hinge and "swings" claims Leg Swings.
  { archetype: "stretch", match: ["stretch", "leg swing", "foam roll"] },

  // guard: "Rear Delt Fly" is a pull; "fly" would otherwise send it to press.
  { archetype: "pull-horizontal", match: ["rear delt"] },

  // guard: "Pallof Press" is anti-rotation core, not a press.
  { archetype: "core", match: ["pallof"] },

  // guard: "Turkish Get-Up" matches nothing else meaningful.
  { archetype: "core", match: ["turkish", "get-up"] },

  // guard: "Clean Pull" / "Snatch Pull" must beat the pull rules.
  {
    archetype: "explosive",
    match: [
      "clean", "snatch", "jerk", "thruster", "jump", "burpee", "slam",
      "medicine ball", "box jump", "broad jump",
    ],
  },

  // guard: "Rack Pull" and "Cable Pull-Through" must beat the pull rules.
  {
    archetype: "hinge",
    match: [
      "rack pull", "pull-through", "good morning", "deadlift", "hinge",
      "swing", "hip thrust", "glute bridge", "back extension", "nordic",
      "leg curl", "hamstring",
    ],
  },

  // guard: "Bulgarian Split Squat" and "Barbell Split Squat" must beat squat.
  { archetype: "lunge", match: ["split squat", "lunge", "step-up", "bulgarian"] },

  // guard: "Overhead Squat" must not read as an overhead press.
  {
    archetype: "squat",
    match: ["squat", "leg press", "leg extension", "hack", "pistol"],
  },

  // guard: "Push-Up" must be claimed before the generic press rules below.
  { archetype: "press-horizontal", match: ["push-up", "push up"] },

  // guard: "Push Press" lands here, not with Push-Up.
  {
    archetype: "press-overhead",
    match: [
      "overhead press", "shoulder press", "push press", "overhead triceps",
      "handstand", "arnold", "lateral raise", "landmine",
    ],
  },

  {
    archetype: "press-horizontal",
    match: [
      "bench", "floor press", "chest press", "dip", "fly", "pec deck",
      "pushdown", "skullcrusher", "triceps", "press",
    ],
  },

  {
    archetype: "pull-vertical",
    match: ["pull-up", "chin-up", "pulldown", "pullover", "lat "],
  },

  // Reached only after Row (Erg) is already claimed by cardio.
  {
    archetype: "pull-horizontal",
    match: ["row", "face pull", "pull-apart", "rear delt", "curl", "shrug"],
  },

  { archetype: "carry", match: ["carry", "sled", "farmer", "suitcase"] },

  {
    archetype: "core",
    match: [
      "plank", "hollow", "dead bug", "bird dog", "crunch", "sit-up", "v-up",
      "knee raise", "leg raise", "rollout", "twist", "woodchop",
      "toes-to-bar", "ab wheel",
    ],
  },

  {
    archetype: "cardio",
    match: [
      "bike", "run", "jog", "rope", "sprint", "shuttle", "stair", "jacks",
      "double-under", "treadmill", "row easy", "battle",
    ],
  },

  {
    archetype: "stretch",
    match: [
      "stretch", "foam roll", "pose", "cat-cow", "mobility", "circles",
      "swings", "wall slide", "airplane", "clamshell", "inchworm",
      "breathing", "ankle", "thread the needle", "forward fold",
      "a-skip", "banded", "band ", "walk",
      "external rotation", "shoulder cars",
    ],
  },
];

export function archetypeFor(name: string): Archetype {
  const key = normalizeExerciseName(name);
  if (!key) return "neutral";
  for (const rule of RULES) {
    if (rule.match.some((m) => key.includes(m))) return rule.archetype;
  }
  return "neutral";
}

// The generic fallback when a trainer hasn't attached their own media.
export function demoSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${name} proper form`,
  )}`;
}
