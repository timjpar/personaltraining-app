// Trunk and hip work: planks, hollows, hanging raises, rollouts, crunches,
// rotations, levers, and the banded/cabled hip moves.

import { box, cable, cableTower, medBall, pullUpBar, pullUpBarAcross } from "./equipment";
import {
  add,
  allFours,
  at,
  base,
  frontJoints,
  grips,
  hangSide,
  hold,
  kf,
  LEN,
  lerp,
  limb,
  line,
  mirror,
  onTrunk,
  plant,
  plantLeg,
  prone,
  rot,
  shoulders,
  standSquare,
  sub,
  supine,
  v,
  wave,
  type Limb,
  type Pose,
  type Spec,
  type V,
} from "./kit";

const breathe = (p: number, amount = 1) => (wave(p) - 0.5) * amount;

// --- Planks ------------------------------------------------------------------------

// Forearm plank: the tilt that sets the shoulders an upper arm above the
// elbows.
function forearmPlank(toe: V, shoulderY: number): Pose {
  let lo = 0;
  let hi = 40;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (shoulders(prone(toe, mid)).N.y > shoulderY) lo = mid;
    else hi = mid;
  }
  const pose = prone(toe, (lo + hi) / 2);
  return { ...pose, armN: limb(0, 90, 90), armF: limb(0, 90, 90) };
}

const plank: Spec = {
  name: "Plank",
  aka: ["Forearm Plank"],
  mode: "loop",
  seconds: 4,
  hands: { N: "fist" },
  primary: ["abs"],
  secondary: ["obliques", "delts_front", "quads", "glutes"],
  still: 0.25,
  motion: (p) => ({ pose: forearmPlank(v(-66, 0), -36 - breathe(p, 1.2)) }),
};

// Side-lying, square-on: the whole figure turned onto its right-of-picture
// side, propped on that forearm.
function sidePlankPose(shoulderN: V, tilt: number, hipLift = 0): Pose {
  const torso = -90 + tilt;
  const lumbar = sub(shoulderN, rot(v(19, -38), torso));
  const hip = add(sub(lumbar, rot(v(0, -11), torso)), v(0, -hipLift));
  const pose = base(hip, { torso, pelvis: torso, head: torso + 6 });
  const leg = limb(torso, torso, torso + 10);
  return {
    ...pose,
    legN: leg,
    legF: { ...leg },
    armN: { ...limb(-4, 90, 90), kl: 0.35 },
    armF: limb(torso + 170, torso + 170, torso + 170),
  };
}

const sidePlank: Spec = {
  name: "Side Plank",
  view: "front",
  mode: "loop",
  seconds: 4,
  hands: { N: "fist" },
  primary: ["obliques"],
  secondary: ["abs", "abductors", "delts_side"],
  still: 0.25,
  motion: (p) => ({ pose: sidePlankPose(v(46, -36), 18 + breathe(p, 2)) }),
};

const copenhagenPlank: Spec = {
  name: "Copenhagen Plank",
  view: "front",
  mode: "loop",
  seconds: 4,
  hands: { N: "fist" },
  primary: ["adductors", "obliques"],
  secondary: ["abs", "abductors"],
  still: 0.25,
  scene: [{ draw: box(-112, -64, -40, "pad"), layer: "back" }],
  motion: (p) => {
    const pose = sidePlankPose(v(46, -40), 22 + breathe(p, 2));
    return { pose: { ...pose, legN: limb(pose.torso + 18, pose.torso - 40, pose.torso - 30) } };
  },
};

// --- Lying ----------------------------------------------------------------------------

const hollowHold: Spec = {
  name: "Hollow Hold",
  aka: ["Hollow Body Hold"],
  mode: "loop",
  seconds: 4,
  hands: { N: "hand" },
  primary: ["abs"],
  secondary: ["hip_flexors", "obliques", "quads"],
  still: 0.25,
  motion: (p) => {
    const b = breathe(p, 3);
    const pose = supine(0, 0, { torso: 70 + b, pelvis: 86, head: 58 + b });
    return { pose: { ...pose, hip: v(0, -12), armN: limb(-100 + b), armF: limb(-100 + b), ...legsUp(112 - b) } };
  },
};

function legsUp(a: number): { legN: Limb; legF: Limb } {
  return { legN: limb(a, a, a + 30), legF: limb(a, a, a + 30) };
}

