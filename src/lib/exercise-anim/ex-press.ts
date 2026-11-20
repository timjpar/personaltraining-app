// The press to handstand, broken into its parts: compression with the heels
// up on blocks, passing the legs through with one foot on a chair, and the
// shoulder push of a folded pike against a wall. Then the press itself from
// an L-sit. All side-on, facing right, hands flat at the origin.

import { box, wall } from "./equipment";
import { add, base, kf, kfv, lerp, LEN, limb, palms, plantLeg, rot, sub, v, type Limb, type Pose, type V } from "./kit";
import type { Spec } from "./render";

const PALM = v(0, 0);
const REACH = LEN.upperArm + LEN.forearm + LEN.palm - 0.8;

// Pose from where the shoulder is: the trunk hangs off it at `torso`.
function fromShoulder(shoulder: V, torso: number, head = torso): Pose {
  const lumbar = sub(shoulder, rot(v(0, -LEN.torso), torso));
  const hip = sub(lumbar, rot(v(0, -LEN.pelvis), torso));
  return base(hip, { torso, pelvis: torso, head });
}

// A shoulder one straight arm from the palm, the arm leaning `lean` degrees
// forward of vertical (positive = shoulder ahead of the hand).
const straightShoulder = (lean: number, give = 1): V => add(PALM, rot(v(0, -REACH * give), -lean));

// Legs folded by joint angle relative to the trunk, so a pike stays a pike as
// the trunk turns: `hip` is trunk-to-thigh opening (180 = straight body).
const folded = (torso: number, hip: number, knee = 0, foot = 26): Limb => {
  const upper = torso + 180 - hip;
  return limb(upper, upper - knee, upper - knee + foot);
};

const flatHands = (pose: Pose, bend: 1 | -1 = 1) => palms(pose, "side", PALM, PALM, 90, bend);

// --- Phase 1: compression lean with the heels on blocks ---------------------

const BLOCK_TOP = -24;
// Heels resting on the block top, toes pointed past it.
const BLOCK_FOOT = 110;
const BLOCK_HEEL = v(52, BLOCK_TOP - 1);

const blockCompressionLean: Spec = {
  name: "Block Pike Compression Lean",
  aka: ["Heels-Elevated Compression Lean", "Elevated Pike Compression", "Block Compression Hold"],
  mode: "alternate",
  seconds: 2.4,
  hands: { N: "palm" },
  primary: ["abs", "hip_flexors", "delts_front"],
  secondary: ["triceps", "quads"],
  still: 1,
  scene: [{ draw: box(44, 62, BLOCK_TOP), layer: "back" }],
  motion: (p) => {
    // Hips float just behind the hands; leaning on, the shoulders travel
    // past the wrists and the chest folds down onto the thighs.
    const lean = lerp(4, 22, p);
    const torso = lerp(-42, -60, p);
    const shoulder = straightShoulder(lean, 0.99);
    let pose = fromShoulder(shoulder, torso, torso - lerp(10, 30, p));
    pose = { ...pose, legN: plantLeg(pose.hip, BLOCK_HEEL, BLOCK_FOOT, 1) };
    pose = { ...pose, legF: { ...pose.legN } };
    return { pose: flatHands(pose, -1) };
  },
};

// --- Phase 2: legs through with one foot on a chair -------------------------

const CHAIR_SEAT = -46;
const CHAIR_X = -78;
const chairDraw = {
  svg:
    `<rect class="frame" x="${CHAIR_X - 22}" y="${CHAIR_SEAT - 44}" width="4" height="44" rx="2"/>` +
    `<rect class="frame" x="${CHAIR_X - 21}" y="${CHAIR_SEAT}" width="3" height="${-CHAIR_SEAT}"/>` +
    `<rect class="frame" x="${CHAIR_X + 17}" y="${CHAIR_SEAT}" width="3" height="${-CHAIR_SEAT}"/>` +
    `<rect class="pad" x="${CHAIR_X - 22}" y="${CHAIR_SEAT - 3}" width="44" height="5" rx="2"/>`,
  box: [CHAIR_X - 22, CHAIR_SEAT - 44, CHAIR_X + 22, 0] as [number, number, number, number],
};
const CHAIR_ANKLE = v(CHAIR_X + 6, CHAIR_SEAT - 9);

