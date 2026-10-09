// Building blocks the exercise specs are written in: keyframe tracks, and
// builders for the positions most movements start from (standing, lying,
// sitting, hanging, on all fours) that solve the legs and arms with IK.

import type { HandShape, PropState, Spec, View } from "./render";
import {
  add,
  dirAngle,
  FOOT,
  frontJoints,
  gripArm,
  ik2,
  joints,
  LEN,
  lerp,
  lerpV,
  mirror,
  palmArm,
  plantLeg,
  rot,
  STAND,
  sub,
  v,
  type Limb,
  type Pose,
  type V,
} from "./rig";

export { add, dirAngle, FOOT, frontJoints, gripArm, ik2, joints, LEN, lerp, lerpV, mirror, palmArm, plantLeg, rot, STAND, sub, v };
export type { Limb, Pose, V, Spec, PropState, HandShape, View };

const smooth = (t: number) => t * t * (3 - 2 * t);

// A value that passes through keys [phase, value], easing in and out of each.
// Phases outside the keys hold the end values.
export function kf(p: number, keys: [number, number][]): number {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (p <= t1) return lerp(v0, v1, smooth((p - t0) / (t1 - t0 || 1)));
  }
  return keys[keys.length - 1][1];
}

export function kfv(p: number, keys: [number, V][]): V {
  return v(
    kf(p, keys.map(([t, q]) => [t, q.x])),
    kf(p, keys.map(([t, q]) => [t, q.y])),
  );
}

// The same, but a straight line between keys — for steady motion such as a
// run or a pedal stroke, where easing would stutter.
export function lin(p: number, keys: [number, number][]): number {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (p <= t1) return lerp(v0, v1, (p - t0) / (t1 - t0 || 1));
  }
  return keys[keys.length - 1][1];
}

// A smooth back-and-forth for loops: 0 → 1 → 0 over one cycle.
export const wave = (p: number) => (1 - Math.cos(p * 2 * Math.PI)) / 2;

export const limb = (upper: number, lower = upper, end = lower): Limb => ({ upper, lower, end });

// --- Where things are ----------------------------------------------------------

export function shoulders(pose: Pose, view: View = "side"): { N: V; F: V } {
  if (view === "side") {
    const s = joints(pose).shoulder;
    return { N: s, F: s };
  }
  const j = frontJoints(pose);
  return { N: j.shoulder, F: j.shoulderF };
}

export function hips(pose: Pose, view: View = "side"): { N: V; F: V } {
  if (view === "side") return { N: pose.hip, F: pose.hip };
  const j = frontJoints(pose);
  return { N: j.hip, F: j.hipF };
}

export function wrists(pose: Pose, view: View = "side"): { N: V; F: V } {
  const j = view === "side" ? joints(pose) : frontJoints(pose);
  return { N: j.wristN, F: j.wristF };
}

export function ankles(pose: Pose, view: View = "side"): { N: V; F: V } {
  const j = view === "side" ? joints(pose) : frontJoints(pose);
  return { N: j.ankleN, F: j.ankleF };
}

// The centre of each fist, for anything held.
export function grips(pose: Pose, view: View = "side"): { N: V; F: V } {
  const w = wrists(pose, view);
  return {
    N: add(w.N, rot(v(0, LEN.grip), pose.armN.end)),
    F: add(w.F, rot(v(0, LEN.grip), pose.armF.end)),
  };
}

// A point carried by the trunk, given in bind-pose offsets from the lumbar
// joint (side view): the bar on the back, a goblet at the chest.
export function onTrunk(pose: Pose, offset: V): V {
  return add(joints(pose).lumbar, rot(offset, pose.torso));
}

// --- Arms --------------------------------------------------------------------------

