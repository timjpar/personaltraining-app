// The Olympic lifts and their variants, jerks, thrusters, and the
// kettlebell skills (clean, snatch, get-up, windmill).

import { barbellFar, barbellNear, dumbbellEnd, kettlebell } from "./equipment";
import {
  add,
  at,
  base,
  grips,
  hold,
  kf,
  kfv,
  lerp,
  limb,
  onTrunk,
  plant,
  plantLeg,
  rot,
  seq,
  shoulders,
  stand,
  supine,
  turned,
  v,
  type Limb,
  type Pose,
  type Spec,
  type V,
} from "./kit";
import type { Frame, Prop } from "./render";

const barbell = (): Prop[] => [
  { id: "bar", draw: barbellFar(), layer: "back" },
  { id: "bar", draw: barbellNear(), layer: "front" },
];

const BAR_IN_FRONT = v(13, -37);

// One key of a lift: where the body is, where the feet are, and where the bar
// is — either free (pulled from the floor, with arms reaching for it), racked
// on the front of the shoulders, or locked out overhead.
type Key = {
  t: number;
  hip: V;
  torso: number;
  pelvis?: number;
  head?: number;
  ankleN?: V;
  ankleF?: V;
  footN?: number;
  footF?: number;
  bar?: V; // free bar position
  rack?: number; // 0..1
  over?: number; // 0..1
  shrug?: number;
};

const FEET = v(0, -8);

// Where the hip sits with plumb arms holding a bar at `bar`.
function hipUnder(bar: V, torso: number, pelvis = torso * 0.95): V {
  const off = add(rot(v(0, -11), pelvis), rot(v(0, -41), torso));
  return v(bar.x - off.x, bar.y - 61.6 - off.y);
}

function lift(keys: Key[], p: number): { pose: Pose; bar: V } {
  const track = (f: (k: Key) => number) => kf(p, keys.map((k) => [k.t, f(k)]));
  const trackV = (f: (k: Key) => V) => kfv(p, keys.map((k) => [k.t, f(k)]));
  const torso = track((k) => k.torso);
  const pose0 = base(trackV((k) => k.hip), {
    torso,
    pelvis: track((k) => k.pelvis ?? k.torso * 0.9),
    head: track((k) => k.head ?? k.torso * 0.5),
    shrug: track((k) => k.shrug ?? 0),
  });
  let pose: Pose = {
    ...pose0,
    legN: plantLeg(pose0.hip, trackV((k) => k.ankleN ?? FEET), track((k) => k.footN ?? 0), 1),
    legF: plantLeg(pose0.hip, trackV((k) => k.ankleF ?? k.ankleN ?? FEET), track((k) => k.footF ?? k.footN ?? 0), 1),
  };
  const rackW = track((k) => k.rack ?? 0);
  const overW = track((k) => k.over ?? 0);
  const free = trackV((k) => k.bar ?? v(0, 0));
  const s = shoulders(pose).N;
  const rackAt = onTrunk(pose, BAR_IN_FRONT);
  const overAt = add(s, v(-3, -59.5));
  const freeW = Math.max(0, 1 - rackW - overW);
  const bar = v(
    free.x * freeW + rackAt.x * rackW + overAt.x * overW,
    free.y * freeW + rackAt.y * rackW + overAt.y * overW,
  );
  const reach = hold(pose, "side", bar, undefined, -1);
  const racked: Limb = limb(torso + 96, torso + 96 + 168, torso + 96 + 168);
  const mix = (a: Limb, b: Limb, w: number): Limb => ({
    upper: lerp(a.upper, b.upper, w),
    lower: lerp(a.lower, b.lower, w),
    end: lerp(a.end, b.end, w),
  });
  const w = rackW / Math.max(0.0001, rackW + freeW + overW);
  pose = { ...pose, armN: mix(reach.armN, racked, w), armF: mix(reach.armF, racked, w) };
  return { pose, bar };
}

// Standard keys, built from the bar's height where the arms hang plumb.
const pullKey = (t: number, bar: V, torso: number, extra: Partial<Key> = {}): Key => ({
  t,
  hip: hipUnder(bar, torso),
  torso,
  bar,
  ...extra,
});

const FLOOR = (t: number) => pullKey(t, v(8, -22), -54);
const KNEE = (t: number) => pullKey(t, v(8, -52), -46);
const THIGH = (t: number) => pullKey(t, v(9, -80), -22);
const HANG = (t: number) => pullKey(t, v(10, -84), -6);
const EXTEND = (t: number, bar: V): Key => ({
  t,
  hip: v(-3, -99),
  torso: 6,
  pelvis: 4,
  head: 0,
  bar,
  ankleN: v(0, -14),
  footN: -30,
  shrug: 5,
});
const RACK_STAND = (t: number): Key => ({ t, hip: v(1, -94.2), torso: -3, rack: 1 });
const RACK_DIP = (t: number): Key => ({ t, hip: v(-1, -84), torso: -4, rack: 1 });
const OVER_STAND = (t: number): Key => ({ t, hip: v(1, -94.2), torso: -2, over: 1 });

