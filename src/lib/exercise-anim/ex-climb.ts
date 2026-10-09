// Climbing: on the wall, on the hangboard, on the campus board, and the
// climbing-specific pulling and grip work.
//
// Wall climbing is drawn from behind with the holds scrolling past, so the
// climber climbs forever in place. Every limb grips a hold that moves with the
// wall, then reaches for the next one; the holds are laid out so the next one
// arrives exactly where the reach ends, and one loop moves the wall by exactly
// one repeat of its pattern.

import { box, pullUpBar, pullUpBarAcross } from "./equipment";
import {
  add,
  at,
  base,
  frontJoints,
  grips,
  hangSide,
  hold,
  ik2,
  kf,
  LEN,
  lerp,
  limb,
  line,
  mirror,
  plantLeg,
  seq,
  shoulders,
  stand,
  STAND,
  sub,
  v,
  type Pose,
  type PropState,
  type Spec,
  type V,
} from "./kit";
import type { Drawing, Prop } from "./render";

const n1 = (x: number) => Math.round(x * 10) / 10;
const smooth = (t: number) => t * t * (3 - 2 * t);

// --- Holds -------------------------------------------------------------------------

const HOLD_COLORS = ["#e8a33a", "#3a8fd8", "#d9534f", "#5cb85c", "#9b59b6", "#f0c419"];

function holdShape(x: number, y: number, r: number, i: number): string {
  const c = HOLD_COLORS[i % HOLD_COLORS.length];
  return `<path d="M${n1(x - r)} ${n1(y)}C${n1(x - r)} ${n1(y - r * 0.9)} ${n1(x + r)} ${n1(y - r * 0.9)} ${n1(x + r)} ${n1(y)}C${n1(x + r * 0.7)} ${n1(y + r * 0.55)} ${n1(x - r * 0.7)} ${n1(y + r * 0.55)} ${n1(x - r)} ${n1(y)}Z" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width=".6"/>`;
}

// One limb's job on the wall: where its holds sit when grabbed (`lead`, in
// camera coordinates at the moment the reach ends) and when it reaches
// (`from` → `from + span` of the cycle).
type Lane = { lead: V; from: number; span: number; r: number };

// Scroll direction: holds move down (climbing up), up (down-climbing) or left
// (traversing right).
type Flow = "up" | "down" | "right";

const flowVec = (flow: Flow) => (flow === "up" ? v(0, 1) : flow === "down" ? v(0, -1) : v(-1, 0));

// The hold pattern for a set of lanes, as a prop that scrolls by one period
// per loop. Drawn for several periods either side so the viewport never sees
// an edge.
function holdPattern(lanes: Lane[], period: number, flow: Flow, extras: [number, number][]): Drawing {
  const d = flowVec(flow);
  const shapes: string[] = [];
  let i = 0;
  for (let k = -3; k <= 3; k++) {
    for (const lane of lanes) {
      // A hold grabbed at time t_end sits at lead - d * period * t_end in wall
      // coordinates.
      const end = lane.from + lane.span;
      const q = sub(lane.lead, v(d.x * period * (end - k), d.y * period * (end - k)));
      shapes.push(holdShape(q.x, q.y, lane.r, i++));
    }
    for (const [x, y] of extras) {
      shapes.push(holdShape(x - d.x * period * k, y - d.y * period * k, 4.2, i++ + 2));
    }
  }
  // A token box: the pattern scrolls under the climber and shouldn't steer the
  // framing.
  return { svg: shapes.join(""), box: [0, -120, 0, -120] };
}

