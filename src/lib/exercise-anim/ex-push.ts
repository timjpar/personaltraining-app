// Presses, push-ups, dips, flys and the shoulder work.

import {
  barbellFar,
  barbellNear,
  benchUprights,
  box,
  cable,
  cableTower,
  column,
  dipBar,
  dumbbellEnd,
  dumbbellSide,
  flatBench,
  handle,
  ring,
  seat,
  strap,
  wall,
} from "./equipment";
import {
  add,
  at,
  base,
  grips,
  hold,
  kf,
  lerp,
  limb,
  line,
  mirror,
  onTrunk,
  palms,
  plant,
  prone,
  rot,
  seated,
  shoulders,
  stand,
  standSquare,
  sub,
  supine,
  turned,
  v,
  wave,
  type Pose,
  type PropState,
  type Spec,
} from "./kit";
import type { Prop } from "./render";

const barbell = (): Prop[] => [
  { id: "bar", draw: barbellFar(), layer: "back" },
  { id: "bar", draw: barbellNear(), layer: "front" },
];
const dumbbells = (r = 6.5): Prop[] => [
  { id: "dbF", draw: dumbbellEnd(r), layer: "back" },
  { id: "dbN", draw: dumbbellEnd(r), layer: "front" },
];
const sideDumbbells = (): Prop[] => [
  { id: "dbF", draw: dumbbellSide(), layer: "front" },
  { id: "dbN", draw: dumbbellSide(), layer: "front" },
];

// --- Bench presses ------------------------------------------------------------------

const BENCH_TOP = -44;

function benchPress(o: {
  name: string;
  aka?: string[];
  incline?: number;
  load: "barbell" | "dumbbells";
  close?: boolean;
  floor?: boolean;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  const incline = o.incline ?? 0;
  const surface = o.floor ? 0 : BENCH_TOP;
  const scene: Spec["scene"] = o.floor
    ? []
    : incline
      ? [{ draw: seat(-26, 10, BENCH_TOP), layer: "back" }]
      : [
          ...(o.load === "barbell" ? [{ draw: benchUprights(-72, -112), layer: "back" as const }] : []),
          { draw: flatBench(-108, 6, BENCH_TOP), layer: "back" },
        ];
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 3,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.85,
    scene,
    props: [
      ...(incline ? [{ id: "back", draw: backPad(), layer: "back" as const }] : []),
      ...(o.load === "barbell" ? barbell() : dumbbells()),
    ],
    motion: (p) => {
      let pose = supine(surface, 0, { torso: 88 - incline, pelvis: 90 - incline * 0.35, head: 92 - incline });
      pose = plant(pose, "side", o.floor ? v(30, -8) : v(46, -8));
      const s = shoulders(pose).N;
      const top = add(s, v(1.5, -59.5));
      const chest = onTrunk(pose, o.close ? v(19.5, -24) : v(20.5, -28));
      const reach = o.floor ? 0.72 : 1;
      const at1 = v(lerp(top.x, chest.x, p * reach), lerp(top.y, chest.y, p * reach));
      pose = hold(pose, "side", at1, undefined, -1);
      const g = grips(pose);
      const props: Record<string, PropState> =
        o.load === "barbell" ? { bar: at(at1) } : { dbN: at(g.N), dbF: at(add(g.F, v(-2.2, -1))) };
      if (incline) props.back = turned(onTrunk(pose, v(-19.5, -18)), pose.torso);
      return { pose, props };
    },
  };
}

// A back pad that rides along the trunk, for inclined benches: drawn along
// the spine, centred.
const backPad = () => ({
  svg: `<rect class="pad" x="-4" y="-42" width="8" height="80" rx="3.5"/><rect class="frame" x="-1.5" y="30" width="3" height="18"/>`,
  box: [-4, -42, 4, 48] as [number, number, number, number],
});

