// Squats, lunges, hinges, bridges and the leg machines.

import {
  barbellFar,
  barbellNear,
  box,
  cable,
  cableTower,
  dumbbellEnd,
  dumbbellGoblet,
  flatBench,
  hyperBench,
  kettlebell,
  kettlebellGoblet,
  legPressFrame,
  legPressSled,
  roller,
  seat,
  step,
} from "./equipment";
import {
  add,
  at,
  base,
  FOOT,
  grips,
  hold,
  joints,
  kf,
  kfv,
  lerp,
  limb,
  line,
  onTrunk,
  palms,
  plant,
  plantLeg,
  rot,
  shoulders,
  stand,
  sub,
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
const dumbbells = (r = 6.5): Prop[] => [
  { id: "dbF", draw: dumbbellEnd(r), layer: "back" },
  { id: "dbN", draw: dumbbellEnd(r), layer: "front" },
];
const dbAt = (pose: Pose) => {
  const g = grips(pose);
  return { dbN: at(g.N), dbF: at(add(g.F, v(-2.2, -1))) };
};

// Arms hanging straight down, a little forward, holding something.
const hanging = (pose: Pose, forward = 4): Pose => ({ ...pose, armN: limb(forward), armF: limb(forward) });

// --- Squats -------------------------------------------------------------------------

type SquatLoad = "back" | "front" | "overhead" | "goblet-db" | "goblet-kb" | "none" | "box" | "hack";

const BAR_ON_BACK = v(-9.5, -39.5);
const BAR_IN_FRONT = v(13, -37);
const GOBLET = v(19, -27);

function squat(o: {
  name: string;
  aka?: string[];
  load: SquatLoad;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  const lean = { back: -44, front: -24, overhead: -18, "goblet-db": -26, "goblet-kb": -26, none: -36, box: -44, hack: -12 }[o.load];
  const bottom = o.load === "box" ? -56 : o.load === "hack" ? -52 : -47;
  const scene =
    o.load === "box"
      ? [{ draw: box(-62, -32, -50), layer: "back" as const }]
      : o.load === "hack"
        ? [{ draw: hackRails(), layer: "back" as const }]
        : [];
  const props: Prop[] =
    o.load === "back" || o.load === "front" || o.load === "overhead"
      ? barbell()
      : o.load === "goblet-db"
        ? [{ id: "w", draw: dumbbellGoblet(), layer: "front" }]
        : o.load === "goblet-kb"
          ? [{ id: "w", draw: kettlebellGoblet(), layer: "front" }]
          : o.load === "hack"
            ? [{ id: "pad", draw: { svg: `<rect class="pad" x="-4" y="-30" width="8" height="60" rx="3.5"/>`, box: [-4, -30, 4, 30] }, layer: "back" }]
            : [];
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 3.4,
    hands: { N: o.load === "none" || o.load === "box" ? "hand" : "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.75,
    scene,
    props,
    motion: (p) => {
      if (o.load === "hack") return hackFrame(p);
      const torso = lerp(-4, lean, p);
      const trunk = { torso, pelvis: torso * 0.88, head: torso * 0.45 };
      const probe = (pose: Pose) =>
        o.load === "back" ? onTrunk(pose, BAR_ON_BACK)
        : o.load === "front" ? onTrunk(pose, BAR_IN_FRONT)
        : o.load === "overhead" ? shoulders(pose).N
        : onTrunk(pose, v(4, -22));
      const over = o.load === "box" ? lerp(2, -14, p) : o.load === "none" ? 0 : 6;
      let pose = stand(lerp(-94.4, bottom, p), trunk, { probe, over, ankleN: v(o.load === "box" ? 2 : 0, -8) });
      const props: Record<string, ReturnType<typeof at>> = {};
      if (o.load === "back") {
        const bar = onTrunk(pose, BAR_ON_BACK);
        pose = hold(pose, "side", add(bar, v(0.5, 0.5)), undefined, 1);
        props.bar = at(bar);
      } else if (o.load === "front") {
        const bar = onTrunk(pose, BAR_IN_FRONT);
        const s = shoulders(pose).N;
        // Elbows high and forward, hands back to the shoulders: the arm can't
        // reach that in a flat drawing, so pose it rather than solve it.
        pose = { ...pose, armN: limb(torso + 96, torso + 96 + 168), armF: limb(torso + 96, torso + 96 + 168) };
        void s;
        props.bar = at(bar);
      } else if (o.load === "overhead") {
        const s = shoulders(pose).N;
        const bar = add(s, rot(v(0, 60.5), 184));
        pose = hold(pose, "side", bar, undefined, -1);
        props.bar = at(bar);
      } else if (o.load === "goblet-db" || o.load === "goblet-kb") {
        const g = onTrunk(pose, GOBLET);
        pose = hold(pose, "side", g, undefined, -1);
        props.w = turned(g, torso * 0.5);
      } else {
        const reach = lerp(18, 86, p);
        pose = { ...pose, armN: limb(reach), armF: limb(reach - 4) };
      }
      return { pose, props };
    },
  };
}

// The hack squat leans back into a pad that slides on rails parallel to the
// trunk; the feet sit forward on an angled plate.
const HACK_LEAN = 18;
const HACK_ANKLE = v(22, -14);
const HACK_UP = rot(v(0, -1), HACK_LEAN);
const hackHip = (s: number) => add(HACK_ANKLE, add(v(-22, -84), v(-HACK_UP.x * s, -HACK_UP.y * s)));
const hackPad = (hip: V) => add(hip, rot(v(-14.5, -32), HACK_LEAN));

function hackRails() {
  const a = add(hackPad(hackHip(52)), v(-HACK_UP.x * 26, -HACK_UP.y * 26));
  const b = add(hackPad(hackHip(-4)), v(HACK_UP.x * 40, HACK_UP.y * 40));
  const o = rot(v(-5, 0), HACK_LEAN);
  const r = (q: V) => `${Math.round(q.x * 10) / 10} ${Math.round(q.y * 10) / 10}`;
  return {
    svg:
      `<path class="frame" d="M${r(add(a, o))}L${r(add(b, o))}L${r(add(b, add(o, rot(v(-5, 0), HACK_LEAN))))}L${r(add(a, add(o, rot(v(-5, 0), HACK_LEAN))))}Z"/>` +
      `<rect class="frame" x="${Math.round(a.x - 30)}" y="-4" width="${Math.round(HACK_ANKLE.x - a.x + 50)}" height="4" rx="1"/>` +
      `<path class="frame" d="M${r(add(a, o))}L${r(v(a.x - 8, 0))}L${r(v(a.x - 2, 0))}Z"/>` +
      `<path class="pad" d="M${HACK_ANKLE.x - 8} -4L${HACK_ANKLE.x + 26} -4L${HACK_ANKLE.x + 26} -10L${HACK_ANKLE.x - 8} -6Z"/>`,
    box: [Math.min(a.x, b.x) - 30, b.y - 4, HACK_ANKLE.x + 30, 0] as [number, number, number, number],
  };
}

function hackFrame(p: number) {
  const hip = hackHip(lerp(0, 44, p));
  let pose = base(hip, { torso: HACK_LEAN, pelvis: HACK_LEAN - 6, head: 6 });
  pose = plant(pose, "side", HACK_ANKLE, HACK_ANKLE, { N: 8, F: 8 });
  const s = shoulders(pose).N;
  pose = hold(pose, "side", add(s, v(5, -7)), undefined, -1);
  return { pose, props: { pad: turned(hackPad(hip), HACK_LEAN) } };
}

// --- Lunges ------------------------------------------------------------------------

type LungeLoad = "none" | "dumbbells" | "back";

function loadProps(load: LungeLoad): Prop[] {
  return load === "dumbbells" ? dumbbells() : load === "back" ? barbell() : [];
}

function carry(pose: Pose, load: LungeLoad): { pose: Pose; props: Record<string, PropState> } {
  if (load === "dumbbells") {
    const p2 = hanging(pose, 2);
    return { pose: p2, props: dbAt(p2) };
  }
  if (load === "back") {
    const bar = onTrunk(pose, BAR_ON_BACK);
    return { pose: hold(pose, "side", add(bar, v(0.5, 0.5)), undefined, 1), props: { bar: at(bar) } };
  }
  return { pose: { ...pose, armN: limb(-6, 30), armF: limb(-6, 30) }, props: {} };
}

// The rear foot on its toes: ankle above the ball of the foot.
const REAR_FOOT = -55;
const rearAnkle = (ballX: number) => sub(v(ballX, 0), rot(FOOT.ball, REAR_FOOT));

function lunge(o: {
  name: string;
  aka?: string[];
  kind: "reverse" | "forward" | "split" | "bulgarian";
  load: LungeLoad;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  const scene = o.kind === "bulgarian" ? [{ draw: flatBench(-96, -40, -44), layer: "back" as const }] : [];
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 3.2,
    hands: { N: o.load === "none" ? "hand" : "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.8,
    scene,
    props: loadProps(o.load),
    motion: (p) => {
      let front: V;
      let rear: V;
      let rearFoot: number;
      let hip: V;
      if (o.kind === "reverse") {
        front = v(14, -8);
        rear = kfv(p, [[0, v(14, -8)], [0.35, v(-8, -16)], [1, rearAnkle(-46)]]);
        rearFoot = kf(p, [[0, 0], [0.35, -30], [1, REAR_FOOT]]);
        hip = kfv(p, [[0, v(12, -94.2)], [1, v(-10, -54)]]);
      } else if (o.kind === "forward") {
        rear = kfv(p, [[0, v(-10, -8)], [0.3, v(-10, -8)], [1, rearAnkle(-16)]]);
        rearFoot = kf(p, [[0, 0], [0.3, 0], [1, REAR_FOOT]]);
        front = kfv(p, [[0, v(-10, -8)], [0.5, v(22, -14)], [1, v(46, -8)]]);
        hip = kfv(p, [[0, v(-10, -94.2)], [1, v(12, -54)]]);
      } else if (o.kind === "split") {
        front = v(26, -8);
        rear = rearAnkle(-30);
        rearFoot = REAR_FOOT;
        hip = kfv(p, [[0, v(-1, -88)], [1, v(-3, -54)]]);
      } else {
        front = v(28, -8);
        rear = v(-44, -51);
        rearFoot = -150;
        hip = kfv(p, [[0, v(2, -90)], [1, v(-4, -54)]]);
      }
      const torso = o.kind === "bulgarian" ? lerp(-6, -16, p) : -4;
      let pose = base(hip, { torso, pelvis: torso * 0.6, head: 0 });
      pose = {
        ...pose,
        legN: plantLeg(hip, front, 0, 1),
        legF: plantLeg(hip, rear, rearFoot, 1),
      };
      return carry(pose, o.load);
    },
  };
}

// --- Hinges ------------------------------------------------------------------------

// Arms hang plumb from the shoulders to a bar at `bar`: where must the hip
// be for a trunk at `torso`?
function hipUnderBar(bar: V, torso: number, pelvis = torso * 0.95): V {
  const off = add(rot(v(0, -11), pelvis), rot(v(0, -41), torso));
  return v(bar.x - off.x, bar.y - 61.6 - off.y);
}

const LOCKOUT = -146.4 + 61.6;

function deadlift(o: {
  name: string;
  aka?: string[];
  from: number; // bar height at the start
  feet?: number; // platform under the feet
  torsoStart: number;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
  scene?: Spec["scene"];
}): Spec {
  const feet = o.feet ?? 0;
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 3.4,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.25,
    scene: [
      ...(feet ? [{ draw: step(-14, 30, -feet), layer: "back" as const }] : []),
      ...(o.scene ?? []),
    ],
    props: barbell(),
    motion: (p) => {
      // Lifts from the floor, so phase 0 is the bottom.
      const q = 1 - p;
      const barY = lerp(o.from, LOCKOUT - feet, 1 - q);
      const torso = kf(1 - q, [[0, o.torsoStart], [0.4, o.torsoStart + 10], [1, -2]]);
      const bar = v(8, barY);
      const hip = hipUnderBar(bar, torso);
      let pose = base(hip, { torso, pelvis: torso * 0.95, head: torso * 0.55 });
      pose = plant(pose, "side", v(0, -8 - feet));
      pose = { ...pose, armN: limb(0), armF: limb(0) };
      return { pose, props: { bar: at(bar) } };
    },
  };
}

function rdl(o: { name: string; aka?: string[]; load: "barbell" | "dumbbells"; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 3.6,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.8,
    props: o.load === "barbell" ? barbell() : dumbbells(),
    motion: (p) => {
      const torso = lerp(-4, -74, p);
      const arm = lerp(6, 1, p);
      const probe = (pose: Pose) => add(shoulders(pose).N, rot(v(0, 61.6), arm));
      let pose = stand(lerp(-94.2, -86, p), { torso, pelvis: lerp(-2, -66, p), head: torso * 0.7 }, { probe, over: lerp(15, 10, p) });
      pose = { ...pose, armN: limb(arm), armF: limb(arm) };
      const g = grips(pose);
      return { pose, props: o.load === "barbell" ? { bar: at(g.N) } : dbAt(pose) };
    },
  };
}

const goodMorning: Spec = {
  name: "Good Morning",
  mode: "alternate",
  seconds: 3.4,
  hands: { N: "fist" },
  primary: ["hamstrings", "lower_back"],
  secondary: ["glutes"],
  still: 0.8,
  props: barbell(),
  motion: (p) => {
    const torso = lerp(-4, -72, p);
    const probe = (pose: Pose) => onTrunk(pose, BAR_ON_BACK);
    let pose = stand(lerp(-94.2, -88, p), { torso, pelvis: torso * 0.85, head: torso * 0.6 }, { probe, over: lerp(6, 2, p) });
    const bar = onTrunk(pose, BAR_ON_BACK);
    pose = hold(pose, "side", add(bar, v(0.5, 0.5)), undefined, 1);
    return { pose, props: { bar: at(bar) } };
  },
};

function swing(o: { name: string; aka?: string[]; top: number }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 1.8,
    hands: { N: "fist" },
    primary: ["glutes", "hamstrings"],
    secondary: ["lower_back", "delts_front", "forearms"],
    still: 1,
    props: [{ id: "kb", draw: kettlebell(), layer: "front" }],
    motion: (p) => {
      const torso = lerp(-62, -2, p);
      const arm = kf(p, [[0, -28], [0.35, -4], [1, o.top]]);
      const probe = (pose: Pose) => shoulders(pose).N;
      let pose = stand(lerp(-84, -94.4, p), { torso, pelvis: torso * 0.9, head: torso * 0.5 }, { probe, over: lerp(16, 2, p) });
      pose = { ...pose, armN: limb(arm), armF: limb(arm) };
      return { pose, props: { kb: turned(grips(pose).N, arm) } };
    },
  };
}

// --- Bridges -------------------------------------------------------------------

// Supine with the upper back pivoting on `pivot` and feet planted at `ankle`;
// `a` is the trunk angle (90 = flat).
function bridgePose(pivot: V, a: number, ankle: V): Pose {
  const hip = sub(pivot, rot(v(-13, -40), a));
  const pose = base(hip, { torso: a, pelvis: a, head: Math.min(a, 100) });
  return plant(pose, "side", ankle, ankle, {}, 1);
}

const hipThrust: Spec = {
  name: "Barbell Hip Thrust",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["glutes"],
  secondary: ["hamstrings", "quads"],
  still: 1,
  scene: [{ draw: flatBench(-110, -24, -44), layer: "back" }],
  props: [
    { id: "bar", draw: barbellFar(20), layer: "back" },
    { id: "bar", draw: barbellNear(20), layer: "front" },
  ],
  motion: (p) => {
    let pose = bridgePose(v(-27, -44), lerp(58, 92, p), v(42, -8));
    const bar = add(pose.hip, rot(v(13, -6), pose.pelvis));
    pose = hold(pose, "side", add(bar, v(0, -1)), undefined, 1);
    return { pose, props: { bar: at(bar) } };
  },
};

function gluteBridge(o: { name: string; aka?: string[]; single?: boolean; band?: boolean }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 2.6,
    hands: { N: "palm" },
    primary: ["glutes"],
    secondary: o.band ? ["abductors", "hamstrings"] : ["hamstrings"],
    still: 1,
    props: o.band ? [{ id: "band", draw: { svg: `<ellipse class="band" rx="2.6" ry="7.5"/>`, box: [-3, -8, 3, 8] }, layer: "front" }] : [],
    motion: (p) => {
      const a = lerp(92, 116, p);
      let pose = bridgePose(v(-36, -1), a, v(34, -8));
      if (o.single) pose = { ...pose, legN: limb(a - 6, a - 6, a + 40) };
      const s = shoulders(pose).N;
      pose = palms(pose, "side", v(s.x + 44, 0), v(s.x + 44, 0), 90, 1);
      const j = joints(pose);
      const props: Record<string, PropState> = {};
      if (o.band) props.band = turned(add(j.kneeN, rot(v(0, -7), pose.legN.upper)), pose.legN.upper);
      return { pose, props };
    },
  };
}