const deadBug: Spec = {
  name: "Dead Bug",
  mode: "loop",
  seconds: 4,
  hands: { N: "hand" },
  primary: ["abs"],
  secondary: ["obliques", "hip_flexors"],
  still: 0.25,
  motion: (p) => {
    const n = Math.max(0, Math.sin(2 * Math.PI * p));
    const f = Math.max(0, -Math.sin(2 * Math.PI * p));
    const pose = supine(0, 0);
    const arm = (e: number) => limb(lerp(180, 268, e), lerp(180, 268, e), lerp(180, 268, e));
    const leg = (e: number) => limb(lerp(180, 100, e), lerp(90, 100, e), lerp(170, 120, e));
    return { pose: { ...pose, armN: arm(n), armF: arm(f), legN: leg(f), legF: leg(n) } };
  },
};

const birdDog: Spec = {
  name: "Bird Dog",
  mode: "loop",
  seconds: 4,
  hands: { N: "palm" },
  primary: ["lower_back", "glutes"],
  secondary: ["abs", "delts_front", "hamstrings"],
  still: 0.25,
  motion: (p) => {
    const n = Math.max(0, Math.sin(2 * Math.PI * p));
    const f = Math.max(0, -Math.sin(2 * Math.PI * p));
    const pose = allFours();
    const reach = (e: number, rest: Limb): Limb => {
      const a = lerp(rest.upper, 92, e);
      return { upper: a, lower: lerp(rest.lower, 92, e), end: lerp(rest.end, 92, e) };
    };
    const kick = (e: number, rest: Limb): Limb => {
      const a = lerp(rest.upper, -88, e);
      return { upper: a, lower: lerp(rest.lower, -88, e), end: lerp(rest.end, -160, e) };
    };
    return {
      pose: {
        ...pose,
        armN: reach(n, pose.armN),
        armF: reach(f, pose.armF),
        legN: kick(f, pose.legN),
        legF: kick(n, pose.legF),
      },
    };
  },
};

const vUp: Spec = {
  name: "V-Up",
  mode: "alternate",
  seconds: 2.6,
  hands: { N: "hand" },
  primary: ["abs"],
  secondary: ["hip_flexors", "obliques"],
  still: 1,
  motion: (p) => {
    const torso = lerp(90, 34, p);
    const legs = lerp(92, 142, p);
    const pose = supine(0, 0, { torso, pelvis: lerp(90, 70, p), head: torso - 6 });
    const arm = lerp(-92, 128, p);
    return { pose: { ...pose, hip: v(0, lerp(-14, -12, p)), armN: limb(arm), armF: limb(arm), ...legsUp(legs) } };
  },
};

const sitUp: Spec = {
  name: "Sit-Up",
  aka: ["Situp"],
  mode: "alternate",
  seconds: 2.6,
  hands: { N: "hand" },
  primary: ["abs"],
  secondary: ["hip_flexors", "obliques"],
  still: 1,
  motion: (p) => {
    const torso = lerp(88, 8, p);
    let pose = supine(0, 0, { torso, pelvis: lerp(90, 40, p), head: torso - 8 });
    pose = plant(pose, "side", v(34, -8));
    return { pose: hold(pose, "side", onTrunk(pose, v(15, -30)), undefined, 1) };
  },
};

// --- Hanging -------------------------------------------------------------------------

const HANG_BAR = v(4, -236);

function hangingRaise(o: { name: string; aka?: string[]; kind: "knee" | "leg" | "toes"; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 2.8,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 1,
    scene: [{ draw: pullUpBar(HANG_BAR), layer: "back" }],
    motion: (p) => {
      const swing = o.kind === "toes" ? lerp(0, 26, p) : lerp(0, 6, p);
      const pose = hangSide(HANG_BAR, { torso: swing, head: swing - 6, reach: 180 + swing * 0.8 });
      const lift = o.kind === "knee" ? lerp(2, 100, p) : o.kind === "leg" ? lerp(2, 94, p) : lerp(2, 168, p);
      const shin = o.kind === "knee" ? lerp(0, 4, p) : lift;
      return { pose: { ...pose, legN: limb(lift, shin, shin + 26), legF: limb(lift - 2, shin - 2, shin + 24) } };
    },
  };
}

// A front lever hangs face-up with the body level, arms straight up to the
// bar. `tuck` folds the knees to the chest.
function leverPose(level: number, tuck: number): Pose {
  const torso = lerp(0, 92, level);
  const arm = lerp(180, 160, level);
  const shoulder = sub(HANG_BAR, rot(v(0, LEN.upperArm + LEN.forearm + LEN.grip), arm));
  const lumbar = sub(shoulder, rot(v(0, -41), torso));
  const hip = sub(lumbar, rot(v(0, -11), torso));
  const pose = base(hip, { torso, pelvis: torso, head: torso - 10 });
  const thigh = lerp(torso, torso + 128, tuck);
  const shin = lerp(torso, torso - 30, tuck);
  return { ...pose, armN: limb(arm), armF: limb(arm), legN: limb(thigh, shin, shin + 30), legF: limb(thigh - 2, shin - 2, shin + 28) };
}

