// The Instagram reels catalog movements were drawn from. When a movement in a
// workout came from one of these, the card links back to the original video,
// so whoever is training can watch the real thing next to the drawing.
//
// Grouped by reel, not by exercise, because that's how they arrived: one reel
// often shows several moves. Only moves the reel itself shows are listed —
// steps invented to fill a progression path between them are left off, since
// the video wouldn't show them. A movement in more than one reel gets a link
// to each, in the order listed here.
//
// Data-only: imported by a client component.

import { ANIMATION_ALIASES } from "./exercise-anim/index";
import { animationSlug } from "./exercise-anim/slug";

const REELS: { id: string; names: string[] }[] = [
  // Single-leg squat complex: dragon → pistol → figure-4 → shrimp.
  { id: "DJ7QxobSpJx", names: ["Dragon Squat", "Pistol Squat", "Figure-4 Squat", "Shrimp Squat"] },
  // Rugby core circuit.
  {
    id: "DLaWlCBxcRL",
    names: [
      "Barbell Seesaw",
      "Seated Medicine Ball Throw",
      "Plate Woodchop",
      "Hollow Hold",
      "Landmine Rainbow",
      "Ab Wheel Rollout",
    ],
  },
  { id: "DI912TXzRj5", names: ["Quadruped Roller Hurdle"] },
  // The 10%–100% floor V-sit ladder.
  {
    id: "DHtTexgT42G",
    names: ["Seated Leg Lift", "Wall One-Leg V-Sit", "Wall V-Sit", "Banded V-Sit", "V-Sit"],
  },
  // Press to handstand, in three phases.
  {
    id: "DF6b1dEsQYy",
    names: [
      "Block Pike Compression Lean",
      "Chair Press Leg Pass",
      "Wall Pike Press Lean",
      "L-Sit Press to Handstand",
    ],
  },
  { id: "DJSvX28y5Jm", names: ["Sissy Squat"] },
  { id: "DF0vHL3Pahk", names: ["Seated Dumbbell External Rotation"] },
  { id: "DIJKJOEqwXf", names: ["Eccentric Thomas Test"] },
  { id: "DMD1DUDI4wk", names: ["One-Arm Pullover"] },
  { id: "DI17NR-PTVz", names: ["Goblet Squat Ankle Shift"] },
  {
    id: "DNqIvjvM9PW",
    names: ["Kettlebell Butterfly Stretch", "Feet-Elevated Kettlebell Butterfly Stretch"],
  },
  { id: "DQKLYtmCFgm", names: ["Bench Bridge Kettlebell Rainbow"] },
  // Planche press.
  {
    id: "DLSO_WuMs9L",
    names: [
      "Planche Lean",
      "Pseudo Planche Push-Up",
      "Tuck Planche",
      "Tuck Planche Push-Up",
      "Tuck Press Negative",
      "Tuck Press to Handstand",
    ],
  },
  // Handstand wall drills.
  {
    id: "DKr1yZnsvWh",
    names: [
      "Box Pike Shoulder Stack",
      "Wall Handstand Single-Leg Pull",
      "Wall Handstand Shoulder Stack",
      "Wall L-Handstand Leg Sweep",
      "Chest-to-Wall Toe Pull",
      "Freestanding Handstand",
    ],
  },
  { id: "DR2DVVZkcpt", names: ["Hanging Tuck Sweep"] },
  // Squat University's lower-trap fix.
  { id: "DScuJl2AHZz", names: ["Prone Y Raise", "Child's Pose Lift-Off"] },
  { id: "DQ5cHDcDCJA", names: ["Rear-Foot-Elevated Hip Flexor Stretch"] },
  {
    id: "DQ6-6GBkZoC",
    names: ["Kettlebell Half-Butterfly Knee Lift", "Half-Butterfly Straight-Leg Lift"],
  },
  { id: "DSxks46CEXi", names: ["Single-Arm Ring Row with Dumbbell Press"] },
  // Shoulder rotation series: move 3, and move 4 is the seated one above.
  {
    id: "DUD1UFajiQO",
    names: ["Side-Lying Dumbbell Internal Rotation", "Seated Dumbbell External Rotation"],
  },
  { id: "DUrP-HOEgeZ", names: ["Kettlebell Archer Swing"] },
  { id: "DUoSpOtiRuS", names: ["Feet-on-Wall Overhead Plate Reach"] },
  {
    id: "DVcwYb-jOkV",
    names: [
      "Skater Squat",
      "Banded Skater Squat",
      "Bazooka Squat",
      "Bazooka Pistol Squat",
      "Dragon Squat",
      "Pistol Squat",
    ],
  },
  { id: "DWVa85Vj6Xx", names: ["Archer Pull-Up"] },
  // Hip starter pack.
  {
    id: "DW62fqBjhmi",
    names: [
      "Barbell Single-Leg RDL",
      "Wall Single-Leg RDL",
      "Copenhagen Plank Knee Tuck",
      "Supported Kettlebell Hip Airplane",
      "Eccentric Thomas Test",
    ],
  },
  { id: "DVFWuhwEUCg", names: ["Incline Dumbbell Y Raise"] },
  { id: "DUtnvkykhYd", names: ["Cable Overhead Triceps Extension"] },
  { id: "DYYOLwfAmdu", names: ["Side-Lying Supraspinatus Raise"] },
  { id: "DYdSfPhO1ol", names: ["Lateral Australian Pull-Up"] },
  { id: "DYsBoynvR7L", names: ["Barbell Front Raise to Overhead"] },
  // One straight-bar combo, pull-ups through to the back lever.
  {
    id: "DZK0jZqIymN",
    names: [
      "Wide-Grip Pull-Up",
      "Hang to Rear Support",
      "Korean Dip",
      "Rear Support to Back Lever",
      "Back Lever",
    ],
  },
  { id: "Da6xEyJTxtr", names: ["Barbell Cuban Press"] },
  { id: "DdEDVeXN7Z_", names: ["Plank Palm Raise"] },
  // "Which Cossack squat level are you?"
  {
    id: "DdHZJ5XtSd1",
    names: [
      "Ring-Assisted Cossack Squat",
      "Assisted Cossack Transition",
      "Cossack Squat",
      "Kettlebell Goblet Cossack Squat",
      "Kettlebell Cossack Sit-Through",
    ],
  },
  {
    id: "DdrWPKwMAH8",
    names: ["Prone Dumbbell Pull-Up", "Alternating Prone Dumbbell Pull-Up", "Wrist Roller"],
  },
  // Grip strength routine.
  {
    id: "Dd6LG7mTsHN",
    names: [
      "Belt-Weighted Dead Hang",
      "Farmer Carry",
      "Tennis Ball Squeeze",
      "Wrist Curl",
      "Reverse Wrist Curl",
    ],
  },
  { id: "DeSJOfvh3iS", names: ["Reverse Nordic"] },
  { id: "DesLk0kBTvO", names: ["Cable External Rotation to Press", "Dive Bomber Push-Up"] },
  { id: "DfXSJuLtCNK", names: ["Dowel Toes-to-Bar"] },
  {
    id: "DfWwyV1pSPH",
    names: ["Standing Hip Internal Rotation", "Elevated 90/90 Hip Internal Rotation"],
  },
  { id: "DfVJ1ZKtUw1", names: ["Foam Roller Couch Stretch"] },
  { id: "DfabENpMbNB", names: ["Behind-the-Back Barbell Upright Row"] },
  { id: "DfwfjKJMa4_", names: ["Barbell Floor Back Extension"] },
  { id: "DfiL5UBuyAR", names: ["Ring Y-Pull"] },
  { id: "Dc9LXqBN8VG", names: ["Behind-the-Head Dumbbell Elbow Sweep"] },
  { id: "DfQ3DzQi0__", names: ["Side-Lying Hyperextension Adductor Rotation"] },
  { id: "Dek2wr0AZ6e", names: ["Reverse Push-Up"] },
  // Five-move hip routine.
  {
    id: "DgBlkwtpcWY",
    names: [
      "Seated Dumbbell Hip Internal Rotation",
      "Bench Pigeon Rock",
      "Seated Roller Hurdle",
      "Dumbbell Butterfly Stretch",
      "Pigeon Fold to Rotation",
    ],
  },
];

export const reelUrl = (id: string) => `https://www.instagram.com/reel/${id}/`;

// Every name listed, for checking each one is a real preset.
export const REEL_NAMES: string[] = REELS.flatMap((r) => r.names);

// Keyed the way the drawings are, so an exercise programmed under another
// name the drawing already answers to ("RFE Hip Flexor", "Ab Roller") finds
// its reel too.
const keyFor = (name: string) => {
  const slug = animationSlug(name);
  return ANIMATION_ALIASES[slug] ?? slug;
};

const BY_NAME = new Map<string, string[]>();
for (const { id, names } of REELS) {
  for (const name of names) {
    const key = keyFor(name);
    BY_NAME.set(key, [...(BY_NAME.get(key) ?? []), reelUrl(id)]);
  }
}

// The reels a movement was drawn from, as links; empty for everything else.
export function reelsFor(name: string): string[] {
  return BY_NAME.get(keyFor(name)) ?? [];
}

// The reel's shortcode, if this is an Instagram post or reel link. Lets a coach's
// own attached demo that is already the source reel stand in for its link.
export function reelId(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:[^/]+\/)?(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}