// --- Machines --------------------------------------------------------------------

const RAIL = 45;
const legPress: Spec = {
  name: "Leg Press",
  mode: "alternate",
  seconds: 3.2,
  hands: { N: "fist" },
  primary: ["quads", "glutes"],
  secondary: ["adductors", "hamstrings"],
  still: 0.85,
  scene: [
    { draw: legPressFrame(v(-30, -30), RAIL, 170), layer: "back" },
    { draw: seat(-24, 12, -44), layer: "back" },
  ],
  props: [
    { id: "sled", draw: legPressSled(RAIL), layer: "back" },
    { id: "back", draw: { svg: `<rect class="pad" x="-4" y="-34" width="8" height="64" rx="3.5"/>`, box: [-4, -34, 4, 30] }, layer: "back" },
  ],
  motion: (p) => {
    const hip = v(0, -56);
    const along = (d: number) => add(hip, v(Math.cos((RAIL * Math.PI) / 180) * d, -Math.sin((RAIL * Math.PI) / 180) * d));
    const ankle = add(along(lerp(80, 44, p)), v(-6, -6));
    let pose = base(hip, { torso: 52, pelvis: 40, head: 30 });
    pose = { ...pose, legN: plantLeg(hip, ankle, 135, 1), legF: plantLeg(hip, add(ankle, v(0, 0)), 135, 1) };
    pose = { ...pose, armN: limb(52, 20, 20), armF: limb(52, 20, 20) };
    const j = joints(pose);
    const plate = add(j.ankleN, rot(v(4, 9), 135));
    return { pose, props: { sled: at(plate), back: turned(onTrunk(pose, v(-17, -24)), pose.torso) } };
  },
};