const frontLeverTuck: Spec = {
  name: "Front Lever Tuck",
  aka: ["Tuck Front Lever"],
  mode: "loop",
  seconds: 4,
  hands: { N: "fist" },
  primary: ["lats", "abs"],
  secondary: ["upper_back", "delts_rear", "triceps", "forearms"],
  still: 0.25,
  scene: [{ draw: pullUpBar(HANG_BAR), layer: "back" }],
  motion: (p) => ({ pose: leverPose(1 - breathe(p, 0.04) - 0.02, 1) }),
};

const frontLeverRaise: Spec = {
  name: "Front Lever Raise",
  mode: "alternate",
  seconds: 3.6,
  hands: { N: "fist" },
  primary: ["lats", "abs"],
  secondary: ["upper_back", "triceps", "hip_flexors"],
  still: 1,
  scene: [{ draw: pullUpBar(HANG_BAR), layer: "back" }],
  motion: (p) => ({ pose: leverPose(p, kf(p, [[0, 0], [0.5, 0.9], [1, 1]])) }),
};

const ACROSS = -238;
const windshieldWiper: Spec = {
  name: "Windshield Wiper",
  view: "back",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["obliques", "abs"],
  secondary: ["lats", "hip_flexors", "forearms"],
  still: 0,
  scene: [{ draw: pullUpBarAcross(ACROSS), layer: "back" }],
  motion: (p) => {
    const hangY = ACROSS + 61;
    const pose = base(v(0, hangY + 49), { torso: lerp(-6, 6, p) });
    const sweep = lerp(-74, 74, p);
    const leg = { ...limb(sweep + 180, sweep + 180, sweep + 180), ku: 0.6, kl: 0.6 };
    const arm = limb(180 - 12, 180 - 12, 180 - 12);
    return { pose: { ...pose, armN: arm, armF: mirror(arm), legN: leg, legF: { ...leg, upper: leg.upper + 4, lower: leg.lower + 4 } } };
  },
};

// --- Rollouts and crunches -------------------------------------------------------

const abWheel: Spec = {
  name: "Ab Wheel Rollout",
  aka: ["Ab Rollout"],
  mode: "alternate",
  seconds: 3.2,
  hands: { N: "fist" },
  primary: ["abs"],
  secondary: ["lats", "obliques", "hip_flexors", "triceps"],
  still: 1,
  props: [{ id: "wheel", draw: { svg: `<circle class="iron" r="9"/><circle class="steel" r="2.4"/>`, box: [-9, -9, 9, 9] }, layer: "front" }],
  motion: (p) => {
    const knee = v(0, -6);
    const thigh = lerp(-20, -72, p);
    const torso = lerp(-58, -98, p);
    const hip = sub(knee, rot(v(0, LEN.thigh), thigh));
    let pose = base(hip, { torso, pelvis: lerp(-30, -84, p), head: torso + 16 });
    pose = { ...pose, legN: limb(thigh, -90, -180), legF: limb(thigh, -90, -180) };
    const s = shoulders(pose).N;
    const reach = LEN.upperArm + LEN.forearm + LEN.grip;
    const a = (Math.acos(Math.max(-1, Math.min(1, (-9 - s.y) / reach))) * 180) / Math.PI;
    pose = { ...pose, armN: limb(a), armF: limb(a) };
    return { pose, props: { wheel: at(grips(pose).N) } };
  },
};

const CRUNCH_PULLEY = v(64, -206);
const cableCrunch: Spec = {
  name: "Cable Crunch",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["abs"],
  secondary: ["obliques"],
  still: 1,
  scene: [{ draw: cableTower(CRUNCH_PULLEY.x + 4, CRUNCH_PULLEY), layer: "back" }],
  props: [{ id: "c", draw: cable(), layer: "back" }],
  motion: (p) => {
    const knee = v(0, -6);
    const hip = sub(knee, v(0, LEN.thigh));
    const torso = lerp(-16, -96, p);
    let pose = base(hip, { torso, pelvis: lerp(-4, -22, p), head: torso + 10 });
    pose = { ...pose, legN: limb(0, -90, -180), legF: limb(0, -90, -180) };
    pose = hold(pose, "side", onTrunk(pose, v(15, -50)), undefined, -1);
    return { pose, props: { c: line(CRUNCH_PULLEY, grips(pose).N) } };
  },
};