// Lying on a bench seen from above, for flys: the square-on view with the
// bench drawn behind the trunk. Arms reaching for the ceiling point at the
// viewer, so they foreshorten.
const topBench = (): Spec["scene"] => [
  { draw: { svg: `<rect class="pad" x="-13" y="-184" width="26" height="104" rx="5"/>`, box: [-13, -184, 13, -80] }, layer: "back" },
];

const dumbbellFly: Spec = {
  name: "Dumbbell Fly",
  view: "front",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["chest"],
  secondary: ["delts_front"],
  still: 0.9,
  scene: topBench(),
  props: sideDumbbells(),
  motion: (p) => {
    const out = lerp(-38, 84, p);
    const k = lerp(0.28, 1, p);
    const arm = { ...limb(out, out - 12, out - 12), ku: k, kl: k };
    let pose: Pose = { ...base(v(0, -94.6)), armN: arm, armF: mirror(arm) };
    pose = { ...pose, legN: limb(2), legF: limb(-2) };
    const g = grips(pose, "front");
    return { pose, props: { dbN: turned(g.N, 90), dbF: turned(g.F, 90) } };
  },
};

const HIGH_L = v(-74, -206);
const HIGH_R = v(74, -206);

const cableFly: Spec = {
  name: "Cable Fly",
  aka: ["Cable Crossover"],
  view: "front",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["chest"],
  secondary: ["delts_front"],
  still: 1,
  scene: [
    { draw: cableTower(HIGH_R.x + 6, HIGH_R), layer: "back" },
    { draw: cableTower(HIGH_L.x - 18, HIGH_L), layer: "back" },
  ],
  props: [
    { id: "cN", draw: cable(), layer: "back" },
    { id: "cF", draw: cable(), layer: "back" },
  ],
  motion: (p) => {
    const a = lerp(118, -24, p);
    const arm = { ...limb(a, a - 10, a - 10), ku: lerp(1, 0.9, p), kl: lerp(1, 0.9, p) };
    let pose = standSquare(-94.6, { torso: lerp(0, -4, p) }, 16);
    pose = { ...pose, armN: arm, armF: mirror(arm) };
    const g = grips(pose, "front");
    return { pose, props: { cN: line(HIGH_R, g.N), cF: line(HIGH_L, g.F) } };
  },
};

const pecDeck: Spec = {
  name: "Pec Deck",
  view: "front",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["chest"],
  secondary: ["delts_front"],
  still: 1,
  scene: [{ draw: { svg: `<rect class="pad" x="-16" y="-190" width="32" height="112" rx="5"/>`, box: [-16, -190, 16, -78] }, layer: "back" }],
  motion: (p) => {
    const a = lerp(92, 30, p);
    const k = lerp(1, 0.45, p);
    const arm = { ...limb(a, 178, 178), ku: k };
    let pose = base(v(0, -94.6));
    pose = { ...pose, legN: { ...limb(4, 4, 0), ku: 0.3 }, legF: { ...limb(-4, -4, 0), ku: 0.3 } };
    pose = { ...pose, armN: arm, armF: mirror(arm) };
    return { pose };
  },
};

// --- Push-ups and dips -------------------------------------------------------------