// Close both fists on these points. `bend` picks which way each elbow folds:
// -1 behind/outside, +1 in front/inside (see rig.ts ik2).
export function hold(
  pose: Pose,
  view: View,
  gripN: V,
  gripF: V = gripN,
  bendN: 1 | -1 = -1,
  bendF: 1 | -1 = view === "side" ? bendN : (-bendN as 1 | -1),
  wrist = 0,
): Pose {
  const s = shoulders(pose, view);
  return {
    ...pose,
    armN: gripArm(s.N, gripN, bendN, wrist),
    armF: gripArm(s.F, gripF, bendF, view === "side" ? wrist : -wrist),
  };
}

// Press both palms flat at these points, fingers along `fingers`.
export function palms(
  pose: Pose,
  view: View,
  palmN: V,
  palmF: V = palmN,
  fingers = 90,
  bendN: 1 | -1 = -1,
  bendF: 1 | -1 = view === "side" ? bendN : (-bendN as 1 | -1),
): Pose {
  const s = shoulders(pose, view);
  return {
    ...pose,
    armN: palmArm(s.N, palmN, fingers, bendN),
    armF: palmArm(s.F, palmF, view === "side" ? fingers : -fingers, bendF),
  };
}

// --- Legs ----------------------------------------------------------------------------

// Plant both feet: ankles fixed, knees solved. In the square views the left
// ankle defaults to the mirror of the right.
export function plant(
  pose: Pose,
  view: View,
  ankleN: V,
  ankleF?: V,
  foot: { N?: number; F?: number } = {},
  bend: 1 | -1 = 1,
): Pose {
  const h = hips(pose, view);
  const aF = ankleF ?? (view === "side" ? ankleN : v(-ankleN.x, ankleN.y));
  return {
    ...pose,
    legN: plantLeg(h.N, ankleN, foot.N ?? 0, bend),
    legF: plantLeg(h.F, aF, foot.F ?? 0, view === "side" ? bend : (-bend as 1 | -1)),
  };
}

// Feet flat on the floor at these toe-forward positions (side view): the
// ankle sits FOOT.heel.y above the floor.
export const floorAnkle = (x: number, y = 0) => v(x, y - 8);

// --- Whole positions -------------------------------------------------------------

type Trunk = { pelvis?: number; torso?: number; head?: number; shrug?: number };

export function base(hip: V, t: Trunk = {}): Pose {
  const torso = t.torso ?? 0;
  return {
    ...STAND,
    hip,
    pelvis: t.pelvis ?? torso,
    torso,
    head: t.head ?? torso,
    shrug: t.shrug,
    armN: limb(0),
    armF: limb(0),
    legN: limb(0),
    legF: limb(0),
  };
}

// Standing on both feet at ankle x (side view), hips at height `hipY` and
// shifted to keep `probe` (some point carried by the body) over x = `over`.
export function stand(
  hipY: number,
  t: Trunk,
  o: { ankleN?: V; ankleF?: V; over?: number; probe?: (p: Pose) => V; hipX?: number } = {},
): Pose {
  const ankleN = o.ankleN ?? v(0, -8);
  const ankleF = o.ankleF ?? ankleN;
  let pose = base(v(o.hipX ?? 0, hipY), t);
  if (o.probe && o.over !== undefined) {
    const q = o.probe(pose);
    pose = base(v(o.over - q.x, hipY), t);
  }
  return plant(pose, "side", ankleN, ankleF);
}

// Standing square-on, feet under the hips (or `stance` apart from centre).
export function standSquare(hipY = -94.6, t: Trunk = {}, stance = 9): Pose {
  return plant(base(v(0, hipY), t), "front", v(stance, -8), v(-stance, -8), {}, 1);
}

// Lying on the back on a surface at height `surface`, head to the left; the
// hip joint sits 14 above whatever the glutes rest on.
export function supine(surface: number, hipX = 0, t: Trunk = {}): Pose {
  return base(v(hipX, surface - 14), { pelvis: 90, torso: 90, head: 90, ...t });
}

