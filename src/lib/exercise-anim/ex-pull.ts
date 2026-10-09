// Rows, pull-ups, pulldowns, and the arm work.

import {
  barbellFar,
  barbellNear,
  box,
  cable,
  cableBarEnd,
  cableTower,
  dumbbellEnd,
  dumbbellSide,
  flatBench,
  lightBarFar,
  lightBarNear,
  pullUpBar,
  pullUpBarAcross,
  pulldownBar,
  ring,
  seat,
  strap,
} from "./equipment";
import {
  add,
  at,
  base,
  grips,
  hold,
  ik2,
  joints,
  LEN,
  lerp,
  limb,
  line,
  mirror,
  onTrunk,
  palms,
  plant,
  plantLeg,
  rot,
  seated,
  shoulders,
  stand,
  STAND,
  sub,
  supine,
  turned,
  v,
  type Pose,
  type PropState,
  type Spec,
  type V,
} from "./kit";
import type { Prop } from "./render";

const barbell = (): Prop[] => [
  { id: "bar", draw: barbellFar(), layer: "back" },
  { id: "bar", draw: barbellNear(), layer: "front" },
];
const lightBar = (): Prop[] => [
  { id: "bar", draw: lightBarFar(), layer: "back" },
  { id: "bar", draw: lightBarNear(), layer: "front" },
];

// --- Rows ------------------------------------------------------------------------

function barbellRow(o: { name: string; aka?: string[]; torso: number; fromFloor?: boolean; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 2.6,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.85,
    props: barbell(),
    motion: (p) => {
      const probe = (pose: Pose) => shoulders(pose).N;
      let pose = stand(o.fromFloor ? -78 : -86, { torso: o.torso, pelvis: o.torso * 0.85, head: o.torso * 0.6 }, { probe, over: 14 });
      const s = shoulders(pose).N;
      const low = o.fromFloor ? v(s.x, -22) : add(s, v(0, 58));
      const high = onTrunk(pose, v(19, -12));
      const bar = v(lerp(low.x, high.x, p), lerp(low.y, high.y, p));
      pose = hold(pose, "side", bar, undefined, -1);
      return { pose, props: { bar: at(bar) } };
    },
  };
}

const dumbbellRow: Spec = {
  name: "Dumbbell Row",
  aka: ["Single-Arm Dumbbell Row"],
  mode: "alternate",
  seconds: 2.6,
  hands: { N: "fist", F: "palm" },
  primary: ["lats", "upper_back"],
  secondary: ["biceps", "delts_rear"],
  still: 0.9,
  scene: [{ draw: flatBench(-26, 54, -44), layer: "back" }],
  props: [{ id: "db", draw: dumbbellEnd(6.5), layer: "front" }],
  motion: (p) => {
    const hip = v(-8, -94);
    const torso = -84;
    let pose = base(hip, { torso, pelvis: -80, head: -72 });
    pose = { ...pose, legF: { ...plantLeg(hip, v(-50, -52), -180, 1) } };
    pose = { ...pose, legN: plantLeg(hip, v(-30, -8), 0, 1) };
    const s = shoulders(pose).N;
    const hang = add(s, v(1, 58));
    const top = onTrunk(pose, v(17, -6));
    const g = v(lerp(hang.x, top.x, p), lerp(hang.y, top.y, p));
    const near = hold(pose, "side", g, undefined, -1).armN;
    const far = palms(pose, "side", v(s.x + 2, -44)).armF;
    pose = { ...pose, armN: near, armF: far };
    return { pose, props: { db: at(g) } };
  },
};