const legExtension: Spec = {
  name: "Leg Extension",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["quads"],
  still: 1,
  scene: [{ draw: seat(-14, 32, -50, -118), layer: "back" }],
  props: [{ id: "pad", draw: roller(4.8), layer: "front" }],
  motion: (p) => {
    const hip = v(0, -62);
    let pose = base(hip, { torso: 8, pelvis: 6, head: 4 });
    const shin = lerp(-6, 86, p);
    pose = { ...pose, legN: limb(88, shin, shin + 10), legF: limb(88, shin, shin + 10) };
    pose = { ...pose, armN: limb(14, 40, 40), armF: limb(14, 40, 40) };
    const j = joints(pose);
    return { pose, props: { pad: at(add(j.ankleN, rot(v(9, -6), shin))) } };
  },
};

const lyingLegCurl: Spec = {
  name: "Lying Leg Curl",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["hamstrings"],
  secondary: ["calves"],
  still: 1,
  scene: [{ draw: flatBench(-34, 74, -50), layer: "back" }],
  props: [{ id: "pad", draw: roller(4.8), layer: "front" }],
  motion: (p) => {
    const hip = v(0, -61);
    const shin = lerp(-92, -178, p);
    let pose = base(hip, { torso: -88, pelvis: -90, head: -70 });
    pose = { ...pose, legN: limb(-92, shin, shin), legF: limb(-92, shin, shin) };
    const s = shoulders(pose).N;
    pose = hold(pose, "side", v(s.x + 14, -48), undefined, 1);
    const j = joints(pose);
    return { pose, props: { pad: at(add(j.ankleN, rot(v(-8, 0), shin))) } };
  },
};