// Where a limb is at phase p: on its hold (moving with the wall) or reaching
// for the next one along an arc.
function lanePos(lane: Lane, p: number, period: number, flow: Flow, arc: number): V {
  const d = flowVec(flow);
  const end = lane.from + lane.span;
  const since = (((p - end) % 1) + 1) % 1; // time since the last reach ended
  const gripping = since <= 1 - lane.span;
  const onHold = (t: number) => add(lane.lead, v(d.x * period * t, d.y * period * t));
  if (gripping) return onHold(since);
  const t = (since - (1 - lane.span)) / lane.span; // 0 → 1 through the reach
  const from = onHold(since);
  const to = onHold(since - 1);
  const s = smooth(t);
  const mid = Math.sin(Math.PI * t) * arc;
  return v(lerp(from.x, to.x, s) + (flow === "right" ? 0 : mid), lerp(from.y, to.y, s) + (flow === "right" ? -mid : 0));
}

type Climb = {
  name: string;
  aka?: string[];
  flow?: Flow;
  period?: number;
  seconds?: number;
  straightArms?: boolean;
  flag?: boolean;
  feetOff?: boolean;
  rope?: boolean;
  board?: "wall" | "campus" | "circuit";
  primary?: Spec["primary"];
  secondary?: Spec["secondary"];
};

const WALL_FILL: Record<NonNullable<Climb["board"]>, string> = { wall: "#d9d2c5", campus: "#c99a62", circuit: "#5a6470" };

