// Browser-safe: which exercises also have a turnable 3D view, and how to stage
// it. The motion itself comes from the same spec as the flat drawing (see
// model3d.ts), lifted out of the picture plane: near-side limbs to one side of
// the body, far-side limbs to the other.
//
// Only movements that turn the body over, where a fixed side view can't show
// which way it's going, are worth one. Each lists its own phases, named by the
// trunk angle the drawing reaches (0 upright, 180 upside down, 360 upright
// again after a full turn), so a negative that plays the move backwards still
// names each phase correctly.

import { ANIMATION_ALIASES } from "./index";
import { animationSlug } from "./slug";

export type ThreeDStage = {
  // The bar, in drawing units (x forward, y down, the floor at 0).
  bar: { x: number; y: number };
  // One hand on the bar; the far arm swings free, out to the side.
  oneArm?: boolean;
  // Read in order: the first whose `below` is above the trunk angle names it.
  phases: { below: number; label: string }[];
};

const PULLOVER_PHASES: ThreeDStage["phases"] = [
  { below: 20, label: "Hang from the bar" },
  { below: 100, label: "Pull and bring the knees up" },
  { below: 176, label: "Roll back, head going down" },
  { below: 200, label: "Hips on the bar, legs over it" },
  { below: 300, label: "Turn over the bar on the hips" },
  { below: Infinity, label: "Push up into support on top" },
];

const SIDE_BAR = { x: 6, y: -236 };

const STAGES: Record<string, ThreeDStage> = {
  "bar-pullover": { bar: SIDE_BAR, phases: PULLOVER_PHASES },
  "one-arm-pullover": { bar: SIDE_BAR, oneArm: true, phases: PULLOVER_PHASES },
  "one-arm-pullover-negative": { bar: SIDE_BAR, oneArm: true, phases: PULLOVER_PHASES },
};

export const THREE_D_SLUGS = Object.keys(STAGES);

// Bump when the 3D frames change, as ANIMATION_VERSION is for the drawings.
export const MODEL_VERSION = 2;

export function threeDFor(name: string): { slug: string; src: string; stage: ThreeDStage } | null {
  const asked = animationSlug(name);
  const slug = ANIMATION_ALIASES[asked] ?? asked;
  const stage = STAGES[slug];
  if (!stage) return null;
  return { slug, src: `/exercise-animations/${slug}.3d.json?v=${MODEL_VERSION}`, stage };
}

// The frames the server sends: each is the 2D joints of the side drawing, plus
// the trunk angle that names the phase.
export type ModelPoint = [number, number];
export type ModelFrame = {
  torso: number;
  hip: ModelPoint;
  lumbar: ModelPoint;
  shoulder: ModelPoint;
  neck: ModelPoint;
  head: ModelPoint;
  // A point on the front of the head, so the viewer can tell which way the
  // body faces.
  face: ModelPoint;
  elbowN: ModelPoint;
  wristN: ModelPoint;
  handN: ModelPoint;
  elbowF: ModelPoint;
  wristF: ModelPoint;
  handF: ModelPoint;
  kneeN: ModelPoint;
  ankleN: ModelPoint;
  toeN: ModelPoint;
  kneeF: ModelPoint;
  ankleF: ModelPoint;
  toeF: ModelPoint;
};
export type Model = {
  mode: "alternate" | "loop";
  // One full rep; for "alternate", there and back.
  seconds: number;
  frames: ModelFrame[];
};
