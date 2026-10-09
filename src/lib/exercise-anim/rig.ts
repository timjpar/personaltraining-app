// The skeleton every exercise animation is posed on, and the maths to pose it.
//
// Coordinates are "body units" (roughly centimetres for a 178 cm athlete) in
// SVG orientation: x to the right, y DOWN, the ground at y = 0. In the side
// view the athlete faces +x.
//
// Every bone is authored in a bind pose — standing tall, arms hanging — and a
// pose is the set of WORLD rotations of each bone away from that bind pose, in
// degrees, counter-clockwise on screen. For a figure facing right that makes
// flexion positive almost everywhere: a thigh swinging forward, an arm lifting
// forward, a forearm curling up, toes pulling up. A trunk leaning forward is
// negative, because its bone points up.
//
// World rotations rather than joint angles because that is what both ends
// want: the motions think in "the shin is vertical", and the renderer emits
// one translate + rotate per part.

export type V = { x: number; y: number };

export const v = (x: number, y: number): V => ({ x, y });
export const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k });
export const len = (a: V): number => Math.hypot(a.x, a.y);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpV = (a: V, b: V, t: number): V => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

const RAD = Math.PI / 180;

// Screen counter-clockwise rotation by `deg` (y is down, so this is SVG's
// rotate(-deg)).
export function rot(p: V, deg: number): V {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return { x: p.x * c + p.y * s, y: -p.x * s + p.y * c };
}

// The counter-clockwise angle of a direction away from straight down — the
// bind direction of every limb bone.
export function dirAngle(d: V): number {
  return Math.atan2(d.x, d.y) / RAD;
}

// --- Bind pose --------------------------------------------------------------

export const BIND = {
  hip: v(0, -95),
  lumbar: v(0, -106),
  shoulder: v(0, -147),
  neck: v(-1, -151),
  elbow: v(0, -117),
  wrist: v(0, -91),
  knee: v(0, -51),
  ankle: v(0, -8),
} as const;

export const LEN = {
  pelvis: BIND.hip.y - BIND.lumbar.y, // 11, hip → lumbar
  torso: BIND.lumbar.y - BIND.shoulder.y, // 41, lumbar → shoulder
  upperArm: BIND.elbow.y - BIND.shoulder.y, // 30
  forearm: BIND.wrist.y - BIND.elbow.y, // 26
  thigh: BIND.knee.y - BIND.hip.y, // 44
  shin: BIND.ankle.y - BIND.knee.y, // 43
  // Wrist to the centre of a closed fist, measured along the forearm: the
  // point a bar runs through. Arm IK solves to this, with the hand held in
  // line with the forearm, so "hands on the bar" is one target.
  grip: 5.6,
  // Wrist to the heel of a flat palm, for hands pressing into the floor.
  palm: 3.5,
} as const;

// Where the foot meets the floor, relative to the ankle, in bind pose.
export const FOOT = { heel: v(-4.5, 8), ball: v(14, 8), toe: v(20.5, 8) } as const;

// --- Pose -------------------------------------------------------------------

// A limb's world angles. `ku`/`kl`/`ke` foreshorten a segment that points
// toward or away from the viewer: its drawn length is that fraction of the
// real one. They default to 1, and nothing that only moves in the plane of the
// picture needs them.
export type Limb = { upper: number; lower: number; end: number; ku?: number; kl?: number; ke?: number };

export type Pose = {
  hip: V; // world position of the hip joint
  pelvis: number;
  // How far the shoulder joint rides up the trunk, in body units: positive is
  // a shrug, negative a depressed shoulder. The rig has no scapula, and this
  // is the one thing a scapula does that shows from the side.
  shrug?: number;
  // How far the shoulder joint slides forward (+, toward the chest) or back
  // across the trunk: protraction and retraction of the shoulder blades.
  protract?: number;
  torso: number;
  head: number;
  armN: Limb; // near (to the viewer) arm: upper arm, forearm, hand
  armF: Limb;
  legN: Limb; // thigh, shin, foot
  legF: Limb;
};

export const STAND: Pose = {
  hip: BIND.hip,
  pelvis: 0,
  torso: 0,
  head: 0,
  armN: { upper: 0, lower: 0, end: 0 },
  armF: { upper: 0, lower: 0, end: 0 },
  legN: { upper: 0, lower: 0, end: 0 },
  legF: { upper: 0, lower: 0, end: 0 },
};

export type Joints = {
  hip: V;
  lumbar: V;
  shoulder: V;
  neck: V;
  elbowN: V;
  wristN: V;
  elbowF: V;
  wristF: V;
  kneeN: V;
  ankleN: V;
  kneeF: V;
  ankleF: V;
};

// Forward kinematics: where every joint lands for a pose.
export function joints(p: Pose): Joints {
  const lumbar = add(p.hip, rot(sub(BIND.lumbar, BIND.hip), p.pelvis));
  const shoulder = add(lumbar, rot(v(p.protract ?? 0, BIND.shoulder.y - BIND.lumbar.y - (p.shrug ?? 0)), p.torso));
  const neck = add(lumbar, rot(sub(BIND.neck, BIND.lumbar), p.torso));
  const arm = (l: Limb) => {
    const elbow = add(shoulder, rot(v(0, LEN.upperArm * (l.ku ?? 1)), l.upper));
    const wrist = add(elbow, rot(v(0, LEN.forearm * (l.kl ?? 1)), l.lower));
    return { elbow, wrist };
  };
  const leg = (l: Limb) => {
    const knee = add(p.hip, rot(v(0, LEN.thigh * (l.ku ?? 1)), l.upper));
    const ankle = add(knee, rot(v(0, LEN.shin * (l.kl ?? 1)), l.lower));
    return { knee, ankle };
  };
  const aN = arm(p.armN);
  const aF = arm(p.armF);
  const lN = leg(p.legN);
  const lF = leg(p.legF);
  return {
    hip: p.hip,
    lumbar,
    shoulder,
    neck,
    elbowN: aN.elbow,
    wristN: aN.wrist,
    elbowF: aF.elbow,
    wristF: aF.wrist,
    kneeN: lN.knee,
    ankleN: lN.ankle,
    kneeF: lF.knee,
    ankleF: lF.ankle,
  };
}