const chestSupportedRow: Spec = {
  name: "Chest-Supported Row",
  mode: "alternate",
  seconds: 2.6,
  hands: { N: "fist" },
  primary: ["upper_back", "lats"],
  secondary: ["delts_rear", "biceps"],
  still: 0.9,
  props: [
    { id: "pad", draw: { svg: `<rect class="pad" x="-4" y="-44" width="8" height="84" rx="3.5"/><rect class="frame" x="-1.5" y="38" width="3" height="40"/>`, box: [-4, -44, 4, 78] }, layer: "back" },
    { id: "dbF", draw: dumbbellEnd(6.5), layer: "back" },
    { id: "dbN", draw: dumbbellEnd(6.5), layer: "front" },
  ],
  motion: (p) => {
    const torso = -52;
    let pose = base(v(-14, -88), { torso, pelvis: -40, head: -40 });
    pose = plant(pose, "side", v(-36, -8));
    const s = shoulders(pose).N;
    const hang = add(s, v(0, 58));
    const top = onTrunk(pose, v(20, -10));
    const g = v(lerp(hang.x, top.x, p), lerp(hang.y, top.y, p));
    pose = hold(pose, "side", g, undefined, -1);
    const gr = grips(pose);
    return {
      pose,
      props: { pad: turned(onTrunk(pose, v(19, -22)), torso), dbN: at(gr.N), dbF: at(add(gr.F, v(-2.2, -1))) },
    };
  },
};

const LOW_PULLEY = v(96, -30);
const seatedCableRow: Spec = {
  name: "Seated Cable Row",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["upper_back", "lats"],
  secondary: ["biceps", "delts_rear", "lower_back"],
  still: 1,
  scene: [
    { draw: cableTower(LOW_PULLEY.x + 4, LOW_PULLEY), layer: "back" },
    { draw: box(-24, 18, -30, "pad"), layer: "back" },
    { draw: { svg: `<path class="frame" d="M66 -4L76 -40L80 -40L72 -4Z"/>`, box: [66, -40, 80, -4] }, layer: "back" },
  ],
  props: [
    { id: "c", draw: cable(), layer: "back" },
    { id: "h", draw: cableBarEnd(), layer: "front" },
  ],
  motion: (p) => {
    const torso = lerp(-18, 6, p);
    let pose = base(v(0, -42), { torso, pelvis: torso * 0.6, head: torso * 0.5 });
    pose = plant(pose, "side", v(70, -22), v(70, -22), { N: 60, F: 60 });
    const s = shoulders(pose).N;
    const reach = add(s, v(56, 10));
    const pulled = onTrunk(pose, v(20, -12));
    const g = v(lerp(reach.x, pulled.x, p), lerp(reach.y, pulled.y, p));
    pose = hold(pose, "side", g, undefined, -1);
    return { pose, props: { c: line(LOW_PULLEY, g), h: at(g) } };
  },
};

// Body straight from the heels, hanging under a bar or rings at `anchor`:
// solve the tilt that puts the shoulders `reach` from the hands.
function underBar(heel: V, grip: V, reach: number): Pose {
  let lo = 0;
  let hi = 80;
  const at1 = (t: number) => {
    const body = 90 - t;
    const hip = sub(heel, rot(v(0, 87), body));
    return { ...base(hip, { torso: body, pelvis: body, head: body + 4 }), legN: limb(body), legF: limb(body) };
  };
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const s = shoulders(at1(mid)).N;
    if (Math.hypot(s.x - grip.x, s.y - grip.y) > reach) lo = mid;
    else hi = mid;
  }
  return at1((lo + hi) / 2);
}