// Face down, head to the right, body straight along `tilt` degrees above
// horizontal, pivoting on the toes at `toe`.
export function prone(toe: V, tilt: number): Pose {
  const body = -90 + tilt;
  const ankle = sub(toe, rot(FOOT.toe, body));
  const hip = sub(ankle, rot(v(0, 87), body));
  const straight = limb(body);
  return { ...base(hip, { pelvis: body, torso: body, head: body + 6 }), legN: straight, legF: { ...straight } };
}

// Sitting on a seat at height `seat`, facing right, feet flat at `ankleX`.
export function seated(seat: number, ankleX: number, t: Trunk = {}, hipX = 0): Pose {
  const pose = base(v(hipX, seat - 12), t);
  return plant(pose, "side", floorAnkle(ankleX), floorAnkle(ankleX), {}, 1);
}

// Hanging from a bar (side view) at `bar`: arms straight up, body below.
export function hangSide(bar: V, t: Trunk & { reach?: number } = {}): Pose {
  const reach = t.reach ?? 180;
  const torso = t.torso ?? 0;
  const shoulder = sub(bar, rot(v(0, LEN.upperArm + LEN.forearm + LEN.grip), reach));
  const lumbar = sub(shoulder, rot(v(0, -41 - (t.shrug ?? 0)), torso));
  const pelvis = t.pelvis ?? torso;
  const hip = sub(lumbar, rot(v(0, -11), pelvis));
  const pose = base(hip, { ...t, torso, pelvis });
  const arm = limb(reach);
  return { ...pose, armN: arm, armF: { ...arm } };
}

// On hands and knees, head to the right: knees on the floor under the hips,
// palms under the shoulders.
export function allFours(t: Trunk = {}, hipX = 0): Pose {
  // Thigh vertical, so the hip is a thigh-length above the knee on the floor.
  const knee = v(hipX, -5);
  const hip = sub(knee, v(0, LEN.thigh));
  const torso = t.torso ?? -90;
  let pose = base(hip, { pelvis: t.pelvis ?? torso, torso, head: t.head ?? torso + 10, shrug: t.shrug });
  pose = { ...pose, legN: limb(0, -90, -100), legF: limb(0, -90, -100) };
  const s = shoulders(pose).N;
  return palms(pose, "side", v(s.x + 2, 0), v(s.x + 2, 0), 90, -1);
}

export type { Spec as ExerciseSpec };
export const both = (l: Limb) => ({ armN: l, armF: { ...l } });
export const legs = (l: Limb) => ({ legN: l, legF: { ...l } });
export const at = (q: V): PropState => ({ at: q });
export const turned = (q: V, angle: number): PropState => ({ at: q, angle });

// Straight line from a fixed point to a moving one, for cables and bands.
export function line(from: V, to: V): PropState {
  const d = sub(to, from);
  return { at: from, angle: (Math.atan2(-d.y, d.x) * 180) / Math.PI, scaleX: Math.max(0.01, Math.hypot(d.x, d.y)) };
}

export const midpoint = (a: V, b: V) => lerpV(a, b, 0.5);

// --- Sequences of whole poses ------------------------------------------------------

const lerpLimb = (a: Limb, b: Limb, t: number): Limb => ({
  upper: lerp(a.upper, b.upper, t),
  lower: lerp(a.lower, b.lower, t),
  end: lerp(a.end, b.end, t),
  ku: lerp(a.ku ?? 1, b.ku ?? 1, t),
  kl: lerp(a.kl ?? 1, b.kl ?? 1, t),
  ke: lerp(a.ke ?? 1, b.ke ?? 1, t),
});

// Straight interpolation of everything a pose holds. Contacts are not
// re-solved, so keep keys close enough together that feet don't visibly slide.
export function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    hip: lerpV(a.hip, b.hip, t),
    pelvis: lerp(a.pelvis, b.pelvis, t),
    torso: lerp(a.torso, b.torso, t),
    head: lerp(a.head, b.head, t),
    shrug: lerp(a.shrug ?? 0, b.shrug ?? 0, t),
    protract: lerp(a.protract ?? 0, b.protract ?? 0, t),
    armN: lerpLimb(a.armN, b.armN, t),
    armF: lerpLimb(a.armF, b.armF, t),
    legN: lerpLimb(a.legN, b.legN, t),
    legF: lerpLimb(a.legF, b.legF, t),
  };
}

