// Conditioning: gaits, machines, ropes, jumps, throws and carries.

import {
  airBike,
  bikeLever,
  box,
  crankArm,
  dumbbellEnd,
  kettlebell,
  medBall,
  ropeAnchor,
  ropeSegment,
  rowerFrame,
  rowerSeat,
  skiErg,
  skipRope,
  sled,
  stairMachine,
  treadmill,
} from "./equipment";
import {
  add,
  at,
  base,
  gait,
  grips,
  hold,
  JOG,
  kf,
  kfv,
  lerp,
  limb,
  line,
  mirror,
  onTrunk,
  palms,
  plant,
  plantLeg,
  prone,
  RUN,
  rot,
  seq,
  shoulders,
  SPRINT,
  stand,
  sub,
  turned,
  v,
  WALK,
  type Gait,
  type Pose,
  type PropState,
  type Spec,
  type V,
} from "./kit";
import type { Prop } from "./render";

// --- Gaits --------------------------------------------------------------------------

function gaitSpec(o: {
  name: string;
  aka?: string[];
  g: Gait;
  seconds: number;
  treadmill?: boolean;
  primary: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "loop",
    seconds: o.seconds,
    samples: 20,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.15,
    scene: o.treadmill ? [{ draw: treadmill(), layer: "back" }] : [],
    motion: (p) => {
      let pose = gait(p, o.g);
      if (o.treadmill) pose = { ...pose, hip: add(pose.hip, v(0, -6)) };
      if (o.treadmill) pose = { ...pose, legN: plantLegFrom(pose, "N", -6), legF: plantLegFrom(pose, "F", -6) };
      return { pose };
    },
  };
}

// Re-solve a leg after the whole gait was lifted by `dy` (onto a belt).
function plantLegFrom(pose: Pose, s: "N" | "F", dy: number) {
  const l = s === "N" ? pose.legN : pose.legF;
  const hipOld = sub(pose.hip, v(0, dy));
  const knee = add(hipOld, rot(v(0, 44), l.upper));
  const ankle = add(add(knee, rot(v(0, 43), l.lower)), v(0, dy));
  return plantLeg(pose.hip, ankle, l.end, 1);
}