function invertedRow(o: { name: string; rings?: boolean; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  const grip = o.rings ? v(-40, -112) : v(-44, -92);
  return {
    name: o.name,
    mode: "alternate",
    seconds: 2.6,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.9,
    scene: o.rings
      ? []
      : [{ draw: { svg: `<rect class="frame" x="-50" y="-170" width="5" height="170"/><circle class="steel" cx="${grip.x}" cy="${grip.y}" r="2.4"/>`, box: [-50, -170, -40, 0] }, layer: "back" }],
    props: o.rings
      ? [
          { id: "sN", draw: strap(), layer: "back" },
          { id: "rN", draw: ring(), layer: "front" },
        ]
      : [],
    motion: (p) => {
      const heel = v(62, -8);
      let pose = underBar(heel, grip, lerp(61, 16, p));
      pose = hold(pose, "side", grip, undefined, -1);
      const props: Record<string, PropState> = {};
      if (o.rings) {
        props.rN = at(grip);
        props.sN = line(v(grip.x, -250), grip);
      }
      return { pose, props };
    },
  };
}

// --- Vertical pulls -------------------------------------------------------------

const ACROSS = -238;

function pullUpBack(o: {
  name: string;
  aka?: string[];
  gripX?: number;
  plate?: boolean;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  const gx = o.gripX ?? 31;
  return {
    name: o.name,
    aka: o.aka,
    view: "back",
    mode: "alternate",
    seconds: 3,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.7,
    scene: [{ draw: pullUpBarAcross(ACROSS), layer: "back" }],
    props: o.plate
      ? [
          { id: "chain", draw: { svg: `<path d="M-6 0L0 22L6 0" fill="none" stroke="#5b6461" stroke-width="1"/><rect class="iron" x="-14" y="20" width="28" height="9" rx="2"/>`, box: [-14, 0, 14, 29] }, layer: "front" },
        ]
      : [],
    motion: (p) => {
      const hangY = ACROSS + Math.sqrt(61.6 ** 2 - (gx - 19) ** 2) - 0.2;
      const shoulderY = lerp(hangY, ACROSS + 9, p);
      const shrug = lerp(4, -2.5, p);
      const lumbar = v(0, shoulderY + 38 + shrug);
      const hip = v(0, lumbar.y + 11);
      const { upper, lower } = ik2(v(19, shoulderY), v(gx, ACROSS), LEN.upperArm, LEN.forearm + LEN.grip, -1);
      const arm = { upper, lower, end: lower };
      const leg = { upper: lerp(1, 3, p), lower: lerp(-1, -3, p), end: 0 };
      const pose: Pose = { ...STAND, hip, shrug, armN: arm, armF: mirror(arm), legN: leg, legF: mirror(leg) };
      const props: Record<string, PropState> = {};
      if (o.plate) props.chain = at(add(hip, v(0, 6)));
      return { pose, props };
    },
  };
}

// Side-on pull-up for the grips that pull in the plane: chin-up and neutral.
const SIDE_BAR = v(6, -236);
function pullUpSide(o: { name: string; aka?: string[]; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 3,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.75,
    scene: [{ draw: pullUpBar(SIDE_BAR), layer: "back" }],
    motion: (p) => {
      const torso = lerp(2, 14, p);
      const shoulder = add(SIDE_BAR, v(lerp(-2, -12, p), lerp(61.4, 12, p)));
      const lumbar = sub(shoulder, rot(v(0, -41), torso));
      const hip = sub(lumbar, rot(v(0, -11), torso));
      let pose = base(hip, { torso, pelvis: torso, head: torso - 10 });
      pose = { ...pose, legN: limb(lerp(4, 16, p), lerp(-2, -30, p), -20), legF: limb(lerp(0, 10, p), lerp(-8, -36, p), -24) };
      pose = hold(pose, "side", SIDE_BAR, undefined, 1);
      return { pose };
    },
  };
}

const latPulldown: Spec = {
  name: "Lat Pulldown",
  view: "back",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["lats"],
  secondary: ["upper_back", "biceps", "delts_rear"],
  still: 0.85,
  scene: [
    { draw: { svg: `<rect class="frame" x="-4" y="-290" width="8" height="66"/><circle class="steel" cx="0" cy="-226" r="4"/><rect class="pad" x="-22" y="-60" width="44" height="7" rx="3"/>`, box: [-22, -290, 22, -53] }, layer: "back" },
    { draw: { svg: `<rect class="pad" x="-26" y="-100" width="52" height="7" rx="3.5"/>`, box: [-26, -100, 26, -93] }, layer: "back" },
  ],
  props: [
    { id: "c", draw: cable(), layer: "back" },
    { id: "bar", draw: pulldownBar(42), layer: "back" },
  ],
  motion: (p) => {
    let pose = base(v(0, -68));
    const thigh = { ...limb(178, 0, 0), ku: 0.32 };
    pose = { ...pose, legN: thigh, legF: mirror(thigh) };
    const s = shoulders(pose, "back");
    const barY = lerp(s.N.y - 58, s.N.y - 4, p);
    const gx = 33;
    const { upper, lower } = ik2(s.N, v(gx, barY), LEN.upperArm, LEN.forearm + LEN.grip, -1);
    const arm = { upper, lower, end: lower };
    pose = { ...pose, armN: arm, armF: mirror(arm) };
    return { pose, props: { bar: at(v(0, barY)), c: line(v(0, -226), v(0, barY)) } };
  },
};

const HIGH = v(70, -212);

const neutralPulldown: Spec = {
  name: "Neutral-Grip Pulldown",
  aka: ["Close-Grip Pulldown"],
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["lats"],
  secondary: ["biceps", "upper_back"],
  still: 0.85,
  scene: [
    { draw: cableTower(HIGH.x + 4, HIGH), layer: "back" },
    { draw: seat(-14, 22, -50), layer: "back" },
  ],
  props: [
    { id: "c", draw: cable(), layer: "back" },
    { id: "h", draw: cableBarEnd(), layer: "front" },
  ],
  motion: (p) => {
    let pose = seated(-50, 30, { torso: -8, head: -4 });
    const s = shoulders(pose).N;
    const top = add(s, v(14, -56));
    const chest = onTrunk(pose, v(22, -32));
    const g = v(lerp(top.x, chest.x, p), lerp(top.y, chest.y, p));
    pose = hold(pose, "side", g, undefined, -1);
    return { pose, props: { c: line(HIGH, g), h: at(g) } };
  },
};

const straightArmPulldown: Spec = {
  name: "Straight-Arm Pulldown",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["lats"],
  secondary: ["triceps", "abs"],
  still: 1,
  scene: [{ draw: cableTower(HIGH.x + 4, HIGH), layer: "back" }],
  props: [
    { id: "c", draw: cable(), layer: "back" },
    { id: "h", draw: cableBarEnd(), layer: "front" },
  ],
  motion: (p) => {
    const probe = (pose: Pose) => shoulders(pose).N;
    let pose = stand(-92, { torso: -24, pelvis: -18, head: -12 }, { probe, over: 6, ankleN: v(-6, -8) });
    const a = lerp(146, 8, p);
    pose = { ...pose, armN: limb(a, a - 6, a - 6), armF: limb(a, a - 6, a - 6) };
    const g = grips(pose).N;
    return { pose, props: { c: line(HIGH, g), h: at(g) } };
  },
};

const dumbbellPullover: Spec = {
  name: "Dumbbell Pullover",
  mode: "alternate",
  seconds: 3.2,
  hands: { N: "fist" },
  primary: ["lats", "chest"],
  secondary: ["triceps", "abs"],
  still: 1,
  scene: [{ draw: flatBench(-108, 6, -44), layer: "back" }],
  props: [{ id: "db", draw: dumbbellSide(), layer: "front" }],
  motion: (p) => {
    let pose = supine(-44, 0, { torso: 88, pelvis: 90, head: 92 });
    pose = plant(pose, "side", v(46, -8));
    const a = lerp(178, 264, p);
    pose = { ...pose, armN: limb(a, a + 6, a + 6), armF: limb(a, a + 6, a + 6) };
    return { pose, props: { db: turned(grips(pose).N, a) } };
  },
};

// --- Arms -------------------------------------------------------------------------

function curl(o: {
  name: string;
  aka?: string[];
  load: "barbell" | "dumbbells" | "hammer" | "cable";
  incline?: boolean;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  const pulley = v(44, -14);
  const props: Prop[] =
    o.load === "barbell"
      ? lightBar()
      : o.load === "dumbbells"
        ? [
            { id: "dbF", draw: dumbbellEnd(6), layer: "back" },
            { id: "dbN", draw: dumbbellEnd(6), layer: "front" },
          ]
        : o.load === "hammer"
          ? [
              { id: "dbF", draw: dumbbellSide(), layer: "back" },
              { id: "dbN", draw: dumbbellSide(), layer: "front" },
            ]
          : [
              { id: "c", draw: cable(), layer: "back" },
              { id: "bar", draw: cableBarEnd(), layer: "front" },
            ];
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 2.6,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.75,
    scene: [
      ...(o.load === "cable" ? [{ draw: cableTower(pulley.x + 4, pulley), layer: "back" as const }] : []),
      ...(o.incline ? [{ draw: seat(-30, 6, -50), layer: "back" as const }] : []),
    ],
    props: [
      ...(o.incline
        ? [{ id: "back", draw: { svg: `<rect class="pad" x="-4" y="-46" width="8" height="84" rx="3.5"/>`, box: [-4, -46, 4, 38] as [number, number, number, number] }, layer: "back" as const }]
        : []),
      ...props,
    ],
    motion: (p) => {
      let pose = o.incline
        ? seated(-50, 46, { torso: 40, pelvis: 30, head: 20 })
        : stand(-94.4, { torso: -2, head: 0 });
      const upper = o.incline ? lerp(0, -6, p) : lerp(-2, 10, p);
      const fore = upper + lerp(4, 142, p);
      const arm = limb(upper, fore, fore);
      pose = { ...pose, armN: arm, armF: { ...arm } };
      const g = grips(pose);
      const out: Record<string, PropState> = {};
      if (o.load === "barbell") out.bar = at(g.N);
      if (o.load === "dumbbells") {
        out.dbN = at(g.N);
        out.dbF = at(add(g.F, v(-2.2, -1)));
      }
      if (o.load === "hammer") {
        out.dbN = turned(g.N, fore);
        out.dbF = turned(add(g.F, v(-2.2, -1)), fore);
      }
      if (o.load === "cable") {
        out.c = line(pulley, g.N);
        out.bar = at(g.N);
      }
      if (o.incline) out.back = turned(onTrunk(pose, v(-19.5, -18)), pose.torso);
      return { pose, props: out };
    },
  };
}

const skullcrusher: Spec = {
  name: "Dumbbell Skullcrusher",
  aka: ["Skullcrusher", "Barbell Lying Triceps Extension"],
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["triceps"],
  still: 1,
  scene: [{ draw: flatBench(-108, 6, -44), layer: "back" }],
  props: [
    { id: "dbF", draw: dumbbellEnd(6), layer: "back" },
    { id: "dbN", draw: dumbbellEnd(6), layer: "front" },
  ],
  motion: (p) => {
    let pose = supine(-44, 0, { torso: 88, pelvis: 90, head: 92 });
    pose = plant(pose, "side", v(46, -8));
    const fore = lerp(184, 262, p);
    const arm = limb(196, fore, fore);
    pose = { ...pose, armN: arm, armF: { ...arm } };
    const g = grips(pose);
    return { pose, props: { dbN: at(g.N), dbF: at(add(g.F, v(-2.2, -1))) } };
  },
};

const overheadTricepsExtension: Spec = {
  name: "Overhead Triceps Extension",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["triceps"],
  secondary: ["abs"],
  still: 1,
  props: [{ id: "db", draw: dumbbellSide(), layer: "front" }],
  motion: (p) => {
    const pose0 = stand(-94.4, { torso: -2, head: 0 });
    const fore = lerp(186, 336, p);
    const arm = limb(172, fore, fore);
    const pose = { ...pose0, armN: arm, armF: { ...arm } };
    return { pose, props: { db: turned(grips(pose).N, fore + 90) } };
  },
};

const PUSHDOWN_PULLEY = v(36, -206);
const tricepsPushdown: Spec = {
  name: "Triceps Pushdown",
  aka: ["Cable Pushdown", "Rope Pushdown"],
  mode: "alternate",
  seconds: 2.6,
  hands: { N: "fist" },
  primary: ["triceps"],
  secondary: ["forearms"],
  still: 0.2,
  scene: [{ draw: cableTower(40, PUSHDOWN_PULLEY), layer: "back" }],
  props: [
    { id: "cable", draw: cable(), layer: "back" },
    { id: "handle", draw: cableBarEnd(), layer: "front" },
  ],
  motion: (p) => {
    let pose = stand(-93.4, { torso: -10, pelvis: -7, head: -4 }, { hipX: -3 });
    const fore = lerp(98, 4, p);
    const arm = limb(6, fore, fore);
    pose = { ...pose, armN: arm, armF: { ...arm } };
    const g = grips(pose).N;
    return { pose, props: { cable: line(PUSHDOWN_PULLEY, g), handle: at(g) } };
  },
};

// Forearms along the thighs, the hands hinging at the wrist over the knees.
function wristWork(o: { name: string; band?: boolean; twist?: boolean; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  return {
    name: o.name,
    mode: "alternate",
    seconds: 2.2,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 1,
    scene: [{ draw: box(-24, 14, -50), layer: "back" }],
    props: o.band
      ? [{ id: "band", draw: { svg: `<path class="band" d="M0 0H1" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "front" }]
      : o.twist
        ? [{ id: "tool", draw: { svg: `<rect class="wood" x="-1.4" y="-2" width="2.8" height="24" rx="1"/><rect class="iron" x="-6" y="20" width="12" height="6" rx="1.5"/>`, box: [-6, -2, 6, 26] }, layer: "front" }]
        : [{ id: "db", draw: dumbbellEnd(5.5), layer: "front" }],
    motion: (p) => {
      let pose = seated(-50, 40, { torso: -26, pelvis: -10, head: -14 });
      const j = joints(pose);
      // Forearm resting along the top of the thigh, wrist just past the knee.
      const elbow = add(j.kneeN, v(-26, -9));
      const s = shoulders(pose).N;
      const up = ik2(s, elbow, LEN.upperArm, 0.01, -1);
      const hand = o.twist ? 90 : lerp(150, 50, p);
      pose = { ...pose, armN: limb(up.upper, 90, hand), armF: limb(up.upper, 90, hand) };
      const g = grips(pose).N;
      const props: Record<string, PropState> = {};
      if (o.band) props.band = line(v(j.ankleN.x + 6, -2), g);
      else if (o.twist) props.tool = { at: g, angle: 180, scaleX: 1 - 0.7 * p };
      else props.db = at(g);
      return { pose, props };
    },
  };
}

export const PULL: Spec[] = [
  barbellRow({ name: "Barbell Row", aka: ["Bent-Over Row"], torso: -52, primary: ["lats", "upper_back"], secondary: ["biceps", "delts_rear", "lower_back"] }),
  barbellRow({ name: "Pendlay Row", torso: -82, fromFloor: true, primary: ["upper_back", "lats"], secondary: ["biceps", "delts_rear", "lower_back"] }),
  dumbbellRow,
  chestSupportedRow,
  seatedCableRow,
  invertedRow({ name: "Inverted Row", primary: ["upper_back", "lats"], secondary: ["biceps", "delts_rear"] }),
  invertedRow({ name: "Ring Row", rings: true, primary: ["upper_back", "lats"], secondary: ["biceps", "delts_rear", "abs"] }),
  pullUpBack({ name: "Pull-Up", aka: ["Pull Up"], primary: ["lats", "upper_back"], secondary: ["biceps", "delts_rear", "forearms"] }),
  pullUpBack({ name: "Weighted Pull-Up", plate: true, primary: ["lats", "upper_back"], secondary: ["biceps", "forearms", "abs"] }),
  pullUpSide({ name: "Chin-Up", aka: ["Chin Up"], primary: ["lats", "biceps"], secondary: ["upper_back", "forearms"] }),
  pullUpSide({ name: "Neutral-Grip Pull-Up", primary: ["lats", "biceps"], secondary: ["upper_back", "forearms"] }),
  latPulldown,
  neutralPulldown,
  straightArmPulldown,
  dumbbellPullover,
  curl({ name: "Barbell Curl", load: "barbell", primary: ["biceps"], secondary: ["forearms"] }),
  curl({ name: "Dumbbell Curl", aka: ["Bicep Curl", "Biceps Curl"], load: "dumbbells", primary: ["biceps"], secondary: ["forearms"] }),
  curl({ name: "Hammer Curl", load: "hammer", primary: ["biceps", "forearms"] }),
  curl({ name: "Incline Curl", aka: ["Incline Dumbbell Curl"], load: "dumbbells", incline: true, primary: ["biceps"], secondary: ["forearms"] }),
  curl({ name: "Cable Curl", load: "cable", primary: ["biceps"], secondary: ["forearms"] }),
  skullcrusher,
  overheadTricepsExtension,
  tricepsPushdown,
  wristWork({ name: "Reverse Wrist Curl", primary: ["forearms"] }),
  wristWork({ name: "Band Wrist Extension", band: true, primary: ["forearms"] }),
  wristWork({ name: "Pronator Twist", twist: true, primary: ["forearms"] }),
];