const seatedLegCurl: Spec = {
  name: "Seated Leg Curl",
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "fist" },
  primary: ["hamstrings"],
  secondary: ["calves"],
  still: 1,
  scene: [{ draw: seat(-14, 30, -50, -118), layer: "back" }],
  props: [
    { id: "pad", draw: roller(4.8), layer: "front" },
    { id: "thigh", draw: roller(4.2), layer: "front" },
  ],
  motion: (p) => {
    const hip = v(0, -62);
    let pose = base(hip, { torso: 12, pelvis: 8, head: 6 });
    const shin = lerp(78, -18, p);
    pose = { ...pose, legN: limb(88, shin, shin + 10), legF: limb(88, shin, shin + 10) };
    pose = { ...pose, armN: limb(14, 40, 40), armF: limb(14, 40, 40) };
    const j = joints(pose);
    return {
      pose,
      props: {
        pad: at(add(j.ankleN, rot(v(-8.5, -4), shin))),
        thigh: at(add(j.kneeN, v(-8, -12))),
      },
    };
  },
};

const backExtension: Spec = {
  name: "Back Extension",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["lower_back", "glutes"],
  secondary: ["hamstrings"],
  still: 0,
  scene: [{ draw: hyperBench(v(10, -66), v(-60, -14)), layer: "back" }],
  motion: (p) => {
    const hip = v(0, -70);
    const torso = lerp(-45, -158, p);
    let pose = base(hip, { torso, pelvis: lerp(-45, -100, p), head: torso + 10 });
    pose = { ...pose, legN: limb(-45, -45, 45), legF: limb(-45, -45, 45) };
    pose = hold(pose, "side", onTrunk(pose, v(16, -30)), undefined, -1);
    return { pose };
  },
};