// --- Rotations ------------------------------------------------------------------------

// Seated, square-on, leaning back with the feet up: thighs and shins point at
// the viewer.
function vSit(): Pose {
  const pose = base(v(0, -16));
  const thigh = { ...limb(150, 210, 200), ku: 0.4, kl: 0.6 };
  return { ...pose, legN: thigh, legF: mirror(thigh) };
}

const russianTwist: Spec = {
  name: "Russian Twist",
  view: "front",
  mode: "alternate",
  seconds: 2.2,
  hands: { N: "fist" },
  primary: ["obliques"],
  secondary: ["abs", "hip_flexors"],
  still: 0,
  props: [{ id: "ball", draw: medBall(8), layer: "front" }],
  motion: (p) => {
    const turn = lerp(-1, 1, p);
    const pose = vSit();
    const torso = turn * 10;
    const armN = { ...limb(30 + turn * 54, 30 + turn * 54), ku: 0.55, kl: 0.55 };
    const armF = { ...limb(-30 + turn * 54, -30 + turn * 54), ku: 0.55, kl: 0.55 };
    const posed = { ...pose, torso, pelvis: torso * 0.2, head: torso * 0.5, armN, armF };
    const g = grips(posed, "front");
    return { pose: posed, props: { ball: at(v((g.N.x + g.F.x) / 2, (g.N.y + g.F.y) / 2)) } };
  },
};

const SIDE_PULLEY = v(84, -128);
const pallofPress: Spec = {
  name: "Pallof Press",
  view: "front",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["obliques", "abs"],
  secondary: ["delts_front", "glutes"],
  still: 1,
  scene: [{ draw: cableTower(SIDE_PULLEY.x + 4, SIDE_PULLEY), layer: "back" }],
  props: [{ id: "c", draw: cable(), layer: "back" }],
  motion: (p) => {
    let pose = standSquare(-90, {}, 16);
    const k = lerp(0.85, 0.32, p);
    const armN = { ...limb(lerp(-30, -46, p), lerp(150, -60, p)), ku: k, kl: k };
    pose = { ...pose, armN, armF: mirror(armN) };
    const g = grips(pose, "front");
    return { pose, props: { c: line(SIDE_PULLEY, v((g.N.x + g.F.x) / 2, (g.N.y + g.F.y) / 2)) } };
  },
};

const HIGH_RIGHT = v(84, -214);
const woodchop: Spec = {
  name: "Cable Woodchop",
  aka: ["Woodchop"],
  view: "front",
  mode: "alternate",
  seconds: 2.6,
  hands: { N: "fist" },
  primary: ["obliques"],
  secondary: ["abs", "delts_front", "glutes"],
  still: 1,
  scene: [{ draw: cableTower(HIGH_RIGHT.x + 4, HIGH_RIGHT), layer: "back" }],
  props: [{ id: "c", draw: cable(), layer: "back" }],
  motion: (p) => {
    const tilt = lerp(-14, 16, p);
    let pose = base(v(lerp(4, -4, p), lerp(-92, -86, p)), { torso: tilt, pelvis: tilt * 0.3, head: tilt * 0.5 });
    pose = plant(pose, "front", v(22, -8), v(-22, -8), {}, 1);
    const target = v(lerp(46, -40, p), lerp(-196, -96, p));
    pose = hold(pose, "front", target, target, -1, 1);
    return { pose, props: { c: line(HIGH_RIGHT, target) } };
  },
};

// --- Hips, square-on --------------------------------------------------------------

const LOW_LEFT = v(-74, -14);
const LOW_RIGHT = v(74, -14);

function cableHip(o: { name: string; abduct: boolean }): Spec {
  return {
    name: o.name,
    view: "front",
    mode: "alternate",
    seconds: 2.6,
    hands: { N: "hand", F: "fist" },
    primary: [o.abduct ? "abductors" : "adductors"],
    secondary: ["glutes", "obliques"],
    still: 1,
    scene: [
      { draw: cableTower((o.abduct ? LOW_LEFT.x : LOW_RIGHT.x) + (o.abduct ? -18 : 4), o.abduct ? LOW_LEFT : LOW_RIGHT), layer: "back" },
    ],
    props: [{ id: "c", draw: cable(), layer: "back" }],
    motion: (p) => {
      const pose = standSquare(-94.4, { torso: o.abduct ? 3 : -3 });
      const a = o.abduct ? lerp(2, 34, p) : lerp(26, -6, p);
      const legN = limb(a, a, a);
      const posed: Pose = { ...pose, legN, armN: limb(14, 30, 30), armF: limb(-40, -60, -60) };
      const j = frontJoints(posed);
      return { pose: posed, props: { c: line(o.abduct ? LOW_LEFT : LOW_RIGHT, add(j.ankleN, v(0, -4))) } };
    },
  };
}