// Two-bone IK. From `root`, reach `target` with bones `l1` then `l2`; `bend`
// +1 swings the middle joint counter-clockwise of the root→target line (a knee
// in front of a hanging leg), -1 clockwise (an elbow behind a hanging arm).
// Out-of-reach targets are reached for along the line rather than failing.
export function ik2(root: V, target: V, l1: number, l2: number, bend: 1 | -1) {
  const d = sub(target, root);
  const dist = Math.min(Math.max(len(d), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA))) / RAD;
  const upper = dirAngle(d) + bend * a;
  const mid = add(root, rot(v(0, l1), upper));
  const lower = dirAngle(sub(add(root, mul(d, dist / len(d))), mid));
  return { upper, lower, mid };
}

// A leg whose foot stays put: hip and ankle fixed, the knee bends forward.
export function plantLeg(hip: V, ankle: V, foot = 0, bend: 1 | -1 = 1): Limb {
  const { upper, lower } = ik2(hip, ankle, LEN.thigh, LEN.shin, bend);
  return { upper, lower, end: foot };
}

// An arm whose fist closes on `grip`. The hand stays in line with the forearm
// unless `wrist` bends it (counter-clockwise degrees, relative).
export function gripArm(shoulder: V, grip: V, bend: 1 | -1 = -1, wrist = 0): Limb {
  const { upper, lower } = ik2(shoulder, grip, LEN.upperArm, LEN.forearm + LEN.grip, bend);
  return { upper, lower, end: lower + wrist };
}

// An arm whose palm presses flat at `palm` (the heel of the hand), fingers
// pointing along `fingers` (world counter-clockwise degrees; 90 = forward).
export function palmArm(shoulder: V, palm: V, fingers: number, bend: 1 | -1 = -1): Limb {
  // The heel of the hand sits LEN.palm past the wrist, perpendicular to the
  // fingers, so back the wrist off by that much.
  const wrist = add(palm, rot(v(0, -LEN.palm), fingers - 90));
  const { upper, lower } = ik2(shoulder, wrist, LEN.upperArm, LEN.forearm, bend);
  return { upper, lower, end: fingers };
}

// Where a pose's grip point is, for props held in the hand.
export function gripPoint(j: Joints, l: Limb, side: "N" | "F"): V {
  const wrist = side === "N" ? j.wristN : j.wristF;
  return add(wrist, rot(v(0, LEN.grip), l.end));
}

// --- Timing ------------------------------------------------------------------

export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// --- Square-on views -----------------------------------------------------------
//
// From the front or behind, the same bones swing in the frontal plane. `N`
// limbs are the ones on the right of the picture, `F` the ones on the left;
// a limb rotating counter-clockwise swings out to the right. Symmetric
// movements pass the right limb through `mirror()` for the left.

export const SQUARE = { shoulderX: 19, hipX: 9 } as const;

export type FrontJoints = Joints & { shoulderF: V; hipF: V };

export function frontJoints(p: Pose): FrontJoints {
  const lumbar = add(p.hip, rot(v(0, -11), p.pelvis));
  const neck = add(lumbar, rot(v(0, -45), p.torso));
  const shoulderAt = (s: 1 | -1) =>
    add(lumbar, rot(v(SQUARE.shoulderX * s, -38 - (p.shrug ?? 0)), p.torso));
  const hipAt = (s: 1 | -1) => add(p.hip, rot(v(SQUARE.hipX * s, 0), p.pelvis));
  const shoulderN = shoulderAt(1);
  const shoulderF = shoulderAt(-1);
  const hipN = hipAt(1);
  const hipF = hipAt(-1);
  const arm = (sh: V, l: Limb) => {
    const elbow = add(sh, rot(v(0, LEN.upperArm * (l.ku ?? 1)), l.upper));
    return { elbow, wrist: add(elbow, rot(v(0, LEN.forearm * (l.kl ?? 1)), l.lower)) };
  };
  const leg = (h: V, l: Limb) => {
    const knee = add(h, rot(v(0, LEN.thigh * (l.ku ?? 1)), l.upper));
    return { knee, ankle: add(knee, rot(v(0, LEN.shin * (l.kl ?? 1)), l.lower)) };
  };
  const aN = arm(shoulderN, p.armN);
  const aF = arm(shoulderF, p.armF);
  const lN = leg(hipN, p.legN);
  const lF = leg(hipF, p.legF);
  return {
    hip: hipN,
    hipF,
    lumbar,
    neck,
    shoulder: shoulderN,
    shoulderF,
    elbowN: aN.elbow,
    wristN: aN.wrist,
    elbowF: aF.elbow,
    wristF: aF.wrist,
    kneeN: lN.knee,
    ankleN: lN.ankle,
    kneeF: lF.knee,
    ankleF: lF.ankle,
  };
}

export const mirror = (l: Limb): Limb => ({ ...l, upper: -l.upper, lower: -l.lower, end: -l.end });
