// Presses, push-ups, dips, flys and the shoulder work.

import {
  barbellAcross,
  barbellFar,
  barbellNear,
  barLine,
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
  landmineBase,
  plateEdge,
  plateStack,
  ring,
  seat,
  strap,
  wall,
} from "./equipment";
import {
  add,
  aroundBar,
  at,
  base,
  dirAngle,
  FOOT,
  gripArm,
  grips,
  hold,
  holdBehind,
  joints,
  kf,
  LEN,
  lerp,
  lerpV,
  limb,
  line,
  mirror,
  negative,
  onTrunk,
  palms,
  plant,
  plantLeg,
  prone,
  rot,
  seated,
  seq,
  shoulders,
  stand,
  standSquare,
  sub,
  supine,
  turned,
  v,
  wave,
  type Limb,
  type Pose,
  type PropState,
  type Spec,
  type V,
} from "./kit";
import type { Prop } from "./render";

const barbell = (plate?: number): Prop[] => [
  { id: "bar", draw: barbellFar(plate), layer: "back" },
  { id: "bar", draw: barbellNear(plate), layer: "front" },
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

// How high the plates under a deficit push-up's hands stand.
const DEFICIT = 10;

function pushUpSpec(o: {
  name: string;
  aka?: string[];
  incline?: boolean;
  diamond?: boolean;
  // Hands raised on plates, feet on the floor. The bottom is the floor
  // push-up's, so the chest sinks past the hands by the plates' height.
  deficit?: boolean;
  // One hand only, the other folded on the lower back.
  oneArm?: boolean;
  // The far hand planted wide and its arm kept long, so the near arm does
  // the work. Side-on, "wide" reads as further ahead.
  archer?: boolean;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  const surface = o.incline ? -44 : o.deficit ? -DEFICIT : 0;
  const low = o.incline ? 28 : 7;
  const toe = v(o.incline ? -96 : -62, 0);
  // Hands stay where they were planted: under the shoulders at the top. The
  // top is solved for the tilt that just straightens the arms there, since a
  // steeper one leaves the palms hovering over the floor.
  const ahead = o.diamond ? 7 : 1;
  const reach = LEN.upperArm + LEN.forearm - 0.4;
  let high = low;
  let hi = 60;
  for (let i = 0; i < 30; i++) {
    const mid = (high + hi) / 2;
    const s = shoulders(prone(toe, mid)).N;
    if (Math.hypot(ahead, s.y - (surface - LEN.palm)) > reach) hi = mid;
    else high = mid;
  }
  const palm = v(shoulders(prone(toe, high)).N.x + ahead, surface);
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: o.deficit ? 3 : 2.6,
    hands: { N: "palm" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.85,
    scene: o.incline
      ? [{ draw: box(-6, 50, surface, "pad"), layer: "back" }]
      : o.deficit
        ? [{ draw: plateStack(palm.x, surface), layer: "back" }]
        : [],
    motion: (p) => {
      let pose = prone(toe, lerp(high, low, p));
      const far = o.archer ? add(palm, v(20, 0)) : palm;
      pose = palms(pose, "side", palm, far, 90, -1);
      if (o.oneArm) {
        const body = pose.torso;
        pose = { ...pose, armF: limb(body - 42, body - 4, body - 4) };
      }
      return { pose };
    },
  };
}

// Hips high in an inverted V, the head lowering to the floor in front of the
// hands: the handstand push-up's line with the feet still on the ground, or on
// a box when `elevated`.
function pikePushUp(o: { name: string; elevated?: boolean; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  // The hips stay high and nearly still; the trunk tips from the hips so the
  // head travels down to the floor in front of the hands. Torso angles are
  // past horizontal, leaning forward: head down and towards the hands.
  const hipAt = (p: number) => (o.elevated ? v(lerp(-10, -6, p), lerp(-105.6, -86, p)) : v(-10, lerp(-89, -86, p)));
  const torsoAt = (p: number) => (o.elevated ? lerp(-165, -172, p) : lerp(-130, -160, p));
  const shoulderAt = (p: number) => add(hipAt(p), rot(v(0, -52), torsoAt(p)));
  // Palms where the arms are straight at the top; feet where the legs are.
  const s0 = shoulderAt(0);
  const palm = v(s0.x + Math.sqrt(Math.max(0, (LEN.upperArm + LEN.forearm - 0.4) ** 2 - (s0.y + LEN.palm) ** 2)), 0);
  const feetTop = o.elevated ? -44 : 0;
  const h0 = hipAt(0);
  const legLen = LEN.thigh + LEN.shin - 1;
  const ankle = v(h0.x - Math.sqrt(Math.max(0, legLen ** 2 - (feetTop - 8 - h0.y) ** 2)), feetTop - 8);
  return {
    name: o.name,
    mode: "alternate",
    seconds: 2.8,
    hands: { N: "palm" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.8,
    scene: o.elevated ? [{ draw: box(ankle.x - 26, ankle.x + 14, feetTop), layer: "back" }] : [],
    motion: (p) => {
      const torso = torsoAt(p);
      let pose = base(hipAt(p), { torso, pelvis: torso, head: torso + 10 });
      pose = plant(pose, "side", ankle, ankle, { N: 30, F: 30 });
      pose = palms(pose, "side", palm, palm, 90, -1);
      return { pose };
    },
  };
}

// --- Scapular push-ups ---------------------------------------------------------------
//
// Straight arms, a rigid body, and only the shoulder blades move: they pinch
// together and the chest sinks between them, then they spread and push the
// chest away. The rig shows that as the shoulder joint sliding across the
// trunk (`protract`). Since the hands are fixed and the arms locked, the body
// is solved for the tilt that keeps them locked, so the whole trunk rises as
// the blades spread.

const RETRACT = -3.5;
const PROTRACT = 4.5;
// A hair short of the full arm, so the elbows read as locked, not hyperextended.
const LOCKED = LEN.upperArm + LEN.forearm - 0.15;

// A straight body at `tilt` degrees above horizontal, head to the right, pivoting
// on a fixed contact.
type Lean = (tilt: number) => Pose;

const leanToes = (toe: V): Lean => (tilt) => prone(toe, tilt);

// Knees on the floor at `x`, thighs in line with the trunk, shins flat behind.
const leanKnees = (x: number): Lean => (tilt) => {
  const body = -90 + tilt;
  const hip = sub(v(x, -5), rot(v(0, LEN.thigh), body));
  const leg: Limb = { upper: body, lower: -90, end: -178 };
  return { ...base(hip, { pelvis: body, torso: body, head: body + 6 }), legN: leg, legF: { ...leg } };
};

// Standing with the feet flat at ankle `x`, leaning on straight legs.
const leanFeet = (x: number): Lean => (tilt) => {
  const body = -90 + tilt;
  const hip = sub(v(x, -8), rot(v(0, LEN.thigh + LEN.shin), body));
  const leg: Limb = { upper: body, lower: body, end: 0 };
  return { ...base(hip, { pelvis: body, torso: body, head: body + 4 }), legN: leg, legF: { ...leg } };
};

// The tilt at which the shoulder sits exactly a locked arm from the wrist.
function lockedTilt(lean: Lean, protract: number, wrist: V, lo: number, hi: number): number {
  const gap = (t: number) => {
    const s = shoulders({ ...lean(t), protract }).N;
    return Math.hypot(s.x - wrist.x, s.y - wrist.y) - LOCKED;
  };
  const rising = gap(hi) > gap(lo);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (gap(mid) > 0 === rising) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// The tilt at which locked arms stand straight down onto a surface at `surface`.
function armsVertical(lean: Lean, surface: number, lo: number, hi: number): number {
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (shoulders(lean(mid)).N.y < surface - LEN.palm - LOCKED) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

const SCAP_BENCH = -44;

function scapPushUp(o: {
  name: string;
  aka?: string[];
  // floor: a plank on the toes. bench: hands on a bench. knees: a plank on
  // the knees. decline: feet up on a bench. wall: standing, hands on a wall.
  on?: "floor" | "bench" | "knees" | "decline" | "wall";
  // A plate lying across the upper back.
  plate?: boolean;
  // A full push-up first, with the extra spread of the blades at the top.
  plus?: boolean;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  const on = o.on ?? "floor";
  const setup = {
    floor: { lean: leanToes(v(-62, 0)), surface: 0, range: [-5, 45] },
    bench: { lean: leanToes(v(-96, 0)), surface: SCAP_BENCH, range: [10, 70] },
    knees: { lean: leanKnees(-22), surface: 0, range: [0, 60] },
    decline: { lean: leanToes(v(-86, SCAP_BENCH)), surface: 0, range: [-30, 30] },
    wall: { lean: leanFeet(-44), surface: 0, range: [45, 89] },
  }[on];
  const { lean } = setup;
  const [lo, hi] = setup.range;

  // Palms planted where the arms are straight halfway through the rep: under
  // the shoulders, or for the wall, out in front and a little below them.
  let palm: V;
  let fingers = 90;
  if (on === "wall") {
    const s = shoulders(lean(68)).N;
    const down = (8 * Math.PI) / 180;
    palm = v(s.x + LOCKED * Math.cos(down) + LEN.palm, s.y + LOCKED * Math.sin(down));
    fingers = 180;
  } else {
    palm = v(shoulders(lean(armsVertical(lean, setup.surface, lo, hi))).N.x + 1, setup.surface);
  }
  const wrist = add(palm, rot(v(0, -LEN.palm), fingers - 90));

  const scene: Spec["scene"] = [];
  if (on === "bench") scene.push({ draw: box(palm.x - 30, palm.x + 26, SCAP_BENCH, "pad"), layer: "back" });
  if (on === "decline") scene.push({ draw: box(-86 - 28, -86 + 16, SCAP_BENCH), layer: "back" });
  if (on === "wall") scene.push({ draw: wall(palm.x, -196), layer: "back" });

  // The plus: a push-up from the floor to straight arms (blades still
  // pinched), then the spread. `TOP` is where the arms finish straightening.
  const TOP = 0.6;
  const bottom = 7;
  const topTilt = lockedTilt(lean, RETRACT, wrist, lo, hi);

  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: o.plus ? 3.2 : 2.4,
    hands: { N: "palm" },
    primary: o.primary,
    secondary: o.secondary,
    still: 1,
    scene,
    props: o.plate ? [{ id: "plate", draw: plateEdge(13), layer: "front" }] : [],
    motion: (p) => {
      let pose: Pose;
      if (o.plus && p < TOP) {
        pose = { ...lean(lerp(bottom, topTilt, p / TOP)), protract: RETRACT };
      } else {
        const spread = o.plus ? (p - TOP) / (1 - TOP) : p;
        const protract = lerp(RETRACT, PROTRACT, spread);
        pose = { ...lean(lockedTilt(lean, protract, wrist, lo, hi)), protract };
      }
      pose = palms(pose, "side", palm, palm, fingers, -1);
      const props: Record<string, PropState> = {};
      if (o.plate) props.plate = turned(onTrunk(pose, v(-14.5, -23)), pose.torso);
      return { pose, props };
    },
  };
}

const DIP_BAR = -118;

function dip(o: {
  name: string;
  rings?: boolean;
  // One bar across, in front of the hips: the lean is further forward.
  straightBar?: boolean;
  // Held at the top on rings, steadying rather than dipping.
  support?: boolean;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  const bar = v(4, DIP_BAR);
  return {
    name: o.name,
    mode: o.support ? "loop" : "alternate",
    seconds: o.support ? 4 : 2.8,
    samples: o.support ? 20 : undefined,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.85,
    scene: o.rings ? [] : o.straightBar ? [{ draw: { svg: `<circle class="steel" cx="${bar.x}" cy="${bar.y}" r="3.2"/>`, box: [bar.x - 3.2, bar.y - 3.2, bar.x + 3.2, bar.y + 3.2] }, layer: "front" }] : [{ draw: dipBar(-34, 34, DIP_BAR), layer: "back" }],
    props: o.rings
      ? [
          { id: "sF", draw: strap(), layer: "back" },
          { id: "sN", draw: strap(), layer: "back" },
          { id: "rN", draw: ring(), layer: "front" },
        ]
      : [],
    motion: (q) => {
      const grip = bar;
      // Holding: a small wobble at the top instead of a dip.
      const p = o.support ? (wave(q) * 0.05) : q;
      const drop = lerp(0, o.straightBar ? 30 : 26, p);
      const torso = o.straightBar ? lerp(-14, -40, p) : lerp(-4, -24, p);
      const shoulder = add(grip, v(o.straightBar ? 6 + p * 10 : -1 - p * 6, -54 + drop));
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

// The Korean dip, from the reel DZK0jZqIymN: the same straight bar, but with
// the bar behind the body. In rear support the arms reach straight back and
// down to the bar at the glutes; bending the elbows back drops the body, so
// the bar rides up to the lower back while the chest pitches forward and the
// shoulders go deep into extension. `p` is height here (1 the top), so the
// negative builder can use it. `c` is the bar's place on the trunk.
function koreanDip(o: { name: string; aka?: string[]; hold?: boolean; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  const bar = v(4, DIP_BAR);
  return {
    name: o.name,
    aka: o.aka,
    mode: o.hold ? "loop" : "alternate",
    seconds: o.hold ? 4 : 3,
    samples: o.hold ? 20 : undefined,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: o.hold ? 0.25 : 0.1,
    scene: [{ draw: { svg: `<circle class="steel" cx="${bar.x}" cy="${bar.y}" r="3.2"/>`, box: [bar.x - 3.2, bar.y - 3.2, bar.x + 3.2, bar.y + 3.2] }, layer: "front" }],
    motion: (q) => {
      const p = o.hold ? 1 - wave(q) * 0.05 : q;
      const torso = lerp(-46, -18, p);
      const c = lerpV(v(-14.5, -3), v(-16, 16), p);
      let pose = aroundBar(bar, torso, c, { head: torso * 0.5 });
      pose = { ...pose, legN: limb(lerp(26, 8, p), -64, -36), legF: limb(lerp(20, 4, p), -70, -42) };
      return { pose: holdBehind(pose, bar) };
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

// Half-kneeling, near knee down, pressing the end of a bar whose other end
// sits in a floor pivot ahead: the hand can only travel the circle around
// the pivot, so the press goes up and forward along it.
const LANDMINE_LEN = 160;

// Near knee down under the hip, shin and instep flat on the floor behind it;
// far foot planted ahead, shin upright.
function halfKneeling(lean: number): Pose {
  const hip = v(-10, -49);
  const pose = base(hip, { torso: lean, pelvis: lean * 0.4, head: lean * 0.5 });
  return {
    ...pose,
    legN: limb(0, -90, -180),
    legF: plantLeg(hip, v(32, -8), 0, 1),
    armF: limb(8, 34, 34),
  };
}

const LANDMINE_START = add(shoulders(halfKneeling(-6)).N, v(12, -2));
const LANDMINE_PIVOT = v(LANDMINE_START.x + Math.sqrt(LANDMINE_LEN ** 2 - (LANDMINE_START.y + 3) ** 2), -3);
// Where the hand is with the bar at `rise` radians above the floor.
const landmineEnd = (rise: number) => sub(LANDMINE_PIVOT, v(Math.cos(rise) * LANDMINE_LEN, Math.sin(rise) * LANDMINE_LEN));
const LANDMINE_FROM = Math.asin(-(LANDMINE_START.y + 3) / LANDMINE_LEN);
// The rise at which the arm, leaning into the press, is all but straight.
const LANDMINE_TO = (() => {
  const s = shoulders(halfKneeling(-12)).N;
  let lo = LANDMINE_FROM;
  let hi = Math.PI / 2;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const g = landmineEnd(mid);
    if (Math.hypot(g.x - s.x, g.y - s.y) < 59.5) lo = mid;
    else hi = mid;
  }
  return lo;
})();

const landminePress: Spec = {
  name: "Landmine Press",
  aka: ["Half-Kneeling Landmine Press", "Single-Arm Landmine Press"],
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist", F: "hand" },
  primary: ["delts_front", "chest"],
  secondary: ["triceps", "obliques", "glutes"],
  still: 0.8,
  scene: [{ draw: landmineBase(LANDMINE_PIVOT), layer: "back" }],
  props: [
    { id: "bar", draw: barLine(), layer: "mid" },
    { id: "plate", draw: plateEdge(19), layer: "mid" },
  ],
  motion: (p) => {
    let pose = halfKneeling(lerp(-6, -12, p));
    const grip = landmineEnd(lerp(LANDMINE_FROM, LANDMINE_TO, p));
    pose = { ...pose, armN: gripArm(shoulders(pose).N, grip, -1) };
    const along = sub(grip, LANDMINE_PIVOT);
    const unit = v(along.x / LANDMINE_LEN, along.y / LANDMINE_LEN);
    const bar = line(LANDMINE_PIVOT, add(grip, v(unit.x * 3, unit.y * 3)));
    return { pose, props: { bar, plate: turned(sub(grip, v(unit.x * 21, unit.y * 21)), bar.angle ?? 0) } };
  },
};

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

// Barbell front raise to overhead (reel DYsBoynvR7L): a pronated
// shoulder-width grip, the arms locked straight the whole way, the bar swung
// from the front of the thighs up past the face to straight overhead. Pure
// shoulder flexion with no press, so the elbows never bend. The body leans
// back a little, the hips forward, and leans back most while the bar is out
// in front at shoulder height, where it is hardest to hold. No rest at the
// bottom: the bar stays just off the thighs.
const FRONT_RAISE_FROM = 16;
const FRONT_RAISE_TO = 178;

const barbellFrontRaise: Spec = {
  name: "Barbell Front Raise to Overhead",
  aka: ["Front Delt Barbell Raise", "Overhead Barbell Front Raise", "Full Range Barbell Front Raise"],
  mode: "alternate",
  seconds: 3.2,
  hands: { N: "fist" },
  primary: ["delts_front"],
  secondary: ["delts_side", "traps", "upper_back", "abs"],
  still: 0.6,
  // Light: small plates, or an empty bar.
  props: barbell(11),
  motion: (p) => {
    const raise = lerp(FRONT_RAISE_FROM, FRONT_RAISE_TO, p);
    // How far the bar is out in front of the shoulder: 0 at the thighs and
    // overhead, 1 at shoulder height.
    const out = Math.sin((raise * Math.PI) / 180);
    const torso = 4 + out * 3;
    const probe = (pose: Pose) => shoulders(pose).N;
    let pose = stand(-94.4, { torso, pelvis: torso * 0.6, head: torso + 4 }, { probe, over: 1 - out * 3 });
    const arm = limb(raise, raise, raise);
    pose = { ...pose, armN: arm, armF: { ...arm } };
    return { pose, props: { bar: at(grips(pose).N) } };
  },
};

// Barbell Cuban press, from reel Da6xEyJTxtr (@theharsh_sabharwal): a light
// bar in a wide grip, upright-rowed until the elbows reach shoulder height,
// the forearms turned up about the upper arms to a 90/90 (external rotation),
// pressed overhead, then the same three steps in reverse. Square-on, since
// everything it trains happens out to the sides. The grip never changes, so
// the hands stay the same distance apart the whole way: the width is set by
// the 90/90, where each forearm stands straight up over its elbow.
const CUBAN_UPPER = LEN.upperArm * 0.9; // upper arms a little ahead of the trunk
const CUBAN_FOREARM = LEN.forearm;
// Two-bone reach from the shoulder to the wrist, elbow out to the side.
function cubanArm(s: V, wrist: V, forearm: number): { elbow: V; wrist: V } {
  const d = sub(wrist, s);
  const dist = Math.min(Math.hypot(d.x, d.y), CUBAN_UPPER + forearm - 0.01);
  const cosA = (CUBAN_UPPER ** 2 + dist ** 2 - forearm ** 2) / (2 * CUBAN_UPPER * dist);
  const a = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;
  const base = dirAngle(d);
  // Of the two elbows, the one further out to the side.
  const e1 = add(s, rot(v(0, CUBAN_UPPER), base + a));
  const e2 = add(s, rot(v(0, CUBAN_UPPER), base - a));
  const elbow = Math.abs(e1.x) > Math.abs(e2.x) ? e1 : e2;
  return { elbow, wrist: add(elbow, rot(v(0, forearm), dirAngle(sub(wrist, elbow)))) };
}
const barbellCubanPress: Spec = {
  name: "Barbell Cuban Press",
  aka: ["Cuban Press", "Cuban Rotation Press", "Upright Row to Press", "Upright Row, External Rotation and Press"],
  view: "front",
  mode: "loop",
  seconds: 4.6,
  samples: 48,
  hands: { N: "fist" },
  primary: ["delts_side", "delts_rear"],
  secondary: ["traps", "upper_back", "delts_front", "triceps"],
  still: 0.36,
  // An empty bar with collars, as in the reel.
  props: [{ id: "bar", draw: barbellAcross(70, 6), layer: "front" }],
  motion: (p) => {
    // 0 hanging, 1 elbows up at the top of the row, 2 the 90/90, 3 overhead.
    const st = kf(p, [
      [0, 0], [0.05, 0], [0.2, 1], [0.32, 2], [0.36, 2], [0.5, 3], [0.56, 3],
      [0.69, 2], [0.72, 2], [0.84, 1], [0.98, 0], [1, 0],
    ]);
    let pose = standSquare(-94.6, { shrug: kf(st, [[0, 0], [1, 1.5], [2, 0.5], [3, 2.5]]) });
    const S = shoulders(pose, "front").N;
    const W = S.x + CUBAN_UPPER;
    // At the top of the row the forearms hang down and a little forward, and
    // turn about the upper arm through pointing at the viewer to straight up.
    const ROW_TOP = 38;
    let arm: Limb;
    let bar: V;
    if (st > 1 && st < 2) {
      const theta = lerp(ROW_TOP, 180, st - 1);
      const c = Math.cos((theta * Math.PI) / 180);
      const k = Math.abs(c);
      const elbow = v(W, S.y);
      const lower = theta < 90 ? 0 : 180;
      arm = { upper: dirAngle(sub(elbow, S)), lower, end: lower, ku: 0.9, kl: Math.max(k, 0.04), ke: Math.max(k, 0.35) };
      bar = v(W, S.y + (CUBAN_FOREARM + LEN.grip) * c);
    } else {
      let wristY: number;
      let forearm = CUBAN_FOREARM;
      if (st <= 1) {
        // The row: wrists straight up the line x = W.
        forearm = CUBAN_FOREARM * lerp(1, Math.cos((ROW_TOP * Math.PI) / 180), st);
        const low = S.y + Math.sqrt((CUBAN_UPPER + CUBAN_FOREARM) ** 2 - CUBAN_UPPER ** 2) - 0.5;
        wristY = lerp(low, S.y + forearm, Math.sin((st * Math.PI) / 2));
      } else {
        const high = S.y - Math.sqrt((CUBAN_UPPER + CUBAN_FOREARM) ** 2 - CUBAN_UPPER ** 2) + 0.5;
        wristY = lerp(S.y - CUBAN_FOREARM, high, st - 2);
      }
      const j = cubanArm(S, v(W, wristY), forearm);
      const lower = dirAngle(sub(j.wrist, j.elbow));
      const kl = forearm / CUBAN_FOREARM;
      arm = { upper: dirAngle(sub(j.elbow, S)), lower, end: lower, ku: 0.9, kl, ke: Math.max(kl, 0.35) };
      bar = add(j.wrist, rot(v(0, LEN.grip * kl), lower));
    }
    pose = { ...pose, armN: arm, armF: mirror(arm) };
    return { pose, props: { bar: at(v(0, bar.y)) } };
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

// An upright machine handle, gripped round its middle.
const uprightHandle = () => ({
  svg: `<rect class="steel" x="-1.6" y="-9" width="3.2" height="18" rx="1.4"/>`,
  box: [-1.6, -9, 1.6, 9] as [number, number, number, number],
});

// Seated facing the pad, seen from behind: the handles start out in front at
// shoulder height, where the arms point away from the viewer, and the arms
// sweep back level until they line up with the shoulders. The machine's arms
// hang from a pivot above the pad, so they swing out with the hands.
const REVERSE_DECK_PIVOT = v(0, -168);
const reversePecDeck: Spec = {
  name: "Reverse Pec Deck",
  aka: ["Reverse Pec Deck Fly", "Rear Delt Machine Fly"],
  view: "back",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["delts_rear", "upper_back"],
  secondary: ["traps"],
  still: 1,
  scene: [
    { draw: column(-6, REVERSE_DECK_PIVOT.y - 6), layer: "back" },
    { draw: { svg: `<rect class="pad" x="-15" y="-118" width="30" height="56" rx="5"/>`, box: [-15, -118, 15, -62] }, layer: "back" },
    { draw: seat(-24, 24, -50), layer: "back" },
  ],
  props: [
    { id: "lN", draw: barLine(), layer: "back" },
    { id: "lF", draw: barLine(), layer: "back" },
    { id: "hN", draw: uprightHandle(), layer: "mid" },
    { id: "hF", draw: uprightHandle(), layer: "mid" },
  ],
  motion: (p) => {
    // Elbows a touch soft and leading, so the forearm trails the upper arm.
    const k = lerp(0.2, 1, p);
    const arm = { ...limb(90, 95, 95), ku: k, kl: k };
    const pose: Pose = { ...seatedSquare(), armN: arm, armF: mirror(arm) };
    const g = grips(pose, "back");
    const top = (q: typeof g.N) => add(q, v(0, -8));
    return {
      pose,
      props: {
        lN: line(REVERSE_DECK_PIVOT, top(g.N)),
        lF: line(REVERSE_DECK_PIVOT, top(g.F)),
        hN: at(g.N),
        hF: at(g.F),
      },
    };
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

function handstand(o: {
  name: string;
  push?: boolean;
  // Hands on plates, so the head sinks below them at the bottom.
  deficit?: boolean;
  // Away from the wall, balancing: a wider sway, caught at the fingers.
  free?: boolean;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  const surface = o.deficit ? -2 * DEFICIT : 0;
  return {
    name: o.name,
    mode: o.push ? "alternate" : "loop",
    seconds: o.push ? (o.deficit ? 3.4 : 3) : o.free ? 3.2 : 4,
    hands: { N: "palm" },
    primary: o.primary,
    secondary: o.secondary,
    still: o.push ? 0 : 0.25,
    scene: [
      ...(o.push ? [{ draw: wall(-34, -220), layer: "back" as const }] : []),
      ...(o.deficit ? [{ draw: plateStack(-8, surface, 2), layer: "back" as const }, { draw: plateStack(8, surface, 2), layer: "back" as const }] : []),
    ],
    motion: (p) => {
      const sway = o.push ? 0 : (wave(p) - 0.5) * (o.free ? 7 : 3);
      const drop = o.push ? lerp(0, o.deficit ? 40 : 24, p) : 0;
      const palm = v(0, surface);
      const shoulder = v(palm.x - 2 + sway * 0.4, surface - 55.6 + drop);
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

// --- Planche and the tuck press ----------------------------------------------------
//
// Hands planted at the origin, head to the right as in the push-ups. Each
// position is solved from where the shoulder is: `lean` is how far it sits
// ahead of the wrist on straight arms, and the trunk hangs off it.

const REACH = LEN.upperArm + LEN.forearm - 0.4;
const WRIST = v(0, -LEN.palm);
const PALM = v(0, 0);

const straightShoulder = (lean: number) => v(WRIST.x + lean, WRIST.y - Math.sqrt(REACH ** 2 - lean ** 2));

// The trunk hung from a shoulder point at `torso` degrees, pelvis in line.
function fromShoulder(shoulder: V, torso: number, head = torso + 8): Pose {
  const lumbar = sub(shoulder, rot(v(0, -41), torso));
  const hip = sub(lumbar, rot(v(0, -11), torso));
  return base(hip, { torso, pelvis: torso, head });
}

// Legs folded by joint angle rather than world angle, so a tuck keeps its
// shape while the trunk turns under it: `hip` and `knee` are flexion in
// degrees, `point` how far the toes point past neutral.
const folded = (torso: number, hip: number, knee: number, point = 40): Limb => {
  const thigh = torso + hip;
  const shin = thigh - knee;
  return limb(thigh, shin, shin - point);
};

// Face down on the toes at `toe`, the shoulder at `shoulder`, body straight
// between them. The feet roll over the toes to make up the distance, as they
// do when a plank leans forward into a planche lean.
const SHOULDER_TO_ANKLE = 41 + 11 + LEN.thigh + LEN.shin;
const FOOT_LEN = Math.hypot(FOOT.toe.x, FOOT.toe.y);
const screenAngle = (d: V) => (Math.atan2(-d.y, d.x) * 180) / Math.PI;
function onToes(toe: V, shoulder: V): Pose {
  const d = sub(toe, shoulder);
  const dist = Math.hypot(d.x, d.y);
  const cos = (SHOULDER_TO_ANKLE ** 2 + dist ** 2 - FOOT_LEN ** 2) / (2 * SHOULDER_TO_ANKLE * dist);
  const phi = (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
  // Of the two ankle positions, the one above the line to the toes.
  const options = [dirAngle(d) + phi, dirAngle(d) - phi];
  const ankleAt = (a: number) => add(shoulder, rot(v(0, SHOULDER_TO_ANKLE), a));
  const body = options.sort((a, b) => ankleAt(a).y - ankleAt(b).y)[0];
  const ankle = ankleAt(body);
  const foot = screenAngle(sub(toe, ankle)) - screenAngle(FOOT.toe);
  const pose = fromShoulder(shoulder, body, body + 6);
  const leg = limb(body, body, foot);
  return { ...pose, legN: leg, legF: { ...leg } };
}

const PLANCHE_TOE = v(-125, 0);

// Plank on straight arms, rocking the shoulders forward past the hands and
// holding there. The toes stay put; the feet roll toward pointed.
const planchLean: Spec = {
  name: "Planche Lean",
  aka: ["Planche Lean Hold", "Pseudo Planche Lean"],
  mode: "loop",
  seconds: 4.4,
  hands: { N: "palm" },
  primary: ["delts_front"],
  secondary: ["chest", "biceps", "abs", "forearms"],
  still: 0.55,
  motion: (p) => {
    const lean = kf(p, [[0, 2], [0.32, 18], [0.78, 18], [1, 2]]);
    const pose = onToes(PLANCHE_TOE, straightShoulder(lean));
    return { pose: palms(pose, "side", PALM, PALM, 90, -1) };
  },
};

// The lean held all the way down: the shoulders stay ahead of the hands, so
// at the bottom the hands are back by the waist and the elbows point at the
// feet.
const pseudoPlanchePushUp: Spec = {
  name: "Pseudo Planche Push-Up",
  aka: ["Planche Lean Push-Up", "PPPU", "Pseudo Planche Push Up"],
  mode: "alternate",
  seconds: 3,
  hands: { N: "palm" },
  primary: ["chest", "delts_front", "triceps"],
  secondary: ["biceps", "abs", "forearms"],
  still: 0.85,
  motion: (p) => {
    const top = straightShoulder(16);
    const bottom = v(29, -35);
    const pose = onToes(PLANCHE_TOE, v(lerp(top.x, bottom.x, p), lerp(top.y, bottom.y, p)));
    return { pose: palms(pose, "side", PALM, PALM, 90, -1) };
  },
};

// Squatting on the toes behind the hands, knees against the backs of the
// arms: where the tuck planche and the tuck press start from.
function crouch(lean: number, heel = 0): Pose {
  const pose = fromShoulder(straightShoulder(lean), -66 - lean * 0.6, -50);
  return plant(pose, "side", v(-34 + lean * 0.4, -15 - heel), undefined, { N: -38 - heel, F: -38 - heel });
}

// The tuck planche: hips about level with the shoulders, back rounded, knees
// pulled to the chest and the feet off the floor.
function tuckPlanche(lean: number, torso = -112): Pose {
  const pose = fromShoulder(straightShoulder(lean), torso, torso + 22);
  const leg = folded(torso, 145, 160, 20);
  return { ...pose, legN: leg, legF: { ...leg } };
}

// From the crouch, lean until the feet float, hold the tuck, set them down.
const tuckPlancheHold: Spec = {
  name: "Tuck Planche",
  aka: ["Tuck Planche Hold"],
  mode: "loop",
  seconds: 5,
  samples: 40,
  hands: { N: "palm" },
  primary: ["delts_front"],
  secondary: ["chest", "triceps", "biceps", "abs"],
  still: 0.6,
  motion: (p) => {
    const keys: [number, Pose][] = [
      [0, crouch(2)],
      [0.16, crouch(10, 4)],
      [0.36, tuckPlanche(18)],
      [0.8, tuckPlanche(18, -109)],
      [1, crouch(2)],
    ];
    const pose = seq(p, keys);
    return { pose: palms(pose, "side", PALM, PALM, 90, -1) };
  },
};

// Bend the arms out of the tuck planche until the head is near the floor,
// keeping the knees off the arms and the hips up, then press back.
const tuckPlanchePushUp: Spec = {
  name: "Tuck Planche Push-Up",
  aka: ["Tuck Planche Push Up"],
  mode: "alternate",
  seconds: 3.2,
  hands: { N: "palm" },
  primary: ["delts_front", "triceps", "chest"],
  secondary: ["abs", "biceps"],
  still: 0,
  motion: (p) => {
    const top = straightShoulder(18);
    const shoulder = v(lerp(top.x, 27, p), lerp(top.y, -30, p));
    const torso = lerp(-112, -122, p);
    let pose = fromShoulder(shoulder, torso, torso + lerp(22, 28, p));
    const leg = folded(torso, lerp(145, 148, p), 160, 20);
    pose = { ...pose, legN: leg, legF: { ...leg } };
    return { pose: palms(pose, "side", PALM, PALM, 90, -1) };
  },
};

// The press: crouch, lean into the tuck planche, then let the hips rise over
// the hands as the shoulders come back above them, open into a tuck
// handstand and straighten the legs. Phase 1 is the handstand, so played
// back it is the lowering too.
function tuckPressPose(p: number): Pose {
  const keys: [number, Pose][] = [
    [0, crouch(3)],
    [0.16, crouch(11, 4)],
    [0.34, tuckPlanche(17)],
    [0.58, (() => {
      const torso = -142;
      const pose = fromShoulder(straightShoulder(9), torso, torso + 16);
      const leg = folded(torso, 145, 158, 20);
      return { ...pose, legN: leg, legF: { ...leg } };
    })()],
    [0.8, (() => {
      const torso = -178;
      const pose = fromShoulder(straightShoulder(-1), torso, torso + 12);
      const leg = folded(torso, 100, 132);
      return { ...pose, legN: leg, legF: { ...leg } };
    })()],
    [1, (() => {
      const torso = -180;
      const pose = fromShoulder(straightShoulder(-2), torso, torso + 12);
      const leg = folded(torso, 0, 0, 62);
      return { ...pose, legN: leg, legF: { ...leg, upper: leg.upper - 2, lower: leg.lower - 2, end: leg.end - 2 } };
    })()],
  ];
  return palms(seq(p, keys), "side", PALM, PALM, 90, -1);
}

const tuckPress: Spec = {
  name: "Tuck Press to Handstand",
  aka: ["Tuck Press", "Tuck Press Handstand", "Tuck Handstand Press", "Press to Handstand"],
  mode: "alternate",
  seconds: 6,
  samples: 48,
  hands: { N: "palm" },
  primary: ["delts_front", "triceps"],
  secondary: ["traps", "abs", "hip_flexors", "chest"],
  still: 0.58,
  motion: (p) => ({ pose: tuckPressPose(p) }),
};

// --- Handstand balance drills -------------------------------------------------------
//
// Upside down, chest to a wall on the left. `lean` moves the shoulders off
// the wrists (+ toward the back, away from the wall), `tilt` leans the trunk
// with the hips toward the wall, and each leg is set by how far it leans
// toward the wall from straight up.

const upLeg = (toWall: number, point = 62): Limb => limb(-180 + toWall, -180 + toWall, -180 + toWall - point);

function inverted(lean: number, tilt: number, legN: Limb, legF: Limb = legN): Pose {
  const torso = -180 + tilt;
  const pose = fromShoulder(straightShoulder(lean), torso, torso + 12);
  return palms({ ...pose, legN, legF }, "side", PALM, PALM, 90, 1);
}

// The leftmost point of a pointed foot, to stand the wall against.
const toeLine = (pose: Pose) => {
  const j = joints(pose);
  const tipN = add(j.ankleN, rot(FOOT.toe, pose.legN.end));
  return Math.min(j.ankleN.x - 5, tipN.x - 2);
};

// Level 1: feet on a box, hips up in a pike. The shoulders start closed — the
// trunk tilted further than the arms — and push over the hands until hands,
// shoulders and hips make one line toward the box.
const PIKE_BOX_TOP = -60;
const boxPikeStack = (() => {
  const at = (p: number) => {
    const arm = lerp(3, 24, p);
    const tilt = lerp(42, 24, p);
    const s = v(WRIST.x - Math.sin((arm * Math.PI) / 180) * REACH, WRIST.y - Math.cos((arm * Math.PI) / 180) * REACH);
    return fromShoulder(s, -180 + tilt, -180 + tilt + 14);
  };
  // Feet set where the legs are straight once stacked.
  const h1 = at(1).hip;
  const ankleY = PIKE_BOX_TOP - 8;
  const ankle = v(h1.x - Math.sqrt((LEN.thigh + LEN.shin - 0.6) ** 2 - (ankleY - h1.y) ** 2), ankleY);
  const spec: Spec = {
    name: "Box Pike Shoulder Stack",
    aka: ["Elevated Pike Shoulder Stack", "Box Pike Stack", "Pike Stack on Box"],
    mode: "alternate",
    seconds: 2.6,
    hands: { N: "palm" },
    primary: ["delts_front", "triceps"],
    secondary: ["traps", "abs"],
    still: 1,
    scene: [{ draw: box(ankle.x - 30, ankle.x + 16, PIKE_BOX_TOP), layer: "back" }],
    motion: (p) => {
      let pose = at(p);
      pose = plant(pose, "side", ankle, ankle, { N: 40, F: 40 }, -1);
      return { pose: palms(pose, "side", PALM, PALM, 90, 1) };
    },
  };
  return spec;
})();

// Chest-to-wall stance shared by levels 2 and 5: hands a short reach from the
// wall, body leaning in just enough for the toes to touch it.
const WALL_STANCE = { lean: 1, tilt: 4, legs: 7 };
const wallStance = () => inverted(WALL_STANCE.lean, WALL_STANCE.tilt, upLeg(WALL_STANCE.legs));
const NEAR_WALL = toeLine(wallStance());

// Level 2: one foot at a time peels off the wall toward the back and returns,
// the other foot keeping its place.
const wallSingleLegPull: Spec = {
  name: "Wall Handstand Single-Leg Pull",
  aka: ["Chest-to-Wall Single-Leg Pull", "Single-Leg Toe Pull", "Wall Handstand Leg Lift"],
  mode: "loop",
  seconds: 4.4,
  samples: 40,
  hands: { N: "palm" },
  primary: ["delts_front", "triceps"],
  secondary: ["glutes", "abs", "forearms", "traps"],
  still: 0.2,
  scene: [{ draw: wall(NEAR_WALL - 8, -230), layer: "back" }],
  motion: (p) => {
    const off = (a: number, b: number) => kf(p, [[a, 0], [a + 0.12, 1], [b - 0.12, 1], [b, 0]]);
    const n = off(0.02, 0.48);
    const f = off(0.52, 0.98);
    const legs = WALL_STANCE.legs;
    const tilt = WALL_STANCE.tilt - (n + f) * 1.5;
    return { pose: inverted(WALL_STANCE.lean - (n + f) * 1.5, tilt, upLeg(legs - n * 26), upLeg(legs - f * 26)) };
  },
};

// Level 3: the shoulders start closed — pushed back past the hands, the body
// one straight line leaning into the wall — and open until the trunk stands
// straight over the hands, the legs still reaching back to the wall.
const SHIFT_CLOSED = inverted(18, 26, upLeg(26));
const SHIFT_WALL = toeLine(SHIFT_CLOSED);
const wallShoulderStack: Spec = {
  name: "Wall Handstand Shoulder Stack",
  aka: ["Chest-to-Wall Shoulder Stack", "Wall Handstand Shoulder Opener", "Wall Handstand Lean and Stack"],
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "palm" },
  primary: ["delts_front", "traps"],
  secondary: ["triceps", "abs"],
  still: 1,
  scene: [{ draw: wall(SHIFT_WALL - 8, -230), layer: "back" }],
  motion: (p) => {
    const lean = lerp(18, -1, p);
    const tilt = lerp(26, 3, p);
    // Solve the leg lean that keeps the feet on the same line of wall.
    let lo = 0;
    let hi = 40;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (toeLine(inverted(lean, tilt, upLeg(mid))) > SHIFT_WALL) lo = mid;
      else hi = mid;
    }
    return { pose: inverted(lean, tilt, upLeg(lo)) };
  },
};

// Level 4: hands a leg's length from the wall, one foot flat on it with the
// leg level, the other leg sweeping from toward the wall to past vertical.
const L_SWEEP = (() => {
  const stand = inverted(-1, 0, upLeg(0));
  const hip = stand.hip;
  const wallX = hip.x - (LEN.thigh + LEN.shin) - 8;
  return { wallX };
})();
const wallLSweep: Spec = {
  name: "Wall L-Handstand Leg Sweep",
  aka: ["Single-Leg Wall L-Handstand", "Wall L-Handstand Leg Lift", "Half Wall Handstand Leg Sweep"],
  mode: "alternate",
  seconds: 2.4,
  hands: { N: "palm" },
  primary: ["delts_front", "triceps"],
  secondary: ["hip_flexors", "glutes", "abs", "traps"],
  still: 0.4,
  scene: [{ draw: wall(L_SWEEP.wallX - 8, -230), layer: "back" }],
  motion: (p) => {
    const sweep = lerp(48, -22, p);
    const flat = limb(-90, -90, -90);
    return { pose: inverted(-1 + sweep * 0.03, -sweep * 0.04, upLeg(sweep), flat) };
  },
};

// Level 5: from the wall stance, press into the fingers so the shoulders
// drift toward the wall and both feet float off it; hold, then touch back.
const wallToePull: Spec = {
  name: "Chest-to-Wall Toe Pull",
  aka: ["Wall Handstand Toe Pull", "Handstand Toe Pull", "Toe Pulls"],
  mode: "loop",
  seconds: 4,
  samples: 40,
  hands: { N: "palm" },
  primary: ["delts_front", "forearms"],
  secondary: ["triceps", "abs", "traps"],
  still: 0.5,
  scene: [{ draw: wall(NEAR_WALL - 8, -230), layer: "back" }],
  motion: (p) => {
    const off = kf(p, [[0, 0], [0.3, 1], [0.75, 1], [1, 0]]);
    const legs = lerp(WALL_STANCE.legs, -6, off);
    return { pose: inverted(lerp(WALL_STANCE.lean, -6, off), lerp(WALL_STANCE.tilt, -5, off), upLeg(legs), upLeg(legs - 1)) };
  },
};

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
  pushUpSpec({ name: "Archer Push-Up", archer: true, primary: ["chest", "triceps"], secondary: ["delts_front", "abs", "obliques"] }),
  pushUpSpec({ name: "One-Arm Incline Push-Up", incline: true, oneArm: true, primary: ["chest", "triceps"], secondary: ["delts_front", "obliques", "abs"] }),
  pushUpSpec({ name: "One-Arm Push-Up", oneArm: true, primary: ["chest", "triceps"], secondary: ["delts_front", "obliques", "abs"] }),
  pikePushUp({ name: "Pike Push-Up", primary: ["delts_front", "triceps"], secondary: ["upper_back", "abs"] }),
  pikePushUp({ name: "Elevated Pike Push-Up", elevated: true, primary: ["delts_front", "triceps"], secondary: ["upper_back", "abs"] }),
  pushUpSpec({ name: "Deficit Push-Up", deficit: true, primary: ["chest", "triceps"], secondary: ["delts_front", "abs"] }),
  scapPushUp({ name: "Wall Scapular Push-Up", aka: ["Wall Scap Push-Up", "Wall Scapula Push-Up", "Wall Push-Up Plus"], on: "wall", primary: ["upper_back"], secondary: ["chest"] }),
  scapPushUp({ name: "Incline Scapular Push-Up", aka: ["Incline Scap Push-Up", "Bench Scapular Push-Up"], on: "bench", primary: ["upper_back"], secondary: ["chest", "abs"] }),
  scapPushUp({ name: "Kneeling Scapular Push-Up", aka: ["Kneeling Scap Push-Up", "Knee Scapular Push-Up"], on: "knees", primary: ["upper_back"], secondary: ["chest", "abs"] }),
  scapPushUp({ name: "Scapular Push-Up", aka: ["Scap Push-Up", "Scapula Push-Up", "Scapular Push Up", "Plank Scapular Push-Up"], primary: ["upper_back"], secondary: ["chest", "abs"] }),
  scapPushUp({ name: "Decline Scapular Push-Up", aka: ["Decline Scap Push-Up", "Feet-Elevated Scapular Push-Up"], on: "decline", primary: ["upper_back"], secondary: ["chest", "delts_front", "abs"] }),
  scapPushUp({ name: "Weighted Scapular Push-Up", aka: ["Weighted Scap Push-Up", "Plate Scapular Push-Up"], plate: true, primary: ["upper_back"], secondary: ["chest", "abs"] }),
  scapPushUp({ name: "Push-Up Plus", aka: ["Push Up Plus", "Push-Up with Protraction", "Serratus Push-Up"], plus: true, primary: ["chest", "upper_back"], secondary: ["triceps", "delts_front", "abs"] }),
  dip({ name: "Dip", primary: ["chest", "triceps"], secondary: ["delts_front"] }),
  dip({ name: "Straight-Bar Dip", straightBar: true, primary: ["chest", "triceps"], secondary: ["delts_front", "abs"] }),
  dip({ name: "Straight-Bar Support Hold", straightBar: true, support: true, primary: ["triceps", "chest"], secondary: ["delts_front", "abs", "forearms"] }),
  dip({ name: "Ring Support Hold", rings: true, support: true, primary: ["triceps", "chest"], secondary: ["delts_front", "abs", "forearms"] }),
  dip({ name: "Ring Dip", rings: true, primary: ["chest", "triceps"], secondary: ["delts_front", "abs"] }),
  koreanDip({ name: "Rear Support Hold", aka: ["Korean Dip Support Hold", "Straight-Bar Rear Support", "Reverse Support Hold"], hold: true, primary: ["triceps", "delts_front"], secondary: ["chest", "abs", "forearms"] }),
  koreanDip({ name: "Korean Dip", aka: ["Korean Dips", "Rear Support Dip"], primary: ["triceps", "chest", "delts_front"], secondary: ["abs", "forearms"] }),
  negative(koreanDip({ name: "Korean Dip", primary: ["triceps", "chest", "delts_front"], secondary: ["abs", "forearms"] }), "Korean Dip Negative", ["Negative Korean Dip"]),
  overheadPress({ name: "Overhead Press", primary: ["delts_front", "delts_side"], secondary: ["triceps", "traps", "abs"] }),
  overheadPress({ name: "Push Press", dip: true, primary: ["delts_front", "delts_side", "triceps"], secondary: ["quads", "glutes"] }),
  landminePress,
  shoulderPressMachine,
  dumbbellShoulderPress,
  arnoldPress,
  lateralRaise,
  cableLateralRaise,
  barbellFrontRaise,
  barbellCubanPress,
  rearDeltFly,
  reversePecDeck,
  facePull,
  handstand({ name: "Handstand Hold", primary: ["delts_front", "triceps"], secondary: ["traps", "abs", "forearms"] }),
  handstand({ name: "Freestanding Handstand", free: true, primary: ["delts_front", "triceps"], secondary: ["upper_back", "abs", "forearms"] }),
  handstand({ name: "Deficit Handstand Push-Up", push: true, deficit: true, primary: ["delts_front", "triceps"], secondary: ["upper_back", "traps", "abs"] }),
  handstand({ name: "Handstand Push-Up", push: true, primary: ["delts_front", "triceps"], secondary: ["traps", "chest"] }),
  planchLean,
  pseudoPlanchePushUp,
  tuckPlancheHold,
  tuckPlanchePushUp,
  tuckPress,
  negative(tuckPress, "Tuck Press Negative", ["Tuck Press Lowering", "Handstand to Tuck Planche Negative"]),
  boxPikeStack,
  wallSingleLegPull,
  wallShoulderStack,
  wallLSweep,
  wallToePull,
];