const monsterWalk: Spec = {
  name: "Banded Monster Walk",
  aka: ["Monster Walk", "Lateral Band Walk"],
  view: "front",
  mode: "loop",
  seconds: 1.8,
  samples: 18,
  hands: { N: "hand" },
  primary: ["abductors", "glutes"],
  secondary: ["quads"],
  still: 0.25,
  props: [{ id: "band", draw: { svg: `<path class="band" d="M0 0H1" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "front" }],
  motion: (p) => {
    const stepN = Math.max(0, Math.sin(2 * Math.PI * p));
    const stepF = Math.max(0, -Math.sin(2 * Math.PI * p));
    const shift = Math.sin(2 * Math.PI * p) * 3;
    let pose = base(v(shift, -84), { torso: -shift * 0.4 });
    const aN = v(18 + stepN * 10, -8 - stepN * 6);
    const aF = v(-18 - stepF * 10, -8 - stepF * 6);
    pose = { ...pose, legN: plantLeg(add(pose.hip, v(9, 0)), aN, 0, 1), legF: plantLeg(add(pose.hip, v(-9, 0)), aF, 0, -1) };
    pose = { ...pose, armN: limb(24, 70, 70), armF: mirror(limb(24, 70, 70)) };
    const j = frontJoints(pose);
    return { pose, props: { band: line(add(j.kneeF, v(0, -5)), add(j.kneeN, v(0, -5))) } };
  },
};

// Side-lying, square-on, head to the right: the top knee opens toward the
// ceiling. Thighs and shins point at the viewer.
const clamshell: Spec = {
  name: "Clamshell",
  view: "front",
  mode: "alternate",
  seconds: 2.4,
  hands: { N: "hand" },
  primary: ["abductors", "glutes"],
  still: 1,
  props: [{ id: "band", draw: { svg: `<path class="band" d="M0 0H1" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "front" }],
  motion: (p) => {
    const pose = base(v(0, -17), { torso: -90, pelvis: -90, head: -80 });
    // Hips and knees bent toward the viewer: short thighs, shins running back
    // toward the feet, which stay together while the top knee opens.
    const bottom = { ...limb(-90, -90, -80), ku: 0.45, kl: 0.85 };
    let posed: Pose = { ...pose, legN: bottom, legF: { ...bottom }, armN: limb(92, 96, 96), armF: limb(-82, -90, -90) };
    const feet = frontJoints(posed).ankleN;
    const open = lerp(-90, -150, p);
    const hipF = frontJoints(posed).hipF;
    const kneeF = add(hipF, rot(v(0, 44 * 0.45), open));
    const toFeet = sub(feet, kneeF);
    const shinF = (Math.atan2(toFeet.x, toFeet.y) * 180) / Math.PI;
    posed = { ...posed, legF: { upper: open, lower: shinF, end: shinF + 10, ku: 0.45, kl: Math.hypot(toFeet.x, toFeet.y) / 43 } };
    const j = frontJoints(posed);
    return { pose: posed, props: { band: line(j.kneeN, j.kneeF) } };
  },
};

export const CORE: Spec[] = [
  plank,
  sidePlank,
  copenhagenPlank,
  hollowHold,
  deadBug,
  birdDog,
  vUp,
  sitUp,
  hangingRaise({ name: "Hanging Knee Raise", kind: "knee", primary: ["abs", "hip_flexors"], secondary: ["obliques", "forearms"] }),
  hangingRaise({ name: "Hanging Leg Raise", kind: "leg", primary: ["abs", "hip_flexors"], secondary: ["obliques", "forearms"] }),
  hangingRaise({ name: "Toes-to-Bar", aka: ["Toes to Bar"], kind: "toes", primary: ["abs", "hip_flexors"], secondary: ["lats", "obliques", "forearms"] }),
  frontLeverTuck,
  frontLeverRaise,
  windshieldWiper,
  abWheel,
  cableCrunch,
  russianTwist,
  pallofPress,
  woodchop,
  cableHip({ name: "Hip Abduction", abduct: true }),
  cableHip({ name: "Hip Adduction", abduct: false }),
  monsterWalk,
  clamshell,
];