const catchClean = (t: number, power: boolean): Key =>
  power ? { t, hip: v(-10, -80), torso: -14, rack: 1 } : { t, hip: v(-20, -49), torso: -24, rack: 1 };
const catchSnatch = (t: number, power: boolean): Key =>
  power ? { t, hip: v(-8, -80), torso: -10, over: 1 } : { t, hip: v(-17, -48), torso: -16, over: 1 };

function liftSpec(o: {
  name: string;
  aka?: string[];
  seconds: number;
  keys: Key[];
  still: number;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
  dumbbells?: boolean;
}): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "loop",
    seconds: o.seconds,
    samples: Math.round(o.seconds * 10),
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: o.still,
    props: o.dumbbells
      ? [
          { id: "dbF", draw: dumbbellEnd(6.5), layer: "back" },
          { id: "dbN", draw: dumbbellEnd(6.5), layer: "front" },
        ]
      : barbell(),
    motion: (p): Frame => {
      const { pose, bar } = lift(o.keys, p);
      if (!o.dumbbells) return { pose, props: { bar: at(bar) } };
      const g = grips(pose);
      return { pose, props: { dbN: at(g.N), dbF: at(add(g.F, v(-2.2, -1))) } };
    },
  };
}

const CLEAN_MUSCLES = { primary: ["glutes", "quads", "traps"] as Spec["primary"], secondary: ["hamstrings", "lower_back", "delts_front", "calves"] as Spec["secondary"] };
const SNATCH_MUSCLES = { primary: ["glutes", "quads", "traps", "delts_front"] as Spec["primary"], secondary: ["hamstrings", "lower_back", "upper_back", "triceps"] as Spec["secondary"] };

function clean(name: string, from: "floor" | "hang", power: boolean, aka?: string[]): Spec {
  const start = from === "floor" ? [FLOOR(0), KNEE(0.2), THIGH(0.32)] : [HANG(0), THIGH(0.2)];
  const tE = from === "floor" ? 0.4 : 0.28;
  return liftSpec({
    name,
    aka,
    seconds: from === "floor" ? 3.6 : 3,
    still: tE + 0.12,
    ...CLEAN_MUSCLES,
    keys: [
      ...start,
      EXTEND(tE, v(12, -98)),
      catchClean(tE + 0.12, power),
      RACK_STAND(tE + 0.32),
      RACK_STAND(tE + 0.44),
      { ...(from === "floor" ? FLOOR(1) : HANG(1)) },
    ],
  });
}

function snatch(name: string, from: "floor" | "hang", power: boolean): Spec {
  const start = from === "floor" ? [FLOOR(0), KNEE(0.2), THIGH(0.32)] : [HANG(0), THIGH(0.2)];
  const tE = from === "floor" ? 0.4 : 0.28;
  return liftSpec({
    name,
    seconds: from === "floor" ? 3.6 : 3,
    still: tE + 0.14,
    ...SNATCH_MUSCLES,
    keys: [
      ...start,
      EXTEND(tE, v(12, -96)),
      catchSnatch(tE + 0.14, power),
      OVER_STAND(tE + 0.34),
      OVER_STAND(tE + 0.44),
      { ...(from === "floor" ? FLOOR(1) : HANG(1)) },
    ],
  });
}

function pull(name: string, snatchGrip: boolean): Spec {
  return liftSpec({
    name,
    seconds: 2.6,
    still: 0.5,
    primary: ["glutes", "hamstrings", "traps"],
    secondary: ["quads", "lower_back", "forearms", "calves"],
    keys: [FLOOR(0), KNEE(0.25), THIGH(0.4), EXTEND(0.52, v(12, snatchGrip ? -94 : -98)), THIGH(0.7), FLOOR(1)],
  });
}

const SPLIT_FRONT = v(30, -8);
const SPLIT_BACK = v(-34, -15);

const jerkKeys = (t0: number, split: boolean, span = 1 - t0): Key[] => {
  const at1 = (f: number) => t0 + span * f;
  const catchKey: Key = split
    ? { t: at1(0.42), hip: v(-2, -82), torso: -2, over: 1, ankleN: SPLIT_FRONT, ankleF: SPLIT_BACK, footF: -50 }
    : { t: at1(0.42), hip: v(-1, -84), torso: -4, over: 1 };
  return [
    RACK_STAND(at1(0)),
    RACK_DIP(at1(0.16)),
    { t: at1(0.3), hip: v(1, -97), torso: -2, rack: 0.4, over: 0.6, ankleN: v(0, -12), footN: -22 },
    catchKey,
    { ...OVER_STAND(at1(0.62)) },
    { ...OVER_STAND(at1(0.74)) },
    RACK_STAND(at1(1)),
  ];
};