function pushUpSpec(o: {
  name: string;
  aka?: string[];
  incline?: boolean;
  diamond?: boolean;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  const surface = o.incline ? -44 : 0;
  const [high, low] = o.incline ? [40, 28] : [21, 7];
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 2.6,
    hands: { N: "palm" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.85,
    scene: o.incline ? [{ draw: box(-6, 50, surface, "pad"), layer: "back" }] : [],
    motion: (p) => {
      const toe = v(o.incline ? -96 : -62, 0);
      let pose = prone(toe, lerp(high, low, p));
      // Hands stay where they were planted: under the shoulders at the top.
      const top = shoulders(prone(toe, high)).N;
      const palm = v(top.x + (o.diamond ? 7 : 1), surface);
      pose = palms(pose, "side", palm, palm, 90, -1);
      return { pose };
    },
  };
}

// Plank with straight arms, the trunk rising and sinking between the shoulder
// blades. Solved for the tilt that keeps the arms straight.
const scapularPushUp: Spec = {
  name: "Scapular Push-Up",
  mode: "alternate",
  seconds: 2.4,
  hands: { N: "palm" },
  primary: ["upper_back"],
  secondary: ["chest", "abs"],
  still: 1,
  motion: (p) => {
    const toe = v(-62, 0);
    const protract = lerp(-3.5, 4.5, p);
    const palm = v(shoulders(prone(toe, 21)).N.x + 1, 0);
    let lo = 5;
    let hi = 35;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const s = shoulders({ ...prone(toe, mid), protract }).N;
      if (Math.hypot(s.x - palm.x, s.y - palm.y) > 55.6) hi = mid;
      else lo = mid;
    }
    let pose: Pose = { ...prone(toe, lo), protract };
    pose = palms(pose, "side", palm, palm, 90, -1);
    return { pose };
  },
};

const DIP_BAR = -118;