function carry(o: { name: string; load: "dumbbells" | "suitcase" | "rack"; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  const props: Prop[] =
    o.load === "dumbbells"
      ? [
          { id: "dbF", draw: dumbbellEnd(6.5), layer: "back" },
          { id: "dbN", draw: dumbbellEnd(6.5), layer: "front" },
        ]
      : o.load === "suitcase"
        ? [{ id: "kb", draw: kettlebell(), layer: "front" }]
        : [
            { id: "kbF", draw: { svg: `<circle class="iron" cx="0" cy="0" r="8"/>`, box: [-8, -8, 8, 8] }, layer: "mid" },
            { id: "kbN", draw: { svg: `<circle class="iron" cx="0" cy="0" r="8"/>`, box: [-8, -8, 8, 8] }, layer: "front" },
          ];
  return {
    name: o.name,
    mode: "loop",
    seconds: 1.6,
    samples: 16,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.15,
    props,
    motion: (p) => {
      let pose = gait(p, { ...WALK, stride: 34, arm: 0 }, { torso: -2, head: 0 });
      const out: Record<string, PropState> = {};
      if (o.load === "dumbbells") {
        pose = { ...pose, armN: limb(2), armF: limb(2) };
        const g = grips(pose);
        out.dbN = at(g.N);
        out.dbF = at(add(g.F, v(-2.2, -1)));
      } else if (o.load === "suitcase") {
        const swing = Math.cos(2 * Math.PI * p) * 18;
        pose = { ...pose, armN: limb(1), armF: limb(swing, swing + 18) };
        out.kb = at(grips(pose).N);
      } else {
        pose = { ...pose, armN: limb(-10, 140, 150), armF: limb(-10, 140, 150) };
        const g = grips(pose);
        out.kbN = at(add(g.N, v(5, 2)));
        out.kbF = at(add(g.F, v(3, 1)));
      }
      return { pose, props: out };
    },
  };
}

// --- Machines --------------------------------------------------------------------

const ROW_FEET = v(42, -30);
const FLYWHEEL = v(62, -36);

function rower(o: { name: string; aka?: string[]; seconds: number }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "loop",
    seconds: o.seconds,
    samples: 20,
    hands: { N: "fist" },
    primary: ["quads", "upper_back", "lats"],
    secondary: ["glutes", "hamstrings", "biceps", "lower_back"],
    still: 0.42,
    scene: [{ draw: rowerFrame(), layer: "back" }],
    props: [
      { id: "seat", draw: rowerSeat(), layer: "back" },
      { id: "chain", draw: { svg: `<path d="M0 0H1" fill="none" stroke="#3a413e" stroke-width=".9" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "back" },
    ],
    motion: (p) => {
      const hipX = kf(p, [[0, 0], [0.3, -40], [0.42, -44], [0.62, -44], [1, 0]]);
      const torso = kf(p, [[0, -28], [0.3, -18], [0.42, 22], [0.55, 22], [0.68, -24], [1, -28]]);
      const pull = kf(p, [[0, 0], [0.3, 0], [0.42, 1], [0.5, 1], [0.62, 0], [1, 0]]);
      const hip = v(hipX, -36);
      let pose = base(hip, { torso, pelvis: torso * 0.7, head: torso * 0.4 });
      pose = plant(pose, "side", ROW_FEET, ROW_FEET, { N: 40, F: 40 }, 1);
      const s = shoulders(pose).N;
      const reach = add(s, rot(v(0, 61), 78));
      const pulled = onTrunk(pose, v(19, -14));
      const g = v(lerp(reach.x, pulled.x, pull), lerp(reach.y, pulled.y, pull));
      pose = hold(pose, "side", g, undefined, -1);
      return { pose, props: { seat: at(add(hip, v(0, 13))), chain: line(FLYWHEEL, g) } };
    },
  };
}

const CRANK = v(12, -36);
const CRANK_R = 17;
const LEVER = v(60, -56);

function bike(o: { name: string; aka?: string[]; arms: boolean; seconds: number; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "loop",
    seconds: o.seconds,
    samples: 20,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.1,
    scene: [{ draw: airBike(v(-14, -89), CRANK), layer: "back" }],
    props: [
      { id: "crankF", draw: crankArm(CRANK_R), layer: "back" },
      { id: "leverF", draw: bikeLever(78), layer: "back" },
      { id: "crankN", draw: crankArm(CRANK_R), layer: "front" },
      { id: "leverN", draw: bikeLever(78), layer: "mid" },
    ],
    motion: (p) => {
      const hip = v(-10, -102);
      let pose = base(hip, { torso: -22, pelvis: -14, head: -8 });
      const a = -360 * p;
      const pedal = (deg: number) => add(CRANK, rot(v(0, CRANK_R), deg));
      const ankleAt = (q: V) => add(q, v(-9, -7));
      pose = {
        ...pose,
        legN: plantLeg(hip, ankleAt(pedal(a)), -8, 1),
        legF: plantLeg(hip, ankleAt(pedal(a + 180)), -8, 1),
      };
      const sway = o.arms ? Math.sin(2 * Math.PI * p) * 15 : 0;
      const top = (deg: number) => add(LEVER, rot(v(0, -82), deg));
      pose = hold(pose, "side", top(sway), top(-sway), -1, -1);
      return {
        pose,
        props: {
          crankN: turned(CRANK, a),
          crankF: turned(add(CRANK, v(-2.2, -1)), a + 180),
          leverN: turned(LEVER, sway),
          leverF: turned(add(LEVER, v(-2.2, -1)), -sway),
        },
      };
    },
  };
}

const SKI_TOP = v(52, -222);
const skiErgSpec: Spec = {
  name: "SkiErg",
  mode: "loop",
  seconds: 1.8,
  samples: 18,
  hands: { N: "fist" },
  primary: ["lats", "triceps", "abs"],
  secondary: ["glutes", "hamstrings", "upper_back"],
  still: 0.3,
  scene: [{ draw: skiErg(46), layer: "back" }],
  props: [{ id: "cord", draw: { svg: `<path d="M0 0H1" fill="none" stroke="#3a413e" stroke-width=".9" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "back" }],
  motion: (p) => {
    const down = kf(p, [[0, 0], [0.4, 1], [0.5, 1], [1, 0]]);
    const torso = lerp(-6, -52, down);
    const probe = (pose: Pose) => onTrunk(pose, v(0, -20));
    let pose = stand(lerp(-94, -84, down), { torso, pelvis: torso * 0.7, head: torso * 0.5 }, { probe, over: lerp(2, 14, down) });
    const a = lerp(160, -14, down);
    pose = { ...pose, armN: limb(a, a - 8, a - 8), armF: limb(a, a - 8, a - 8) };
    return { pose, props: { cord: line(SKI_TOP, grips(pose).N) } };
  },
};

const stairClimber: Spec = {
  name: "Stair Climber",
  aka: ["StairMaster"],
  mode: "loop",
  seconds: 1.6,
  samples: 16,
  hands: { N: "fist" },
  primary: ["quads", "glutes"],
  secondary: ["calves", "hamstrings"],
  still: 0.2,
  scene: [{ draw: stairMachine(), layer: "back" }],
  motion: (p) => {
    const hip = v(-8, -116);
    let pose = base(hip, { torso: -12, pelvis: -8, head: -4 });
    const foot = (q: number) => {
      q = ((q % 1) + 1) % 1;
      return q < 0.55
        ? kfv(q / 0.55, [[0, v(18, -54)], [1, v(0, -36)]])
        : kfv((q - 0.55) / 0.45, [[0, v(0, -36)], [0.5, v(6, -62)], [1, v(18, -54)]]);
    };
    pose = { ...pose, legN: plantLeg(hip, foot(p), 0, 1), legF: plantLeg(hip, foot(p + 0.5), 0, 1) };
    pose = hold(pose, "side", v(30, -128), v(30, -128), -1);
    return { pose };
  },
};

// --- Sleds and ropes --------------------------------------------------------------

const sledPush: Spec = {
  name: "Sled Push",
  mode: "loop",
  seconds: 1.4,
  samples: 18,
  hands: { N: "fist" },
  primary: ["quads", "glutes"],
  secondary: ["calves", "delts_front", "triceps", "hamstrings"],
  still: 0.2,
  scene: [{ draw: { svg: `<g transform="translate(84 0)">${sled().svg}</g>`, box: [34, -60, 86, 0] }, layer: "back" }],
  motion: (p) => {
    let pose = gait(p, { ...JOG, stance: 0.55, stride: 46, lift: 12, kick: 8, hipY: -82, lean: -56, arm: 0, elbow: 0 });
    pose = hold(pose, "side", v(83, -60), v(83, -60), -1);
    return { pose };
  },
};

const SLED_AT = v(150, 0);
const sledDrag: Spec = {
  name: "Sled Drag",
  mode: "loop",
  seconds: 1.8,
  samples: 18,
  hands: { N: "fist" },
  primary: ["quads"],
  secondary: ["upper_back", "forearms", "calves"],
  still: 0.2,
  scene: [{ draw: { svg: `<g transform="translate(${SLED_AT.x} 0)">${sled().svg}</g>`, box: [SLED_AT.x - 50, -60, SLED_AT.x + 2, 0] }, layer: "back" }],
  props: [{ id: "strap", draw: { svg: `<path d="M0 0H1" fill="none" stroke="#4d5a72" stroke-width="1.4" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "back" }],
  motion: (p) => {
    // Walking backward: the gait run in reverse, leaning away from the sled.
    let pose = gait(1 - p, { ...WALK, hipY: -86, lean: 10, arm: 0, elbow: 0 });
    pose = { ...pose, armN: limb(30, 40, 40), armF: limb(30, 40, 40) };
    return { pose, props: { strap: line(grips(pose).N, v(SLED_AT.x - 46, -10)) } };
  },
};

const ANCHOR = v(118, -10);
const battleRopes: Spec = {
  name: "Battle Ropes",
  mode: "loop",
  seconds: 0.9,
  samples: 12,
  hands: { N: "fist" },
  primary: ["delts_front", "forearms"],
  secondary: ["abs", "biceps", "quads"],
  still: 0.25,
  scene: [{ draw: ropeAnchor(ANCHOR.x), layer: "back" }],
  props: [
    { id: "f1", draw: ropeSegment(), layer: "back" },
    { id: "f2", draw: ropeSegment(), layer: "back" },
    { id: "n1", draw: ropeSegment(), layer: "front" },
    { id: "n2", draw: ropeSegment(), layer: "front" },
  ],
  motion: (p) => {
    const probe = (pose: Pose) => onTrunk(pose, v(0, -20));
    let pose = stand(-80, { torso: -22, pelvis: -16, head: -10 }, { probe, over: 2, ankleN: v(6, -8), ankleF: v(-12, -8) });
    const w = Math.sin(2 * Math.PI * p);
    const armN = 66 + w * 26;
    const armF = 66 - w * 26;
    pose = { ...pose, armN: limb(armN, armN + 20, armN + 20), armF: limb(armF, armF + 20, armF + 20) };
    const g = grips(pose);
    const mid = (from: V, phase: number) => add(v((from.x + ANCHOR.x) / 2, (from.y + ANCHOR.y) / 2), v(0, Math.sin(2 * Math.PI * (p + phase)) * 14));
    const mN = mid(g.N, 0.25);
    const mF = mid(g.F, 0.75);
    return { pose, props: { n1: line(g.N, mN), n2: line(mN, ANCHOR), f1: line(g.F, mF), f2: line(mF, ANCHOR) } };
  },
};

function jumpRope(o: { name: string; spins: number; seconds: number }): Spec {
  return {
    name: o.name,
    mode: "loop",
    seconds: o.seconds,
    samples: o.spins * 12,
    hands: { N: "fist" },
    primary: ["calves"],
    secondary: ["forearms", "delts_front", "quads"],
    still: 0.3,
    props: [{ id: "rope", draw: skipRope(104), layer: "front" }],
    motion: (p) => {
      const air = (Math.cos(2 * Math.PI * p) + 1) / 2 * (o.spins > 1 ? 9 : 5);
      const foot = -6 - air * 2.2;
      const ankle = v(0, -8 - air);
      let pose = base(v(1, ankle.y - 86.2), { torso: -3, head: 0 });
      pose = { ...pose, legN: plantLeg(pose.hip, ankle, foot, 1), legF: plantLeg(pose.hip, ankle, foot, 1) };
      pose = { ...pose, armN: limb(10, 58, 58), armF: limb(10, 58, 58) };
      return { pose, props: { rope: turned(grips(pose).N, -360 * o.spins * p) } };
    },
  };
}

const jumpingJacks: Spec = {
  name: "Jumping Jacks",
  view: "front",
  mode: "loop",
  seconds: 1.1,
  samples: 14,
  hands: { N: "hand" },
  primary: ["calves", "delts_side"],
  secondary: ["abductors", "adductors", "quads"],
  still: 0.5,
  motion: (p) => {
    const open = (1 - Math.cos(2 * Math.PI * p)) / 2;
    const hop = Math.abs(Math.sin(2 * Math.PI * p)) * 6;
    const stance = lerp(9, 26, open);
    const hipY = -94.4 - hop + (1 - Math.cos(open * Math.PI)) * 0.8;
    let pose = base(v(0, hipY));
    pose = plant(pose, "front", v(stance, -8 - hop), v(-stance, -8 - hop), {}, 1);
    const arm = lerp(10, 172, open);
    pose = { ...pose, armN: limb(arm, arm + 6, arm + 6), armF: mirror(limb(arm, arm + 6, arm + 6)) };
    return { pose };
  },
};

const aSkip: Spec = {
  name: "A-Skip",
  mode: "loop",
  seconds: 1.2,
  samples: 20,
  hands: { N: "fist" },
  primary: ["hip_flexors", "calves"],
  secondary: ["quads", "glutes", "abs"],
  still: 0.25,
  motion: (p) => {
    const knee = (q: number) => Math.max(0, Math.sin(2 * Math.PI * q));
    const kN = knee(p);
    const kF = knee(p + 0.5);
    const hop = Math.abs(Math.sin(4 * Math.PI * p)) * 4;
    const hip = v(0, -94.4 - hop);
    let pose = base(hip, { torso: -4, head: 0 });
    const support = () => plantLeg(hip, v(2, -8 - hop), -10 - hop * 2, 1);
    pose = {
      ...pose,
      legN: kN > 0.05 ? limb(kN * 92, kN * 92 - 100 * kN, kN * 92 - 100 * kN + 10) : support(),
      legF: kF > 0.05 ? limb(kF * 92, kF * 92 - 100 * kF, kF * 92 - 100 * kF + 10) : support(),
    };
    const swing = Math.sin(2 * Math.PI * p) * 40;
    pose = { ...pose, armN: limb(-swing, -swing + 88, -swing + 88), armF: limb(swing, swing + 88, swing + 88) };
    return { pose };
  },
};

// --- Plyometrics and throws -------------------------------------------------------

function standAt(x: number, hipY: number, torso: number, arms: number, ankleY = -8, foot = 0): Pose {
  let pose = base(v(x, hipY), { torso, pelvis: torso * 0.8, head: torso * 0.4 });
  pose = { ...pose, legN: plantLeg(pose.hip, v(x + 2, ankleY), foot, 1), legF: plantLeg(pose.hip, v(x + 2, ankleY), foot, 1) };
  return { ...pose, armN: limb(arms, arms + 12, arms + 12), armF: limb(arms - 4, arms + 8, arms + 8) };
}

function airborne(x: number, hipY: number, torso: number, tuck: number, arms: number): Pose {
  const pose = base(v(x, hipY), { torso, pelvis: torso * 0.8, head: torso * 0.4 });
  return {
    ...pose,
    legN: limb(tuck, tuck - tuck * 1.5, 0),
    legF: limb(tuck - 4, tuck - 4 - tuck * 1.5, 0),
    armN: limb(arms, arms + 10, arms + 10),
    armF: limb(arms - 6, arms + 4, arms + 4),
  };
}

const burpee: Spec = (() => {
  const toe = v(-62, 0);
  const plankTop = prone(toe, 19);
  const palm = v(shoulders(plankTop).N.x + 1, 0);
  const plank = palms(plankTop, "side", palm, palm, 90, -1);
  const chest = palms(prone(toe, 6), "side", palm, palm, 90, -1);
  let crouch = base(v(palm.x - 34, -52), { torso: -62, pelvis: -50, head: -40 });
  crouch = plant(crouch, "side", v(palm.x - 22, -8));
  crouch = palms(crouch, "side", palm, palm, 90, -1);
  const standing = standAt(palm.x - 26, -94.4, -2, 0);
  const jump = { ...standAt(palm.x - 26, -104, -2, 170, -18, -40) };
  return {
    name: "Burpee",
    mode: "loop" as const,
    seconds: 3.2,
    samples: 32,
    hands: { N: "palm" as const },
    primary: ["quads", "chest"] as Spec["primary"],
    secondary: ["triceps", "delts_front", "abs", "calves"] as Spec["secondary"],
    still: 0.28,
    motion: (p: number) => ({
      pose: seq(p, [
        [0, standing],
        [0.14, crouch],
        [0.26, plank],
        [0.38, chest],
        [0.5, plank],
        [0.62, crouch],
        [0.8, jump],
        [1, standing],
      ]),
    }),
  };
})();

const BOX = { x0: 52, x1: 100, top: -50 };
const boxJump: Spec = (() => {
  const s0 = standAt(0, -94.4, -2, 0);
  const dip = { ...standAt(-6, -74, -40, -40) };
  const fly = airborne(30, -140, -10, 70, 160);
  let land = base(v(62, -104), { torso: -36, pelvis: -30, head: -14 });
  land = plant(land, "side", v(74, BOX.top - 8));
  land = { ...land, armN: limb(70, 80, 80), armF: limb(66, 76, 76) };
  const top = standAt(72, BOX.top - 94.4, -2, 0, BOX.top - 8);
  const down = airborne(30, -130, -4, 30, 30);
  return {
    name: "Box Jump",
    mode: "loop",
    seconds: 3,
    samples: 30,
    hands: { N: "hand" },
    primary: ["quads", "glutes", "calves"],
    secondary: ["hamstrings", "delts_front"],
    still: 0.35,
    scene: [{ draw: box(BOX.x0, BOX.x1, BOX.top), layer: "back" }],
    motion: (p) => ({
      pose: seq(p, [
        [0, s0],
        [0.18, dip],
        [0.34, fly],
        [0.46, land],
        [0.6, top],
        [0.72, top],
        [0.84, down],
        [1, s0],
      ]),
    }),
  };
})();

const broadJump: Spec = (() => {
  const s0 = standAt(-44, -94.4, -2, 0);
  const dip = standAt(-50, -72, -44, -46);
  const fly = airborne(-4, -112, -18, 60, 120);
  let land = base(v(30, -66), { torso: -42, pelvis: -36, head: -16 });
  land = plant(land, "side", v(46, -8));
  land = { ...land, armN: limb(80, 90, 90), armF: limb(76, 86, 86) };
  const up = standAt(40, -94.4, -2, 0);
  return {
    name: "Broad Jump",
    mode: "loop",
    seconds: 3,
    samples: 30,
    hands: { N: "hand" },
    primary: ["glutes", "quads", "hamstrings"],
    secondary: ["calves", "lower_back"],
    still: 0.36,
    motion: (p) => ({
      pose: seq(p, [
        [0, s0],
        [0.2, dip],
        [0.38, fly],
        [0.52, land],
        [0.7, up],
        [0.8, up],
        [1, s0],
      ]),
    }),
  };
})();

const ballSlam: Spec = {
  name: "Medicine Ball Slam",
  mode: "loop",
  seconds: 1.8,
  samples: 18,
  hands: { N: "fist" },
  primary: ["lats", "abs"],
  secondary: ["delts_front", "triceps", "glutes"],
  still: 0.1,
  props: [{ id: "ball", draw: medBall(9), layer: "front" }],
  motion: (p) => {
    const down = kf(p, [[0, 0], [0.25, 1], [0.6, 1], [1, 0]]);
    const torso = lerp(4, -60, down);
    const probe = (pose: Pose) => onTrunk(pose, v(0, -20));
    let pose = stand(lerp(-96, -72, down), { torso, pelvis: torso * 0.8, head: torso * 0.6 }, { probe, over: lerp(0, 8, down) });
    const a = lerp(176, 30, down);
    pose = { ...pose, armN: limb(a, a, a), armF: limb(a, a, a) };
    const g = grips(pose).N;
    const ball = p > 0.2 && p < 0.45 ? v(g.x + 6, -9 - Math.abs(Math.sin((p - 0.2) * 4 * Math.PI)) * 8) : add(g, rot(v(0, 6), a));
    return { pose, props: { ball: at(ball) } };
  },
};

const chestPass: Spec = {
  name: "Medicine Ball Chest Pass",
  mode: "loop",
  seconds: 2.4,
  samples: 20,
  hands: { N: "fist" },
  primary: ["chest", "triceps"],
  secondary: ["delts_front"],
  still: 0.3,
  props: [{ id: "ball", draw: medBall(9), layer: "front" }],
  motion: (p) => {
    const push = kf(p, [[0, 0], [0.22, 1], [0.6, 1], [0.85, 0], [1, 0]]);
    const probe = (pose: Pose) => onTrunk(pose, v(0, -20));
    let pose = stand(-90, { torso: -10, head: -4 }, { probe, over: 2, ankleN: v(10, -8), ankleF: v(-10, -8) });
    const s = shoulders(pose).N;
    const g = add(s, v(lerp(20, 58, push), lerp(10, 2, push)));
    pose = hold(pose, "side", g, undefined, -1);
    const flight = kf(p, [[0, 0], [0.22, 0], [0.45, 1], [0.6, 1], [0.85, 0], [1, 0]]);
    const ball = add(g, v(9 + flight * 70, -flight * 8));
    return { pose, props: { ball: at(ball) } };
  },
};

export const CARDIO: Spec[] = [
  gaitSpec({ name: "Outdoor Run", aka: ["Run", "Running"], g: RUN, seconds: 0.8, primary: ["quads", "hamstrings", "calves"], secondary: ["glutes", "hip_flexors"] }),
  gaitSpec({ name: "Treadmill Run", g: RUN, seconds: 0.8, treadmill: true, primary: ["quads", "hamstrings", "calves"], secondary: ["glutes", "hip_flexors"] }),
  gaitSpec({ name: "Jog Easy", aka: ["Jog", "Easy Jog"], g: JOG, seconds: 0.95, primary: ["quads", "calves"], secondary: ["hamstrings", "glutes"] }),
  gaitSpec({ name: "Sprint Intervals", aka: ["Sprint", "Sprints"], g: SPRINT, seconds: 0.62, primary: ["glutes", "hamstrings", "quads"], secondary: ["calves", "hip_flexors"] }),
  gaitSpec({ name: "Shuttle Run", g: SPRINT, seconds: 0.66, primary: ["quads", "glutes"], secondary: ["calves", "hamstrings", "adductors"] }),
  gaitSpec({ name: "Easy Walk", aka: ["Walk", "Walking"], g: WALK, seconds: 1.3, primary: ["calves"], secondary: ["quads", "glutes"] }),
  carry({ name: "Farmer Carry", load: "dumbbells", primary: ["forearms", "traps"], secondary: ["abs", "glutes"] }),
  carry({ name: "Suitcase Carry", load: "suitcase", primary: ["obliques", "forearms"], secondary: ["traps", "abs"] }),
  carry({ name: "Kettlebell Front Rack Carry", load: "rack", primary: ["abs", "upper_back"], secondary: ["biceps", "delts_front"] }),
  rower({ name: "Row (Erg)", aka: ["Rowing", "Rower", "Row Erg"], seconds: 2.2 }),
  rower({ name: "Row Easy", seconds: 2.8 }),
  bike({ name: "Assault Bike", aka: ["Air Bike"], arms: true, seconds: 1, primary: ["quads"], secondary: ["glutes", "delts_front", "chest", "triceps"] }),
  bike({ name: "Echo Bike", arms: true, seconds: 1, primary: ["quads"], secondary: ["glutes", "delts_front", "chest", "triceps"] }),
  bike({ name: "Bike Easy", aka: ["Bike", "Easy Bike"], arms: false, seconds: 1.4, primary: ["quads"], secondary: ["glutes", "calves"] }),
  skiErgSpec,
  stairClimber,
  sledPush,
  sledDrag,
  battleRopes,
  jumpRope({ name: "Jump Rope", spins: 1, seconds: 0.62 }),
  jumpRope({ name: "Double-Unders", spins: 2, seconds: 0.8 }),
  jumpingJacks,
  aSkip,
  burpee,
  boxJump,
  broadJump,
  ballSlam,
  chestPass,
];