const PULL_THROUGH_PULLEY = v(-82, -12);
const cablePullThrough: Spec = {
  name: "Cable Pull-Through",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["glutes", "hamstrings"],
  secondary: ["lower_back"],
  still: 1,
  scene: [{ draw: cableTower(-96, PULL_THROUGH_PULLEY), layer: "back" }],
  props: [{ id: "cable", draw: cable(), layer: "back" }],
  motion: (p) => {
    const torso = lerp(-68, -3, p);
    const probe = (pose: Pose) => shoulders(pose).N;
    let pose = stand(lerp(-86, -94.2, p), { torso, pelvis: torso * 0.9, head: torso * 0.6 }, { probe, over: lerp(14, 2, p), ankleN: v(4, -8) });
    const arm = lerp(-30, 6, p);
    pose = { ...pose, armN: limb(arm), armF: limb(arm) };
    return { pose, props: { cable: line(PULL_THROUGH_PULLEY, grips(pose).N) } };
  },
};

const nordicCurl: Spec = {
  name: "Nordic Hamstring Curl",
  mode: "alternate",
  seconds: 3.6,
  hands: { N: "palm" },
  primary: ["hamstrings"],
  secondary: ["glutes", "calves"],
  still: 0.7,
  scene: [{ draw: { svg: `<circle class="pad" cx="-44" cy="-13" r="4.5"/>`, box: [-49, -18, -39, -8] }, layer: "front" }],
  motion: (p) => {
    const lean = lerp(0, 68, p);
    const knee = v(0, -6);
    const hip = sub(knee, rot(v(0, 44), -lean));
    let pose = base(hip, { torso: -lean, pelvis: -lean, head: -lean + 10 });
    pose = { ...pose, legN: limb(-lean, -90, -180), legF: limb(-lean, -90, -180) };
    const arm = -lean + lerp(20, 70, p);
    pose = { ...pose, armN: limb(arm, arm + 40, arm + 70), armF: limb(arm, arm + 40, arm + 70) };
    return { pose };
  },
};

