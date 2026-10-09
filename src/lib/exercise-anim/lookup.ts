// Browser-safe: does an exercise have an animation, where is it, and what does
// it work. Reads the generated index, never the drawings.

import { ANIMATION_ALIASES, ANIMATIONS } from "./index";
import { animationSlug } from "./slug";

export type ExerciseAnimationInfo = {
  src: string;
  primary: string[];
  secondary: string[];
};

// Served by src/app/exercise-animations/[file]/route.ts. The version is part of
// the URL so a redrawn animation isn't held back by a cached old one; bump it
// whenever the drawings change.
export const ANIMATION_VERSION = 1;

export function animationFor(name: string): ExerciseAnimationInfo | null {
  const asked = animationSlug(name);
  const slug = ANIMATION_ALIASES[asked] ?? asked;
  const entry = ANIMATIONS[slug];
  if (!entry) return null;
  return { src: `/exercise-animations/${slug}.svg?v=${ANIMATION_VERSION}`, ...entry };
}

const MUSCLE_LABELS: Record<string, string> = {
  neck: "Neck",
  traps: "Traps",
  delts_front: "Front delts",
  delts_side: "Side delts",
  delts_rear: "Rear delts",
  chest: "Chest",
  lats: "Lats",
  upper_back: "Upper back",
  lower_back: "Lower back",
  abs: "Abs",
  obliques: "Obliques",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  glutes: "Glutes",
  hip_flexors: "Hip flexors",
  quads: "Quads",
  hamstrings: "Hamstrings",
  adductors: "Adductors",
  abductors: "Abductors",
  calves: "Calves",
  tibialis: "Shins",
};

export const muscleLabel = (m: string) => MUSCLE_LABELS[m] ?? m;