// A pose passing through keyed poses, easing in and out of each.
export function seq(p: number, keys: [number, Pose][]): Pose {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, b] = keys[i];
    const [t0, a] = keys[i - 1];
    if (p <= t1) return blend(a, b, smooth((p - t0) / (t1 - t0 || 1)));
  }
  return keys[keys.length - 1][1];
}

// --- Gait ----------------------------------------------------------------------------

export type Gait = {
  stance: number; // fraction of the cycle a foot is on the ground
  stride: number; // how far the foot travels under the hip while planted
  lift: number; // peak foot height in swing
  kick: number; // how far the heel tucks up behind in swing (running)
  hipY: number;
  bob: number;
  lean: number;
  arm: number; // arm swing, degrees each way
  elbow: number; // elbow bend
};

export const WALK: Gait = { stance: 0.62, stride: 40, lift: 10, kick: 0, hipY: -93, bob: 1.4, lean: -3, arm: 18, elbow: 18 };
export const JOG: Gait = { stance: 0.42, stride: 40, lift: 18, kick: 26, hipY: -90, bob: 2.4, lean: -7, arm: 30, elbow: 85 };
export const RUN: Gait = { stance: 0.36, stride: 50, lift: 26, kick: 40, hipY: -89, bob: 3, lean: -9, arm: 38, elbow: 88 };
export const SPRINT: Gait = { stance: 0.3, stride: 60, lift: 38, kick: 52, hipY: -88, bob: 3.2, lean: -15, arm: 52, elbow: 90 };

// Where one ankle is, relative to the hip's x, at phase `q` of its own cycle
// (0 = touching down in front), and the foot's angle.
function footAt(g: Gait, q: number): { x: number; y: number; foot: number } {
  q = ((q % 1) + 1) % 1;
  const half = g.stride / 2;
  if (q < g.stance) {
    const t = q / g.stance;
    const foot = lin(t, [[0, g.kick ? 0 : 14], [0.2, 0], [0.75, 0], [1, -28]]);
    return { x: lerp(half, -half, t) + 4, y: -8 - (t > 0.75 ? (t - 0.75) * 14 : 0), foot };
  }
  const t = (q - g.stance) / (1 - g.stance);
  const x = kf(t, [[0, -half + 4], [0.35, -half - 2], [1, half + 4]]);
  const y = -8 - Math.sin(Math.PI * t) * g.lift - kf(t, [[0, 0], [0.3, g.kick], [0.7, g.kick * 0.2], [1, 0]]);
  const foot = kf(t, [[0, -30], [0.3, -40], [0.75, 10], [1, g.kick ? 0 : 14]]);
  return { x, y, foot };
}

// A gait cycle at phase p: the near leg touches down at 0, the far at 0.5.
export function gait(p: number, g: Gait, trunk: { torso?: number; head?: number } = {}): Pose {
  const bob = Math.cos(4 * Math.PI * (p - g.stance / 4)) * g.bob;
  const hip = v(0, g.hipY + bob);
  const torso = trunk.torso ?? g.lean;
  let pose = base(hip, { torso, pelvis: torso * 0.5, head: trunk.head ?? torso * 0.4 });
  const n = footAt(g, p);
  const f = footAt(g, p + 0.5);
  pose = {
    ...pose,
    legN: plantLeg(hip, v(n.x, n.y), n.foot, 1),
    legF: plantLeg(hip, v(f.x, f.y), f.foot, 1),
  };
  const swing = Math.cos(2 * Math.PI * p) * g.arm;
  const armN = limb(-swing, -swing + g.elbow, -swing + g.elbow);
  const armF = limb(swing, swing + g.elbow, swing + g.elbow);
  return { ...pose, armN, armF };
}