const pistolSquat: Spec = {
  name: "Pistol Squat",
  mode: "alternate",
  seconds: 3.4,
  hands: { N: "hand" },
  primary: ["quads", "glutes"],
  secondary: ["adductors", "hip_flexors", "abs"],
  still: 0.85,
  motion: (p) => {
    const torso = lerp(-4, -36, p);
    const probe = (pose: Pose) => onTrunk(pose, v(4, -20));
    let pose = stand(lerp(-94.4, -42, p), { torso, pelvis: torso * 0.85, head: torso * 0.4 }, { probe, over: lerp(4, -2, p) });
    const lift = lerp(10, 82, p);
    pose = { ...pose, legF: limb(lift, lift, 10), armN: limb(lerp(20, 88, p)), armF: limb(lerp(16, 84, p)) };
    return { pose };
  },
};

const stepUp: Spec = {
  name: "Step-Up",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["quads", "glutes"],
  secondary: ["hamstrings", "calves"],
  still: 0.5,
  scene: [{ draw: box(16, 64, -44), layer: "back" }],
  props: dumbbells(),
  motion: (p) => {
    const top = v(32, -52);
    const hip = kfv(p, [[0, v(2, -88)], [1, v(30, -138.6)]]);
    const torso = lerp(-16, -3, p);
    let pose = base(hip, { torso, pelvis: torso * 0.6, head: 0 });
    const farAnkle = kfv(p, [[0, v(-12, -8)], [0.5, v(4, -30)], [1, v(28, -90)]]);
    pose = {
      ...pose,
      legN: plantLeg(hip, top, 0, 1),
      legF: plantLeg(hip, farAnkle, kf(p, [[0, 0], [1, 18]]), 1),
    };
    pose = hanging(pose, 2);
    return { pose, props: dbAt(pose) };
  },
};