function climb(o: Climb): Spec {
  const flow = o.flow ?? "up";
  const period = o.period ?? (flow === "right" ? 40 : 44);
  const reach = o.straightArms ? -206 : -200;
  const lanes: Lane[] =
    flow === "right"
      ? [
          { lead: v(40, -168), from: 0, span: 0.22, r: 7.5 },
          { lead: v(26, -54), from: 0.25, span: 0.18, r: 5 },
          { lead: v(10, -176), from: 0.5, span: 0.22, r: 7.5 },
          { lead: v(-6, -50), from: 0.75, span: 0.18, r: 5 },
        ]
      : [
          { lead: v(26, reach), from: 0, span: 0.22, r: 7.5 },
          { lead: v(-16, -70), from: 0.25, span: 0.18, r: 5 },
          { lead: v(-26, reach + 8), from: 0.5, span: 0.22, r: 7.5 },
          { lead: v(16, -70), from: 0.75, span: 0.18, r: 5 },
        ];
  const campus = o.board === "campus";
  const board = o.board ?? "wall";
  const extras: [number, number][] = campus ? [] : [[-44, -140], [40, -110], [-8, -40], [46, -212], [-50, -230]];
  const pattern = campus
    ? (() => {
        const rungs: string[] = [];
        for (let k = -8; k <= 8; k++) rungs.push(`<rect class="wood" x="-44" y="${n1(-200 + k * 22)}" width="88" height="3.4" rx="1"/>`);
        return { svg: rungs.join(""), box: [0, -120, 0, -120] as [number, number, number, number] };
      })()
    : holdPattern(o.feetOff ? lanes.filter((_, i) => i % 2 === 0) : lanes, period, flow, extras);
  const props: Prop[] = [{ id: "holds", draw: pattern, layer: "back" }];
  if (o.rope) {
    props.push({ id: "rope", draw: { svg: `<path d="M0 0H1" fill="none" stroke="#2b6cb0" stroke-width="1.4" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "front" });
  }
  return {
    name: o.name,
    aka: o.aka,
    view: "back",
    mode: "loop",
    seconds: o.seconds ?? 4,
    samples: 40,
    hands: { N: "fist" },
    primary: o.primary ?? ["forearms", "lats"],
    secondary: o.secondary ?? ["biceps", "upper_back", "calves", "abs"],
    still: 0.1,
    backdrop: WALL_FILL[board],
    floor: false,
    props,
    motion: (p) => {
      const pos = (i: number) => lanePos(lanes[i], p, period, flow, flow === "right" ? 6 : 8);
      const rh = pos(0);
      const lh = pos(2);
      // On the campus board the hands move rung to rung, which the hold
      // lanes already do; feet hang.
      const sway = Math.sin(2 * Math.PI * p) * 3;
      const hipY = o.straightArms ? -86 : campus ? -98 : -93;
      let pose = base(v(sway + (flow === "right" ? 12 : 0), hipY), { torso: -sway * 1.2, pelvis: -sway });
      const s = shoulders(pose, "back");
      const armN = ik2(s.N, rh, LEN.upperArm, LEN.forearm + LEN.grip, -1);
      const armF = ik2(s.F, lh, LEN.upperArm, LEN.forearm + LEN.grip, 1);
      pose = { ...pose, armN: { upper: armN.upper, lower: armN.lower, end: armN.lower }, armF: { upper: armF.upper, lower: armF.lower, end: armF.lower } };
      const j = frontJoints(pose);
      if (o.feetOff || campus) {
        const dangle = Math.sin(2 * Math.PI * p + 1) * 4;
        pose = { ...pose, legN: limb(4 + dangle, -6 + dangle, 0), legF: limb(-4 + dangle, 6 + dangle, 0) };
      } else {
        const rf = pos(3);
        const lf = pos(1);
        pose = {
          ...pose,
          legN: plantLeg(j.hip, add(rf, v(0, -6)), 0, 1),
          legF: o.flag ? limb(-74, -86, -90) : plantLeg(j.hipF, add(lf, v(0, -6)), 0, -1),
        };
      }
      const props2: Record<string, PropState> = {
        holds: at(flow === "right" ? v(-period * p, 0) : flow === "down" ? v(0, -period * p) : v(0, period * p)),
      };
      if (o.rope) props2.rope = line(v(0, -300), add(pose.hip, v(0, -4)));
      return { pose, props: props2 };
    },
  };
}

// A deadpoint: sink, then throw for a hold well above.
const limitBouldering: Spec = (() => {
  const base0 = climb({ name: "Limit Bouldering", period: 56, seconds: 3, primary: ["forearms", "lats", "biceps"], secondary: ["upper_back", "abs", "calves", "delts_rear"] });
  return {
    ...base0,
    motion: (p) => {
      const f = base0.motion(p);
      const sink = kf(p, [[0, 0], [0.12, 1], [0.2, -0.4], [0.3, 0], [1, 0]]);
      return { ...f, pose: { ...f.pose, hip: add(f.pose.hip, v(0, sink * 8)) } };
    },
  };
})();

// --- Hangboard ------------------------------------------------------------------

const BOARD_Y = -236;
const EDGE_X = 18;

function hangboard(): Drawing {
  return {
    svg:
      `<rect class="wall" x="-120" y="-300" width="240" height="44"/>` +
      `<rect class="wood" x="-46" y="${BOARD_Y - 16}" width="92" height="20" rx="3"/>` +
      `<rect fill="#8d6539" x="${-EDGE_X - 8}" y="${BOARD_Y - 4}" width="16" height="3" rx="1"/><rect fill="#8d6539" x="${EDGE_X - 8}" y="${BOARD_Y - 4}" width="16" height="3" rx="1"/>`,
    box: [-46, BOARD_Y - 16, 46, BOARD_Y + 4],
  };
}

function hangPose(lift = 0, shrug = 3): Pose {
  const shoulderY = BOARD_Y + Math.sqrt(61.4 ** 2 - (EDGE_X - 19) ** 2) - lift;
  const lumbar = v(0, shoulderY + 38 + shrug);
  const hip = v(0, lumbar.y + 11);
  const { upper, lower } = ik2(v(19, shoulderY), v(EDGE_X, BOARD_Y), LEN.upperArm, LEN.forearm + LEN.grip, -1);
  const arm = { upper, lower, end: lower };
  const leg = limb(2, 6, 0);
  return { ...STAND, hip, shrug, armN: arm, armF: mirror(arm), legN: leg, legF: mirror(leg) };
}

function hang(o: {
  name: string;
  aka?: string[];
  weight?: boolean;
  repeaters?: boolean;
  bar?: boolean;
  primary?: Spec["primary"];
  secondary?: Spec["secondary"];
}): Spec {
  const props: Prop[] = o.weight
    ? [{ id: "w", draw: { svg: `<path d="M-6 0L0 22L6 0" fill="none" stroke="#5b6461" stroke-width="1"/><rect class="iron" x="-14" y="20" width="28" height="9" rx="2"/>`, box: [-14, 0, 14, 29] }, layer: "front" }]
    : [];
  return {
    name: o.name,
    aka: o.aka,
    view: "back",
    mode: "loop",
    seconds: o.repeaters ? 4 : 5,
    samples: 24,
    hands: { N: "fist" },
    primary: o.primary ?? ["forearms"],
    secondary: o.secondary ?? ["lats", "upper_back", "traps"],
    still: 0.25,
    scene: [
      { draw: o.bar ? pullUpBarAcross(BOARD_Y) : hangboard(), layer: "back" },
      ...(o.repeaters ? [{ draw: box(-20, 20, -14, "pad"), layer: "back" as const }] : []),
    ],
    props,
    motion: (p) => {
      let pose: Pose;
      if (o.repeaters) {
        // 7 on, 3 off: hang, then step down onto the block and let go.
        const off = kf(p, [[0, 0], [0.62, 0], [0.7, 1], [0.92, 1], [1, 0]]);
        const on = hangPose(0, 3);
        const rest: Pose = {
          ...on,
          hip: v(0, -14 - 94.4 + 8),
          shrug: 0,
          armN: limb(10, 20, 20),
          armF: mirror(limb(10, 20, 20)),
          legN: limb(0),
          legF: limb(0),
        };
        pose = seq(off, [[0, on], [1, rest]]);
      } else {
        const breath = (1 - Math.cos(2 * Math.PI * p)) / 2;
        pose = hangPose(breath * 1.2, 3 - breath);
      }
      const props2: Record<string, PropState> = {};
      if (o.weight) props2.w = at(add(pose.hip, v(0, 6)));
      return { pose, props: props2 };
    },
  };
}

const oneArmAssisted: Spec = {
  name: "One-Arm Assisted Hang",
  view: "back",
  mode: "loop",
  seconds: 5,
  samples: 20,
  hands: { N: "fist" },
  primary: ["forearms"],
  secondary: ["lats", "upper_back", "obliques"],
  still: 0.25,
  scene: [{ draw: hangboard(), layer: "back" }],
  props: [{ id: "cord", draw: { svg: `<path d="M0 0H1" fill="none" stroke="#2b6cb0" stroke-width="1.2" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "back" }],
  motion: (p) => {
    const breath = (1 - Math.cos(2 * Math.PI * p)) / 2;
    const base0 = hangPose(breath, 3);
    const pose = { ...base0, hip: add(base0.hip, v(8, 2)), torso: -6, pelvis: -4 };
    const s = shoulders(pose, "back");
    const hand = v(-34, -170);
    const armF = ik2(s.F, hand, LEN.upperArm, LEN.forearm + LEN.grip, 1);
    const posed = { ...pose, armF: { upper: armF.upper, lower: armF.lower, end: armF.lower } };
    return { pose: posed, props: { cord: line(v(-34, -300), grips(posed, "back").F) } };
  },
};

// Side-on: hanging from a board on the wall with the feet on a chair behind.
const HANG_RAMP_EDGE = v(18, -228);
const feetOnHangRamp: Spec = {
  name: "Feet-On Hang Ramp",
  mode: "loop",
  seconds: 6,
  samples: 24,
  hands: { N: "fist" },
  primary: ["forearms"],
  secondary: ["lats", "upper_back"],
  still: 0.5,
  scene: [
    { draw: { svg: `<rect class="wall" x="26" y="-300" width="40" height="300"/><rect class="wood" x="12" y="-240" width="14" height="16" rx="2"/>`, box: [12, -300, 66, 0] }, layer: "back" },
    { draw: { svg: `<rect class="pad" x="-90" y="-50" width="40" height="7" rx="3"/><rect class="frame" x="-84" y="-43" width="4" height="43"/><rect class="frame" x="-60" y="-43" width="4" height="43"/>`, box: [-90, -50, -50, 0] }, layer: "back" },
  ],
  motion: (p) => {
    // The ramp: each hang lets the hips sink a little more weight into the
    // hands, then off.
    const load = kf(p, [[0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1], [1, 0.2]]);
    const pose0 = hangSide(HANG_RAMP_EDGE, { torso: lerp(16, 10, load), reach: lerp(172, 176, load) });
    const ankle = v(-70, -58);
    return { pose: { ...pose0, legN: plantLeg(pose0.hip, ankle, 30, 1), legF: plantLeg(pose0.hip, ankle, 30, 1) } };
  },
};

// --- Pulling power ------------------------------------------------------------------

const ACROSS = -238;

function backHang(shoulderY: number, shrug: number, gripN: V, gripF: V, hipX = 0): Pose {
  const lumbar = v(hipX, shoulderY + 38 + shrug);
  const hip = v(hipX, lumbar.y + 11);
  let pose: Pose = { ...STAND, hip, shrug, legN: limb(2, 4, 0), legF: mirror(limb(2, 4, 0)) };
  const s = shoulders(pose, "back");
  const aN = ik2(s.N, gripN, LEN.upperArm, LEN.forearm + LEN.grip, -1);
  const aF = ik2(s.F, gripF, LEN.upperArm, LEN.forearm + LEN.grip, 1);
  pose = { ...pose, armN: { upper: aN.upper, lower: aN.lower, end: aN.lower }, armF: { upper: aF.upper, lower: aF.lower, end: aF.lower } };
  return pose;
}

const HANG_Y = ACROSS + 60;
const TOP_Y = ACROSS + 9;

const offsetPullUp: Spec = {
  name: "Offset Pull-Up",
  view: "back",
  mode: "alternate",
  seconds: 3.2,
  hands: { N: "fist" },
  primary: ["lats", "biceps"],
  secondary: ["upper_back", "forearms", "obliques"],
  still: 0.75,
  scene: [
    { draw: pullUpBarAcross(ACROSS), layer: "back" },
    { draw: { svg: `<rect x="-30" y="${ACROSS}" width="5" height="44" fill="#e6e1d3" stroke="#a89d8c" stroke-width=".6"/>`, box: [-30, ACROSS, -25, ACROSS + 44] }, layer: "back" },
  ],
  motion: (p) => ({ pose: backHang(lerp(HANG_Y, TOP_Y + 6, p), lerp(4, -2, p), v(24, ACROSS), v(-27, ACROSS + 36), lerp(0, 6, p)) }),
};

const assistedOneArm: Spec = {
  name: "Assisted One-Arm Pull-Up",
  view: "back",
  mode: "alternate",
  seconds: 3.4,
  hands: { N: "fist" },
  primary: ["lats", "biceps"],
  secondary: ["forearms", "upper_back", "obliques"],
  still: 0.75,
  scene: [{ draw: pullUpBarAcross(ACROSS), layer: "back" }],
  props: [{ id: "band", draw: { svg: `<path class="band" d="M0 0H1" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "back" }],
  motion: (p) => {
    const pose = backHang(lerp(HANG_Y, TOP_Y + 4, p), lerp(4, -2, p), v(6, ACROSS), v(-30, lerp(ACROSS + 70, ACROSS + 40, p)), lerp(-6, 4, p));
    return { pose, props: { band: line(v(-30, ACROSS), grips(pose, "back").F) } };
  },
};

const typewriter: Spec = {
  name: "Typewriter Pull-Up",
  view: "back",
  mode: "loop",
  seconds: 5,
  samples: 30,
  hands: { N: "fist" },
  primary: ["lats", "biceps"],
  secondary: ["upper_back", "forearms", "delts_rear"],
  still: 0.4,
  scene: [{ draw: pullUpBarAcross(ACROSS, 56), layer: "back" }],
  motion: (p) => {
    const y = kf(p, [[0, HANG_Y], [0.2, TOP_Y], [0.8, TOP_Y], [1, HANG_Y]]);
    const x = kf(p, [[0, 0], [0.2, 0], [0.4, 22], [0.6, -22], [0.8, 0], [1, 0]]);
    return { pose: backHang(y, kf(p, [[0, 4], [0.2, -2], [0.8, -2], [1, 4]]), v(38, ACROSS), v(-38, ACROSS), x) };
  },
};

function lockOff(o: { name: string; aka?: string[]; frenchies?: boolean }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    view: "back",
    mode: "loop",
    seconds: o.frenchies ? 7 : 5,
    samples: 36,
    hands: { N: "fist" },
    primary: ["lats", "biceps"],
    secondary: ["upper_back", "forearms", "delts_rear"],
    still: 0.3,
    scene: [{ draw: pullUpBarAcross(ACROSS), layer: "back" }],
    motion: (p) => {
      // Shoulder height for a given elbow angle: top, 90°, 120°.
      const at90 = ACROSS + 30;
      const at120 = ACROSS + 44;
      const keys: [number, number][] = o.frenchies
        ? [[0, HANG_Y], [0.1, TOP_Y], [0.2, TOP_Y], [0.28, at90], [0.38, at90], [0.46, TOP_Y], [0.54, at120], [0.66, at120], [0.74, TOP_Y], [0.82, TOP_Y], [1, HANG_Y]]
        : [[0, HANG_Y], [0.15, at90], [0.45, at90], [0.55, at120], [0.85, at120], [1, HANG_Y]];
      const y = kf(p, keys);
      return { pose: backHang(y, y > ACROSS + 50 ? 3 : -2, v(28, ACROSS), v(-28, ACROSS)) };
    },
  };
}

// --- Tension board ------------------------------------------------------------------

// Side-on, a 30° board leaning over the climber.
const BOARD = { bottom: v(70, 0), lean: 30 };
const onBoard = (y: number) => v(BOARD.bottom.x + y * Math.tan((BOARD.lean * Math.PI) / 180), y);
const CUT_HAND = onBoard(-206);
const CUT_FOOT = onBoard(-62);

const cutLoose: Spec = (() => {
  const on = (() => {
    const pose0 = hangSide(CUT_HAND, { torso: 34, reach: 196 });
    return { ...pose0, legN: plantLeg(pose0.hip, add(CUT_FOOT, v(-6, -6)), 60, 1), legF: plantLeg(pose0.hip, add(CUT_FOOT, v(-6, 20)), 60, 1) };
  })();
  const off = (() => {
    const pose0 = hangSide(CUT_HAND, { torso: -6, reach: 176 });
    return { ...pose0, legN: limb(-14, -18, -10), legF: limb(-20, -24, -16) };
  })();
  const swing = (() => {
    const pose0 = hangSide(CUT_HAND, { torso: 12, reach: 186 });
    return { ...pose0, legN: limb(30, 10, 20), legF: limb(24, 4, 14) };
  })();
  return {
    name: "Tension Board Cut-Loose",
    aka: ["Cut-Loose"],
    mode: "loop",
    seconds: 3.4,
    samples: 30,
    hands: { N: "fist" },
    primary: ["abs", "lats", "forearms"],
    secondary: ["hip_flexors", "obliques", "upper_back"],
    still: 0,
    scene: [
      {
        draw: {
          svg: `<path d="M${BOARD.bottom.x + 8} 0L${n1(onBoard(-260).x + 8)} -260L${n1(onBoard(-260).x + 30)} -260L${BOARD.bottom.x + 30} 0Z" fill="#5a6470"/>${holdShape(CUT_HAND.x + 2, CUT_HAND.y + 2, 5.6, 0)}${holdShape(CUT_FOOT.x + 2, CUT_FOOT.y, 4, 2)}${holdShape(onBoard(-130).x + 2, -130, 4, 4)}`,
          box: [onBoard(-260).x - 4, -260, BOARD.bottom.x + 30, 0],
        },
        layer: "back",
      },
    ],
    motion: (p: number) => ({ pose: seq(p, [[0, on], [0.2, on], [0.4, off], [0.55, swing], [0.7, off], [0.88, on], [1, on]]) }),
  } satisfies Spec;
})();

// --- Grip tools ---------------------------------------------------------------------

const pinchBlockLift: Spec = {
  name: "Pinch Block Lift",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  primary: ["forearms"],
  secondary: ["traps", "obliques"],
  still: 1,
  props: [{ id: "block", draw: { svg: `<rect class="wood" x="-4" y="-5" width="8" height="12" rx="1.5"/><path d="M0 7V14" stroke="#5b6461" stroke-width="1"/><rect class="iron" x="-10" y="14" width="20" height="8" rx="2"/>`, box: [-10, -5, 10, 22] }, layer: "front" }],
  motion: (p) => {
    const torso = lerp(-58, -3, p);
    const probe = (pose: Pose) => shoulders(pose).N;
    let pose = stand(lerp(-84, -94.4, p), { torso, pelvis: torso * 0.9, head: torso * 0.5 }, { probe, over: lerp(12, 4, p) });
    pose = { ...pose, armN: limb(lerp(0, 4, p)), armF: limb(lerp(10, 14, p), lerp(30, 40, p)) };
    return { pose, props: { block: at(grips(pose).N) } };
  },
};

const wristRoller: Spec = {
  name: "Wrist Roller",
  mode: "alternate",
  seconds: 3,
  samples: 12,
  hands: { N: "fist" },
  primary: ["forearms"],
  secondary: ["delts_front"],
  still: 0.5,
  props: [
    { id: "roller", draw: { svg: `<circle class="wood" r="3.2"/>`, box: [-3.2, -3.2, 3.2, 3.2] }, layer: "front" },
    { id: "cord", draw: { svg: `<path d="M0 0H1" fill="none" stroke="#5b6461" stroke-width="1" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "front" },
    { id: "weight", draw: { svg: `<rect class="iron" x="-11" y="0" width="22" height="9" rx="2"/>`, box: [-11, 0, 11, 9] }, layer: "front" },
  ],
  motion: (p) => {
    let pose = stand(-94.4, { torso: -2 });
    const roll = Math.sin(p * Math.PI * 6) * 24;
    pose = { ...pose, armN: limb(84, 88, 88 + roll), armF: limb(84, 88, 88 - roll) };
    const g = grips(pose).N;
    const w = v(g.x, lerp(-14, g.y + 22, p));
    return { pose, props: { roller: at(g), cord: line(g, w), weight: at(w) } };
  },
};

const riceBucket: Spec = {
  name: "Rice Bucket Dig",
  aka: ["Rice Bucket"],
  mode: "loop",
  seconds: 1.6,
  samples: 16,
  hands: { N: "hand" },
  primary: ["forearms"],
  secondary: [],
  still: 0.25,
  scene: [
    {
      draw: {
        svg: `<path d="M24 -46L60 -46L56 0L28 0Z" fill="#c9d3d9" stroke="#7c8b94" stroke-width=".8"/><path d="M26 -40H58" stroke="#e8dcc0" stroke-width="5"/>`,
        box: [24, -46, 60, 0],
      },
      layer: "front",
    },
  ],
  motion: (p) => {
    const probe = (pose: Pose) => shoulders(pose).N;
    let pose = stand(-90, { torso: -36, pelvis: -24, head: -20 }, { probe, over: 18, ankleN: v(-6, -8) });
    const twist = Math.sin(2 * Math.PI * p);
    pose = hold(pose, "side", v(42 + twist * 3, -30), v(40 - twist * 3, -30), -1);
    pose = { ...pose, armN: { ...pose.armN, end: pose.armN.end + twist * 30 }, armF: { ...pose.armF, end: pose.armF.end - twist * 30 } };
    return { pose };
  },
};

// The side-on scapular pull-up: arms straight, the shoulders draw down.
const SCAP_BAR = v(4, -236);
const scapularPullUp: Spec = {
  name: "Scapular Pull-Up",
  aka: ["Scap Pull-Up"],
  mode: "alternate",
  seconds: 2.4,
  hands: { N: "fist" },
  primary: ["lats", "traps", "upper_back"],
  secondary: ["forearms"],
  still: 1,
  scene: [{ draw: pullUpBar(SCAP_BAR), layer: "back" }],
  motion: (p) => {
    const pose = hangSide(SCAP_BAR, { torso: lerp(1, 9, p), shrug: lerp(4.5, -2.5, p), head: lerp(-3, 5, p), reach: lerp(180, 186, p) });
    return { pose: { ...pose, legN: limb(lerp(3, 10, p), lerp(-2, 2, p), -14), legF: limb(lerp(-3, 4, p), lerp(-6, -2, p), -18) } };
  },
};

const ON_WALL = { primary: ["forearms", "lats"] as Spec["primary"], secondary: ["biceps", "upper_back", "calves", "abs"] as Spec["secondary"] };

export const CLIMB: Spec[] = [
  climb({ name: "Boulder 4x4", seconds: 3.2, ...ON_WALL }),
  climb({ name: "Boulder Pyramid", seconds: 3.8, ...ON_WALL }),
  climb({ name: "Warm-Up Boulder Ladder", seconds: 4.4, ...ON_WALL }),
  climb({ name: "Silent Feet Drill", seconds: 5, ...ON_WALL, secondary: ["calves", "quads", "biceps", "abs"] }),
  climb({ name: "Straight-Arm Drill", seconds: 4.4, straightArms: true, ...ON_WALL, secondary: ["quads", "glutes", "calves"] }),
  climb({ name: "Flagging Drill", seconds: 4.4, flag: true, ...ON_WALL, secondary: ["obliques", "abductors", "biceps"] }),
  climb({ name: "Down-Climbing", aka: ["Downclimbing"], flow: "down", seconds: 4.4, ...ON_WALL, secondary: ["quads", "calves", "biceps"] }),
  climb({ name: "Boulder Traverse", flow: "right", seconds: 4.4, ...ON_WALL }),
  climb({ name: "Easy Traverse", flow: "right", seconds: 5, ...ON_WALL }),
  climb({ name: "ARC Training", aka: ["ARC"], flow: "right", seconds: 5.4, ...ON_WALL }),
  climb({ name: "Route Laps", rope: true, seconds: 4.4, ...ON_WALL }),
  climb({ name: "Route Intervals", rope: true, seconds: 3.8, ...ON_WALL }),
  climb({ name: "Circuit Board Laps", board: "circuit", seconds: 3.8, ...ON_WALL }),
  climb({ name: "Campus Board Ladder", board: "campus", period: 44, seconds: 2.6, primary: ["forearms", "lats", "biceps"], secondary: ["upper_back", "abs", "delts_rear"] }),
  climb({ name: "Campus Board Bumps", board: "campus", period: 24, seconds: 2.2, primary: ["forearms", "lats", "biceps"], secondary: ["upper_back", "abs"] }),
  limitBouldering,
  hang({ name: "Dead Hang", bar: true, primary: ["forearms"], secondary: ["lats", "upper_back", "traps"] }),
  hang({ name: "Hangboard Max Hangs", aka: ["Max Hangs"], weight: true }),
  hang({ name: "Hangboard Repeaters", aka: ["Repeaters"], repeaters: true }),
  hang({ name: "Half-Crimp Hang", aka: ["Half Crimp Hang"] }),
  hang({ name: "Open-Hand Hang", aka: ["Open Hand Hang"] }),
  hang({ name: "Three-Finger Drag", aka: ["Three Finger Drag"] }),
  hang({ name: "Two-Finger Pocket Hang", aka: ["Two Finger Pocket Hang"] }),
  oneArmAssisted,
  feetOnHangRamp,
  pinchBlockLift,
  wristRoller,
  riceBucket,
  offsetPullUp,
  assistedOneArm,
  typewriter,
  lockOff({ name: "Lock-Off Hold", aka: ["Lock Off"] }),
  lockOff({ name: "Frenchies", frenchies: true }),
  cutLoose,
  scapularPullUp,
];