const chairLegPass: Spec = {
  name: "Chair Press Leg Pass",
  aka: ["Chair-Assisted Press Leg Pass", "Chair Leg Pass-Through", "Press Leg Pathway Drill"],
  mode: "loop",
  seconds: 5,
  samples: 32,
  hands: { N: "palm" },
  primary: ["delts_front", "abs", "hip_flexors"],
  secondary: ["triceps", "traps"],
  still: 0.15,
  scene: [{ draw: chairDraw, layer: "back" }],
  motion: (p) => {
    // Top: shoulders stacked, hips high, the free leg hanging. Then the
    // shoulders lean on, the hips come down, and the free leg reaches through
    // past the hands until the toes touch — and back up.
    const t = kf(p, [[0, 0], [0.4, 1], [0.6, 1], [1, 0]]);
    const lean = lerp(2, 20, t);
    const torso = lerp(-158, -118, t);
    const shoulder = straightShoulder(lean, 0.995);
    let pose = fromShoulder(shoulder, torso, torso - 14);
    const chair = plantLeg(pose.hip, CHAIR_ANKLE, 70, -1);
    const free = folded(torso, lerp(22, 32, t), lerp(10, 0, t), lerp(20, 60, t));
    pose = { ...pose, legN: free, legF: chair };
    return { pose: flatHands(pose) };
  },
};

// --- Phase 3: folded pike with the seat against a wall ----------------------

const WALL_X = -46;

const wallPikeLean: Spec = {
  name: "Wall Pike Press Lean",
  aka: ["Wall Pike Shoulder Push", "Back-to-Wall Pike Lean", "Pike Press Wall Lean"],
  mode: "alternate",
  seconds: 2.6,
  hands: { N: "palm" },
  primary: ["delts_front", "triceps", "abs"],
  secondary: ["traps", "hamstrings", "forearms"],
  still: 1,
  scene: [{ draw: wall(WALL_X - 8, -150), layer: "back" }],
  motion: (p) => {
    // Seat on the wall, hands flat a forearm ahead of the toes. Pushing the
    // floor away, the shoulders go forward over the hands and the heels
    // come up off the floor as the weight moves into the hands.
    const torso = lerp(-160, -148, p);
    const hip = v(WALL_X + 12, lerp(-95, -99, p));
    let pose = base(hip, { torso, pelvis: torso, head: torso - 12 });
    const ankle = v(WALL_X + 6, lerp(-8, -14, p));
    const leg = plantLeg(hip, ankle, lerp(0, 40, p), 1);
    pose = { ...pose, legN: leg, legF: { ...leg } };
    const palm = v(14, 0);
    return { pose: palms(pose, "side", palm, palm, 90, 1) };
  },
};

// --- The goal: L-sit press to handstand -------------------------------------

type Key = { shoulder: V; torso: number; head: number; hip: number; knee?: number; foot?: number };
const PRESS: [number, Key][] = [
  // L-sit: arms straight, trunk upright, legs out level.
  [0, { shoulder: v(-3, -REACH), torso: 6, head: -2, hip: 92, foot: 26 }],
  // Lean on and fold: hips swing back and up behind the hands.
  [0.28, { shoulder: straightShoulder(18), torso: -70, head: -90, hip: 30, foot: 30 }],
  // Hips over the shoulders, legs still piked.
  [0.55, { shoulder: straightShoulder(10), torso: -165, head: -180, hip: 40, foot: 20 }],
  // Handstand: open the hips, stack the shoulders.
  [0.8, { shoulder: straightShoulder(0), torso: -180, head: -192, hip: 180, foot: 0 }],
  [1, { shoulder: straightShoulder(0), torso: -180, head: -192, hip: 180, foot: 0 }],
];

const lSitPress: Spec = {
  name: "L-Sit Press to Handstand",
  aka: ["L-Sit to Handstand Press", "Pike Press to Handstand", "Compression Press to Handstand"],
  mode: "alternate",
  seconds: 4.4,
  samples: 24,
  hands: { N: "palm" },
  primary: ["delts_front", "abs", "hip_flexors"],
  secondary: ["triceps", "traps", "forearms"],
  still: 0.4,
  motion: (p) => {
    const at = (f: (k: Key) => number) => kf(p, PRESS.map(([t, k]) => [t, f(k)]));
    const torso = at((k) => k.torso);
    const shoulder = kfv(p, PRESS.map(([t, k]) => [t, k.shoulder]));
    let pose = fromShoulder(shoulder, torso, at((k) => k.head));
    const leg = folded(torso, at((k) => k.hip), 0, at((k) => k.foot ?? 0));
    pose = { ...pose, legN: leg, legF: { ...leg, upper: leg.upper - 1, lower: leg.lower - 1 } };
    const bend: 1 | -1 = p < 0.15 ? -1 : 1;
    return { pose: flatHands(pose, bend) };
  },
};

export const PRESS_DRILLS: Spec[] = [blockCompressionLean, chairLegPass, wallPikeLean, lSitPress];