// --- Calves ------------------------------------------------------------------------

const calfRaise: Spec = {
  name: "Calf Raise",
  aka: ["Standing Calf Raise"],
  mode: "alternate",
  seconds: 2.4,
  hands: { N: "fist" },
  primary: ["calves"],
  still: 1,
  scene: [{ draw: step(4, 44, -10), layer: "back" }],
  props: dumbbells(),
  motion: (p) => {
    const foot = lerp(14, -30, p);
    const ball = v(14, -10);
    const ankle = sub(ball, rot(FOOT.ball, foot));
    const hip = v(ankle.x - 1, ankle.y - 86.6);
    let pose = base(hip, { torso: -2, head: 0 });
    pose = { ...pose, legN: plantLeg(hip, ankle, foot), legF: plantLeg(hip, ankle, foot) };
    pose = hanging(pose, 1);
    return { pose, props: dbAt(pose) };
  },
};

const seatedCalfRaise: Spec = {
  name: "Seated Calf Raise",
  mode: "alternate",
  seconds: 2.4,
  hands: { N: "fist" },
  primary: ["calves"],
  still: 1,
  scene: [
    { draw: seat(-16, 12, -50), layer: "back" },
    { draw: step(34, 56, -8), layer: "back" },
  ],
  props: [{ id: "pad", draw: roller(4.6), layer: "front" }],
  motion: (p) => {
    const hip = v(0, -62);
    const foot = lerp(12, -30, p);
    const ball = v(48, -8);
    const ankle = sub(ball, rot(FOOT.ball, foot));
    let pose = base(hip, { torso: -6, pelvis: -4, head: -2 });
    pose = { ...pose, legN: plantLeg(hip, ankle, foot), legF: plantLeg(hip, ankle, foot) };
    const j = joints(pose);
    const pad = add(j.kneeN, v(-6, -10));
    pose = hold(pose, "side", add(pad, v(-8, -4)), undefined, -1);
    return { pose, props: { pad: at(pad) } };
  },
};

// --- Square-on leg work ---------------------------------------------------------