const thrusterKeys = (): Key[] => [
  RACK_STAND(0),
  { t: 0.3, hip: v(-20, -49), torso: -24, rack: 1 },
  { t: 0.5, hip: v(1, -94.2), torso: -2, rack: 0.3, over: 0.7 },
  OVER_STAND(0.62),
  OVER_STAND(0.72),
  RACK_STAND(0.9),
  RACK_STAND(1),
];

// --- Kettlebells -----------------------------------------------------------------

function kbSkill(o: { name: string; overhead: boolean }): Spec {
  return {
    name: o.name,
    mode: "loop",
    seconds: 2.4,
    samples: 24,
    hands: { N: "fist", F: "hand" },
    primary: o.overhead ? ["glutes", "delts_front", "hamstrings"] : ["glutes", "hamstrings"],
    secondary: o.overhead ? ["traps", "triceps", "abs"] : ["biceps", "forearms", "delts_front"],
    still: 0.55,
    props: [{ id: "kb", draw: kettlebell(), layer: "front" }],
    motion: (p) => {
      const down = kf(p, [[0, 1], [0.3, 0], [0.75, 0], [1, 1]]);
      const torso = lerp(-3, -60, down);
      const probe = (pose: Pose) => shoulders(pose).N;
      let pose = stand(lerp(-94.4, -84, down), { torso, pelvis: torso * 0.9, head: torso * 0.5 }, { probe, over: lerp(2, 16, down) });
      const top = o.overhead ? limb(178, 178, 178) : limb(-8, 168, 168);
      const swing = limb(lerp(-2, -30, down), lerp(-2, -30, down), lerp(-2, -30, down));
      const up = kf(p, [[0, 0], [0.22, 0], [0.4, 1], [0.7, 1], [0.85, 0], [1, 0]]);
      const arm: Limb = {
        upper: lerp(swing.upper, top.upper, up),
        lower: lerp(swing.lower, top.lower, up),
        end: lerp(swing.end, top.end, up),
      };
      pose = { ...pose, armN: arm, armF: limb(lerp(4, 10, up), lerp(20, 30, up)) };
      const g = grips(pose).N;
      // Hanging from the hand on the swing; resting on the forearm once caught.
      const bell = lerp(arm.end, o.overhead ? 0 : arm.end - 150, up);
      return { pose, props: { kb: turned(g, bell) } };
    },
  };
}

// The get-up, played up and back down. Each key is a full pose; the ones on
// the floor share the hip and the planted foot so nothing slides.
const getUp: Spec = (() => {
  const floorHip = v(0, -14);
  const kneeFoot = v(32, -8);
  const kbArm = limb(180, 180, 180);
  const lying: Pose = (() => {
    let p0 = supine(0, 0, { torso: 90, pelvis: 90, head: 92 });
    p0 = { ...p0, legN: plantLeg(floorHip, kneeFoot, 0, 1), legF: limb(90, 90, 90) };
    return { ...p0, armN: kbArm, armF: { ...limb(92, 92, 92), ku: 0.75, kl: 0.75 } };
  })();
  const elbow: Pose = { ...lying, torso: 55, head: 60, armF: { ...limb(14, 92, 92), kl: 0.75 } };
  const hand: Pose = { ...lying, torso: 28, head: 30, armF: limb(4, 4, 90) };
  const bridgeHip = v(6, -42);
  const bridge: Pose = {
    ...hand,
    hip: bridgeHip,
    pelvis: 60,
    torso: 18,
    head: 18,
    legN: plantLeg(bridgeHip, kneeFoot, 0, 1),
    legF: plantLeg(bridgeHip, v(62, -8), 90, -1),
    armF: limb(6, 6, 90),
  };
  const kneelHip = v(0, -50);
  const sweep: Pose = {
    ...bridge,
    hip: kneelHip,
    pelvis: 0,
    torso: 14,
    head: 6,
    legN: plantLeg(kneelHip, kneeFoot, 0, 1),
    legF: limb(-6, -90, -180),
    armF: limb(8, 8, 90),
  };
  const kneel: Pose = { ...sweep, torso: 0, head: 0, armF: limb(-8, 10, 10) };
  const standHip = v(18, -94.2);
  const up: Pose = {
    ...kneel,
    hip: standHip,
    legN: plantLeg(standHip, v(20, -8), 0, 1),
    legF: plantLeg(standHip, v(20, -8), 0, 1),
    armF: limb(2, 10, 10),
  };
  return {
    name: "Turkish Get-Up",
    mode: "alternate",
    seconds: 9,
    samples: 30,
    hands: { N: "fist", F: "palm" },
    primary: ["delts_front", "abs", "glutes"],
    secondary: ["obliques", "triceps", "quads", "traps"],
    still: 0.62,
    props: [{ id: "kb", draw: kettlebell(), layer: "front" }],
    motion: (p) => {
      const pose = seq(p, [
        [0, lying],
        [0.15, elbow],
        [0.3, hand],
        [0.45, bridge],
        [0.6, sweep],
        [0.72, kneel],
        [1, up],
      ]);
      const fixed = { ...pose, armN: kbArm };
      return { pose: fixed, props: { kb: turned(grips(fixed).N, 0) } };
    },
  };
})();