function dip(o: { name: string; rings?: boolean; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  return {
    name: o.name,
    mode: "alternate",
    seconds: 2.8,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.85,
    scene: o.rings ? [] : [{ draw: dipBar(-34, 34, DIP_BAR), layer: "back" }],
    props: o.rings
      ? [
          { id: "sF", draw: strap(), layer: "back" },
          { id: "sN", draw: strap(), layer: "back" },
          { id: "rN", draw: ring(), layer: "front" },
        ]
      : [],
    motion: (p) => {
      const grip = v(4, DIP_BAR);
      const drop = lerp(0, 26, p);
      const torso = lerp(-4, -24, p);
      const shoulder = add(grip, v(-1 - p * 6, -54 + drop));
      const lumbar = sub(shoulder, rot(v(0, -41), torso));
      const hip = sub(lumbar, rot(v(0, -11), torso));
      let pose = base(hip, { torso, pelvis: torso * 0.8, head: torso * 0.6 });
      pose = { ...pose, legN: limb(lerp(4, 24, p), -70, -40), legF: limb(lerp(0, 18, p), -76, -46) };
      pose = hold(pose, "side", grip, undefined, -1);
      const props: Record<string, PropState> = {};
      if (o.rings) {
        props.rN = at(grip);
        props.sN = line(v(grip.x, -260), grip);
        props.sF = line(v(grip.x - 2.2, -260), add(grip, v(-2.2, -1)));
      }
      return { pose, props };
    },
  };
}

// --- Machine and overhead presses -------------------------------------------------

const chestPressMachine: Spec = {
  name: "Chest Press Machine",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["chest"],
  secondary: ["triceps", "delts_front"],
  still: 0.2,
  scene: [
    { draw: column(-44, -200), layer: "back" },
    { draw: seat(-14, 30, -50, -150), layer: "back" },
  ],
  props: [{ id: "h", draw: handle(), layer: "front" }],
  motion: (p) => {
    let pose = seated(-50, 34, { torso: 4, head: 2 });
    const s = shoulders(pose).N;
    const g = add(s, v(lerp(56, 18, p), lerp(4, 8, p)));
    pose = hold(pose, "side", g, undefined, -1);
    return { pose, props: { h: at(g) } };
  },
};

const shoulderPressMachine: Spec = {
  name: "Shoulder Press Machine",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["delts_front", "delts_side"],
  secondary: ["triceps", "traps"],
  still: 0.2,
  scene: [{ draw: seat(-14, 30, -50, -150), layer: "back" }],
  props: [{ id: "h", draw: handle(), layer: "front" }],
  motion: (p) => {
    let pose = seated(-50, 34, { torso: 4, head: 2 });
    const s = shoulders(pose).N;
    const g = add(s, v(lerp(6, 10, p), lerp(-58, -12, p)));
    pose = hold(pose, "side", g, undefined, -1);
    return { pose, props: { h: at(g) } };
  },
};

// A bar from the front rack to overhead lockout. `dip` adds the push press's
// knee dip and drive, which turns it into a loop.
function overheadPress(o: { name: string; dip?: boolean; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  return {
    name: o.name,
    mode: o.dip ? "loop" : "alternate",
    seconds: o.dip ? 3 : 3.2,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: o.dip ? 0.55 : 0.2,
    props: barbell(),
    motion: (p) => {
      // up: 0 at the rack, 1 locked out.
      const up = o.dip ? kf(p, [[0, 0], [0.22, 0], [0.5, 1], [0.75, 1], [1, 0]]) : 1 - p;
      const dip = o.dip ? kf(p, [[0, 0], [0.14, 1], [0.28, 0], [1, 0]]) : 0;
      const head = kf(up, [[0, -2], [0.35, 8], [0.7, 0], [1, -4]]);
      const probe = (pose: Pose) => shoulders(pose).N;
      let pose = stand(lerp(-94.4, -84, dip), { torso: -2 + dip * -4, pelvis: -2, head }, { probe, over: 6 });
      const s = shoulders(pose).N;
      const rack = onTrunk(pose, v(18, -40));
      const top = add(s, v(-1.5, -59.5));
      const bar = v(lerp(rack.x, top.x, up), lerp(rack.y, top.y, up));
      pose = hold(pose, "side", bar, undefined, -1);
      return { pose, props: { bar: at(bar) } };
    },
  };
}

// Seated, square-on: thighs point at the viewer.
function seatedSquare(): Pose {
  const pose = base(v(0, -60));
  const thigh = { ...limb(14, 4, 0), ku: 0.3 };
  return { ...pose, legN: thigh, legF: mirror(thigh) };
}

const dumbbellShoulderPress: Spec = {
  name: "Dumbbell Shoulder Press",
  view: "front",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["delts_front", "delts_side"],
  secondary: ["triceps", "traps"],
  still: 0.2,
  scene: [
    { draw: { svg: `<rect class="pad" x="-15" y="-150" width="30" height="92" rx="5"/>`, box: [-15, -150, 15, -58] }, layer: "back" },
    { draw: seat(-24, 24, -50), layer: "back" },
  ],
  props: [
    { id: "dbN", draw: dumbbellSide(), layer: "front" },
    { id: "dbF", draw: dumbbellSide(), layer: "front" },
  ],
  motion: (p) => {
    const q = 1 - p;
    const upper = lerp(82, 168, q);
    const lower = lerp(176, 186, q);
    const arm = limb(upper, lower, lower);
    const pose = { ...seatedSquare(), armN: arm, armF: mirror(arm) };
    const g = grips(pose, "front");
    return { pose, props: { dbN: at(g.N), dbF: at(g.F) } };
  },
};

const arnoldPress: Spec = {
  name: "Arnold Press",
  view: "front",
  mode: "alternate",
  seconds: 3.4,
  hands: { N: "fist" },
  primary: ["delts_front", "delts_side"],
  secondary: ["triceps"],
  still: 1,
  scene: [{ draw: seat(-24, 24, -50), layer: "back" }],
  props: [
    { id: "dbN", draw: dumbbellSide(), layer: "front" },
    { id: "dbF", draw: dumbbellSide(), layer: "front" },
  ],
  motion: (p) => {
    // In front of the face, elbows forward → elbows open out → press.
    const upper = kf(p, [[0, -16], [0.45, 82], [1, 168]]);
    const ku = kf(p, [[0, 0.3], [0.45, 1], [1, 1]]);
    const lower = kf(p, [[0, 178], [0.45, 178], [1, 186]]);
    const arm = { ...limb(upper, lower, lower), ku };
    const pose = { ...seatedSquare(), armN: arm, armF: mirror(arm) };
    const g = grips(pose, "front");
    const turn = kf(p, [[0, 90], [0.45, 0], [1, 0]]);
    return { pose, props: { dbN: turned(g.N, turn), dbF: turned(g.F, -turn) } };
  },
};

const lateralRaise: Spec = {
  name: "Dumbbell Lateral Raise",
  view: "front",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["delts_side"],
  secondary: ["delts_front", "traps"],
  still: 0.85,
  props: [
    { id: "dbN", draw: dumbbellEnd(6.5), layer: "front" },
    { id: "dbF", draw: dumbbellEnd(6.5), layer: "front" },
  ],
  motion: (p) => {
    const raise = lerp(8, 84, p);
    const arm = limb(raise, raise - 6, raise - 6);
    const pose: Pose = { ...standSquare(), armN: arm, armF: mirror(arm) };
    const g = grips(pose, "front");
    return { pose, props: { dbN: at(g.N), dbF: at(g.F) } };
  },
};

const LOW_L = v(-70, -14);
const cableLateralRaise: Spec = {
  name: "Cable Lateral Raise",
  view: "front",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist", F: "hand" },
  primary: ["delts_side"],
  secondary: ["delts_front", "traps"],
  still: 0.85,
  scene: [{ draw: cableTower(LOW_L.x - 18, LOW_L), layer: "back" }],
  props: [{ id: "c", draw: cable(), layer: "back" }],
  motion: (p) => {
    const raise = lerp(-14, 82, p);
    const arm = limb(raise, raise - 6, raise - 6);
    const pose: Pose = { ...standSquare(-94.6, { torso: 3 }), armN: arm, armF: limb(-26, 48, 48) };
    const g = grips(pose, "front");
    return { pose, props: { c: line(LOW_L, g.N) } };
  },
};

// Bent over, arms swinging out to the sides: from the side they swing toward
// the viewer, so they shorten as they rise.
const rearDeltFly: Spec = {
  name: "Rear Delt Fly",
  aka: ["Reverse Fly"],
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["delts_rear", "upper_back"],
  secondary: ["traps"],
  still: 1,
  props: [
    { id: "dbF", draw: dumbbellSide(), layer: "back" },
    { id: "dbN", draw: dumbbellSide(), layer: "front" },
  ],
  motion: (p) => {
    const probe = (pose: Pose) => shoulders(pose).N;
    let pose = stand(-86, { torso: -70, pelvis: -60, head: -50 }, { probe, over: 12 });
    const k = lerp(1, 0.16, p);
    const arm = { ...limb(lerp(2, -14, p), lerp(8, -14, p), lerp(8, -14, p)), ku: k, kl: k };
    pose = { ...pose, armN: arm, armF: { ...arm } };
    const g = grips(pose);
    return { pose, props: { dbN: turned(g.N, 90), dbF: turned(add(g.F, v(-2.2, -1)), 90) } };
  },
};

const FACE_PULLEY = v(84, -152);
const facePull: Spec = {
  name: "Face Pull",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["delts_rear", "upper_back"],
  secondary: ["traps", "biceps"],
  still: 1,
  scene: [{ draw: cableTower(FACE_PULLEY.x + 6, FACE_PULLEY), layer: "back" }],
  props: [{ id: "c", draw: cable(), layer: "back" }],
  motion: (p) => {
    let pose = stand(-94.4, { torso: 3, head: 0 }, { ankleN: v(-6, -8), ankleF: v(-14, -8) });
    const s = shoulders(pose).N;
    const g = add(s, v(lerp(56, 14, p), lerp(-6, -20, p)));
    pose = hold(pose, "side", g, undefined, 1);
    const upperK = lerp(1, 0.55, p);
    pose = { ...pose, armN: { ...pose.armN, ku: upperK }, armF: { ...pose.armF, ku: upperK } };
    return { pose, props: { c: line(FACE_PULLEY, grips(pose).N) } };
  },
};

// --- Handstands ------------------------------------------------------------------

function handstand(o: { name: string; push?: boolean; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  return {
    name: o.name,
    mode: o.push ? "alternate" : "loop",
    seconds: o.push ? 3 : 4,
    hands: { N: "palm" },
    primary: o.primary,
    secondary: o.secondary,
    still: o.push ? 0 : 0.25,
    scene: o.push ? [{ draw: wall(-34, -220), layer: "back" }] : [],
    motion: (p) => {
      const sway = o.push ? 0 : (wave(p) - 0.5) * 3;
      const drop = o.push ? lerp(0, 24, p) : 0;
      const palm = v(0, 0);
      const shoulder = v(palm.x - 2 + sway * 0.4, -55.6 + drop);
      const torso = 180 + sway - (o.push ? p * 6 : 0);
      const lumbar = sub(shoulder, rot(v(0, -41), torso));
      const hip = sub(lumbar, rot(v(0, -11), torso));
      let pose = base(hip, { torso, pelvis: torso, head: torso + 12 });
      pose = { ...pose, legN: limb(180 + sway * 1.4, 180 + sway * 1.6, 160), legF: limb(178 + sway * 1.4, 178 + sway * 1.6, 158) };
      pose = palms(pose, "side", palm, palm, 90, 1);
      return { pose };
    },
  };
}

export const PUSH: Spec[] = [
  benchPress({ name: "Bench Press", load: "barbell", primary: ["chest"], secondary: ["triceps", "delts_front"] }),
  benchPress({ name: "Incline Bench Press", load: "barbell", incline: 32, primary: ["chest", "delts_front"], secondary: ["triceps"] }),
  benchPress({ name: "Close-Grip Bench Press", load: "barbell", close: true, primary: ["triceps", "chest"], secondary: ["delts_front"] }),
  benchPress({ name: "Floor Press", load: "barbell", floor: true, primary: ["chest", "triceps"], secondary: ["delts_front"] }),
  benchPress({ name: "Dumbbell Bench Press", load: "dumbbells", primary: ["chest"], secondary: ["triceps", "delts_front"] }),
  benchPress({ name: "Incline Dumbbell Press", load: "dumbbells", incline: 32, primary: ["chest", "delts_front"], secondary: ["triceps"] }),
  dumbbellFly,
  cableFly,
  pecDeck,
  chestPressMachine,
  pushUpSpec({ name: "Push-Up", aka: ["Push Up"], primary: ["chest", "triceps"], secondary: ["delts_front", "abs"] }),
  pushUpSpec({ name: "Incline Push-Up", incline: true, primary: ["chest", "triceps"], secondary: ["delts_front"] }),
  pushUpSpec({ name: "Diamond Push-Up", diamond: true, primary: ["triceps", "chest"], secondary: ["delts_front"] }),
  scapularPushUp,
  dip({ name: "Dip", primary: ["chest", "triceps"], secondary: ["delts_front"] }),
  dip({ name: "Ring Dip", rings: true, primary: ["chest", "triceps"], secondary: ["delts_front", "abs"] }),
  overheadPress({ name: "Overhead Press", primary: ["delts_front", "delts_side"], secondary: ["triceps", "traps", "abs"] }),
  overheadPress({ name: "Push Press", dip: true, primary: ["delts_front", "delts_side", "triceps"], secondary: ["quads", "glutes"] }),
  shoulderPressMachine,
  dumbbellShoulderPress,
  arnoldPress,
  lateralRaise,
  cableLateralRaise,
  rearDeltFly,
  facePull,
  handstand({ name: "Handstand Hold", primary: ["delts_front", "triceps"], secondary: ["traps", "abs", "forearms"] }),
  handstand({ name: "Handstand Push-Up", push: true, primary: ["delts_front", "triceps"], secondary: ["traps", "chest"] }),
];