export const LEGS: Spec[] = [
  squat({ name: "Back Squat", load: "back", primary: ["quads", "glutes"], secondary: ["adductors", "lower_back", "hamstrings"] }),
  squat({ name: "Front Squat", load: "front", primary: ["quads"], secondary: ["glutes", "abs", "upper_back"] }),
  squat({ name: "Overhead Squat", load: "overhead", primary: ["quads", "glutes"], secondary: ["delts_front", "traps", "abs"] }),
  squat({ name: "Box Squat", load: "box", primary: ["glutes", "quads"], secondary: ["hamstrings", "adductors"] }),
  squat({ name: "Air Squat", aka: ["Bodyweight Squat"], load: "none", primary: ["quads", "glutes"], secondary: ["adductors", "hamstrings"] }),
  squat({ name: "Goblet Squat", load: "goblet-db", primary: ["quads", "glutes"], secondary: ["adductors", "abs"] }),
  squat({ name: "Kettlebell Goblet Squat", load: "goblet-kb", primary: ["quads", "glutes"], secondary: ["adductors", "abs"] }),
  squat({ name: "Hack Squat", load: "hack", primary: ["quads"], secondary: ["glutes", "adductors"] }),
  pistolSquat,
  legPress,
  lunge({ name: "Reverse Lunge", kind: "reverse", load: "dumbbells", primary: ["quads", "glutes"], secondary: ["adductors", "hamstrings"] }),
  lunge({ name: "Walking Lunge", kind: "forward", load: "dumbbells", primary: ["quads", "glutes"], secondary: ["adductors", "hamstrings", "calves"] }),
  lunge({ name: "Barbell Lunge", kind: "reverse", load: "back", primary: ["quads", "glutes"], secondary: ["adductors", "hamstrings"] }),
  lunge({ name: "Barbell Split Squat", kind: "split", load: "back", primary: ["quads", "glutes"], secondary: ["adductors"] }),
  lunge({ name: "Bulgarian Split Squat", kind: "bulgarian", load: "dumbbells", primary: ["quads", "glutes"], secondary: ["adductors", "hip_flexors"] }),
  stepUp,
  deadlift({ name: "Deadlift", from: -22, torsoStart: -54, primary: ["glutes", "hamstrings", "lower_back"], secondary: ["quads", "traps", "forearms", "lats"] }),
  deadlift({ name: "Sumo Deadlift", from: -22, torsoStart: -38, primary: ["glutes", "quads", "adductors"], secondary: ["hamstrings", "lower_back", "traps"] }),
  deadlift({ name: "Deficit Deadlift", from: -22, feet: 6, torsoStart: -58, primary: ["glutes", "hamstrings", "lower_back"], secondary: ["quads", "traps", "forearms"] }),
  deadlift({
    name: "Rack Pull",
    from: -54,
    torsoStart: -40,
    primary: ["lower_back", "glutes", "traps"],
    secondary: ["hamstrings", "forearms", "upper_back"],
    scene: [{ draw: { svg: `<rect class="frame" x="-34" y="-150" width="6" height="150"/><rect class="steel" x="-34" y="-58" width="50" height="3" rx="1"/>`, box: [-34, -150, 16, 0] }, layer: "back" }],
  }),
  rdl({ name: "Romanian Deadlift", load: "barbell", primary: ["hamstrings", "glutes"], secondary: ["lower_back", "forearms"] }),
  rdl({ name: "Dumbbell Romanian Deadlift", load: "dumbbells", primary: ["hamstrings", "glutes"], secondary: ["lower_back", "forearms"] }),
  goodMorning,
  swing({ name: "Kettlebell Swing", top: 88 }),
  swing({ name: "American Kettlebell Swing", top: 172 }),
  hipThrust,
  gluteBridge({ name: "Glute Bridge" }),
  gluteBridge({ name: "Single-Leg Glute Bridge", single: true }),
  gluteBridge({ name: "Banded Glute Bridge", band: true }),
  legExtension,
  lyingLegCurl,
  seatedLegCurl,
  backExtension,
  cablePullThrough,
  nordicCurl,
  calfRaise,
  seatedCalfRaise,
];