const windmill: Spec = {
  name: "Kettlebell Windmill",
  view: "front",
  mode: "alternate",
  seconds: 3.6,
  hands: { N: "fist", F: "hand" },
  primary: ["obliques", "delts_side"],
  secondary: ["hamstrings", "glutes", "abs"],
  still: 1,
  props: [{ id: "kb", draw: kettlebell(), layer: "front" }],
  motion: (p) => {
    const tilt = lerp(0, 62, p);
    let pose = base(v(lerp(0, 12, p), lerp(-94, -90, p)), { torso: tilt, pelvis: tilt * 0.35, head: tilt * 0.8 });
    pose = plant(pose, "front", v(22, -8), v(-22, -8), {}, 1);
    pose = { ...pose, armN: limb(180, 180, 180), armF: limb(lerp(-8, 6, p), lerp(-4, 4, p)) };
    return { pose, props: { kb: turned(grips(pose, "front").N, 0) } };
  },
};

// An empty-bar flow: hang, hinge, stand, front squat, press.
const emptyBar: Spec = liftSpec({
  name: "Empty Bar Warm-Up",
  seconds: 5,
  still: 0.75,
  primary: ["quads", "glutes", "delts_front"],
  secondary: ["hamstrings", "lower_back", "triceps"],
  keys: [
    HANG(0),
    pullKey(0.15, v(10, -54), -70),
    HANG(0.3),
    RACK_STAND(0.42),
    { t: 0.56, hip: v(-20, -49), torso: -24, rack: 1 },
    RACK_STAND(0.68),
    OVER_STAND(0.8),
    RACK_STAND(0.9),
    HANG(1),
  ],
});

export const OLYMPIC: Spec[] = [
  clean("Clean", "floor", false, ["Squat Clean"]),
  clean("Power Clean", "floor", true),
  clean("Hang Clean", "hang", false),
  clean("Hang Power Clean", "hang", true),
  pull("Clean Pull", false),
  snatch("Snatch", "floor", false),
  snatch("Power Snatch", "floor", true),
  snatch("Hang Snatch", "hang", false),
  pull("Snatch Pull", true),
  liftSpec({
    name: "Clean & Jerk",
    aka: ["Clean and Jerk"],
    seconds: 6,
    still: 0.78,
    primary: ["glutes", "quads", "traps", "delts_front"],
    secondary: ["hamstrings", "triceps", "lower_back"],
    keys: [FLOOR(0), KNEE(0.1), THIGH(0.16), EXTEND(0.2, v(12, -98)), catchClean(0.26, false), RACK_STAND(0.4), ...jerkKeys(0.45, true, 0.45).slice(1), FLOOR(1)],
  }),
  liftSpec({ name: "Split Jerk", aka: ["Jerk"], seconds: 3.4, still: 0.42, primary: ["delts_front", "triceps", "quads"], secondary: ["glutes", "traps", "abs"], keys: jerkKeys(0, true) }),
  liftSpec({ name: "Push Jerk", seconds: 3.2, still: 0.42, primary: ["delts_front", "triceps", "quads"], secondary: ["glutes", "traps"], keys: jerkKeys(0, false) }),
  liftSpec({ name: "Thruster", seconds: 3, still: 0.62, primary: ["quads", "delts_front", "glutes"], secondary: ["triceps", "abs"], keys: thrusterKeys() }),
  liftSpec({ name: "Dumbbell Thruster", seconds: 3, still: 0.62, primary: ["quads", "delts_front", "glutes"], secondary: ["triceps", "abs"], keys: thrusterKeys(), dumbbells: true }),
  kbSkill({ name: "Kettlebell Clean", overhead: false }),
  kbSkill({ name: "Kettlebell Snatch", overhead: true }),
  getUp,
  windmill,
  emptyBar,
];
