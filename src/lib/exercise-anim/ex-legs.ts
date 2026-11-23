// Squats, lunges, hinges, bridges and the leg machines.

import {
  barbellFar,
  barbellNear,
  barLine,
  box,
  cable,
  cableTower,
  column,
  dumbbellEnd,
  dumbbellGoblet,
  flatBench,
  hyperBench,
  kettlebell,
  kettlebellGoblet,
  landmineBase,
  legPressFrame,
  legPressSled,
  mat,
  plateEdge,
  roller,
  seat,
  step,
  wall,
} from "./equipment";
import {
  add,
  at,
  base,
  dirAngle,
  FOOT,
  frontJoints,
  gripArm,
  grips,
  hold,
  joints,
  kf,
  kfv,
  LEN,
  lerp,
  lerpV,
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
  sub,
  turned,
  v,
  type Limb,
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

// --- Knees over toes ---------------------------------------------------------------

// Bodyweight sissy squat on flat ground, as in reel DJSvX28y5Jm: the heels
// peel up early and the body rides up onto the toes, the knees travel
// forward and down until they rest on the floor, and the body stays nearly
// straight from knee to shoulder, leaning back about 50 degrees at the
// bottom. The arms hang loose, the hands ending down by the heels.
const SISSY_TOE = v(FOOT.toe.x, 0);
const SISSY_KNEE_Y = -5;
const SISSY_FOOT = -72;

function sissyFrame(p: number) {
  // The foot turns about the toe, heel up (negative = heel up).
  const foot = kf(p, [[0, 0], [0.25, -36], [1, SISSY_FOOT]]);
  const ankle = sub(SISSY_TOE, rot(FOOT.toe, foot));
  // Shin tilt forward from vertical, solved so the knee rests on the floor
  // at the bottom.
  const low = sub(SISSY_TOE, rot(FOOT.toe, SISSY_FOOT));
  const shinBottom = (Math.acos((low.y - SISSY_KNEE_Y) / LEN.shin) * 180) / Math.PI;
  const shin = (kf(p, [[0, 0], [1, shinBottom]]) * Math.PI) / 180;
  const knee = add(ankle, v(Math.sin(shin) * LEN.shin, -Math.cos(shin) * LEN.shin));
  // The trunk leans back; the thigh follows it with a slight hip bend.
  const lean = kf(p, [[0, -2], [0.3, 18], [1, 48]]);
  const hipBend = kf(p, [[0, 0], [1, 14]]);
  const hip = add(knee, rot(v(0, -LEN.thigh), lean - hipBend));
  let pose = base(hip, { torso: lean, pelvis: lean - hipBend * 0.6, head: lean * 0.2 });
  const leg = plantLeg(hip, ankle, foot, 1);
  pose = { ...pose, legN: leg, legF: { ...leg } };
  const arm = kf(p, [[0, 6], [1, -18]]);
  pose = { ...pose, armN: limb(arm, arm + 8), armF: limb(arm + 4, arm + 12) };
  return { pose };
}

const sissySquat: Spec = {
  name: "Sissy Squat",
  aka: ["Knees Over Toes Squat", "KOT Squat", "Bodyweight Sissy Squat", "Sissy Squat to Knees"],
  mode: "alternate",
  seconds: 3.8,
  hands: { N: "hand" },
  primary: ["quads"],
  secondary: ["hip_flexors", "abs"],
  still: 0.8,
  motion: sissyFrame,
};

// Goblet squat ankle shift, the ankle fix in reel DI17NR-PTVz: sit in the
// bottom of a goblet squat, then shift the weight onto one foot and drive
// that knee forward past the toes, heel flat, chest over the knee. Held
// 5-10 s to stretch the soleus, then the other side. Side view, near leg
// working: the hips slide forward and a touch down, the shin tips from
// about 30 to about 45 degrees, and the foot never leaves the floor.
const ANKLE_SHIFT_HIP = -47;

function ankleShiftFrame(p: number) {
  const s = kf(p, [[0, 0], [0.75, 1], [1, 1]]);
  const torso = lerp(-26, -40, s);
  const trunk = { torso, pelvis: torso * 0.88, head: torso * 0.45 };
  const probe = (pose: Pose) => onTrunk(pose, v(4, -22));
  let pose = stand(ANKLE_SHIFT_HIP + lerp(0, 5, s), trunk, { probe, over: lerp(6, 21, s), ankleN: v(0, -8), ankleF: v(-3, -8) });
  const g = onTrunk(pose, GOBLET);
  pose = hold(pose, "side", g, undefined, -1);
  return { pose, props: { w: turned(g, torso * 0.5) } };
}

const gobletAnkleShift: Spec = {
  name: "Goblet Squat Ankle Shift",
  aka: ["Goblet Squat Soleus Stretch", "Goblet Squat Knee Shift", "Goblet Squat Ankle Mobilization", "Goblet Squat Ankle Pry"],
  mode: "alternate",
  seconds: 5,
  hands: { N: "fist" },
  primary: ["calves"],
  secondary: ["quads", "adductors"],
  still: 1,
  props: [{ id: "w", draw: dumbbellGoblet(), layer: "front" }],
  motion: ankleShiftFrame,
};

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

// Barbell single-leg RDL from reel DW62fqBjhmi: bar in both hands, standing
// on the far leg, the free knee bent about 90 degrees so the foot rides up
// behind as the trunk tips toward level and the bar slides down the shin.
const barbellSingleLegRdl: Spec = {
  name: "Barbell Single-Leg RDL",
  aka: ["Barbell Single Leg RDL", "Barbell Single-Leg Romanian Deadlift", "Barbell Single-Leg Deadlift"],
  mode: "alternate",
  seconds: 3.8,
  hands: { N: "fist" },
  primary: ["hamstrings", "glutes"],
  secondary: ["abductors", "lower_back", "forearms"],
  still: 0.8,
  props: barbell(),
  motion: (p) => {
    const torso = lerp(-4, -76, p);
    const arm = lerp(6, 1, p);
    const probe = (pose: Pose) => add(shoulders(pose).N, rot(v(0, 61.6), arm));
    let pose = stand(lerp(-94.2, -88, p), { torso, pelvis: lerp(-2, -70, p), head: torso * 0.7 }, { probe, over: lerp(15, 12, p) });
    const thigh = kf(p, [[0, -8], [1, torso + 2]]);
    pose = { ...pose, legN: limb(thigh, thigh - 92, thigh - 70), armN: limb(arm), armF: limb(arm) };
    return { pose, props: { bar: at(grips(pose).N) } };
  },
};

// Kettlebell single-leg RDL with the back to a wall, from reel DW62fqBjhmi:
// the hips reach back until the glutes touch the wall, the free knee stays
// bent with the foot low behind, and the bell in the opposite hand drops to
// the floor beside the standing foot. The wall says how far back to sit.
const SLW_WALL = -40;
const wallSingleLegRdl: Spec = {
  name: "Wall Single-Leg RDL",
  aka: ["Kettlebell Wall Single-Leg RDL", "Single-Leg RDL to Wall", "Wall-Assisted Single-Leg RDL", "Single-Leg RDL with Wall Touch"],
  mode: "alternate",
  seconds: 3.8,
  hands: { N: "fist", F: "hand" },
  primary: ["hamstrings", "glutes"],
  secondary: ["abductors", "lower_back", "forearms"],
  still: 0.8,
  scene: [{ draw: wall(SLW_WALL - 8, -170), layer: "back" }],
  props: [{ id: "kb", draw: kettlebell(), layer: "front" }],
  motion: (p) => {
    const torso = lerp(-4, -80, p);
    let pose = stand(lerp(-94.4, -80, p), { torso, pelvis: torso * 0.9, head: torso * 0.75 }, { hipX: lerp(-6, -22, p) });
    pose = { ...pose, legN: limb(lerp(-2, 8, p), lerp(-36, -34, p), lerp(-20, -10, p)), armN: limb(0), armF: limb(4, 10, 10) };
    return { pose, props: { kb: at(grips(pose).N) } };
  },
};

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

// Sitting on the end of a bench, so the hips can't travel back: the hinge is
// the pelvis tipping forward with the trunk, back flat, bar on the shoulders.
const seatedGoodMorning: Spec = {
  name: "Seated Good Morning",
  mode: "alternate",
  seconds: 3.4,
  hands: { N: "fist" },
  primary: ["lower_back", "glutes"],
  secondary: ["hamstrings", "adductors"],
  still: 0.8,
  scene: [{ draw: flatBench(-100, 8, -44), layer: "back" }],
  props: barbell(),
  motion: (p) => {
    const torso = lerp(-4, -74, p);
    let pose = seated(-44, 34, { torso, pelvis: torso * 0.9, head: torso * 0.65 });
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

// From reel DQKLYtmCFgm: shoulders on a bench, hips held up level in a
// bridge, one kettlebell held by the horns at arm's length. The straight arms
// sweep the bell in an arc over the chest, from low beside the near hip, up
// over the face, and down past the far shoulder, the trunk turning a little
// with it while the hips stay up. Seen side-on, the arc runs across the body,
// so each arm direction is aimed in three dimensions (toward the feet, down,
// toward the viewer) and drawn as its projection, shortened by how much of it
// points at or away from the viewer. The bell shows in front of the body on
// the near side and behind it on the far side.
type Dir3 = [feet: number, down: number, near: number];
const RAINBOW: [number, Dir3][] = [
  [-1, [0.45, 0.5, 0.74]], // low beside the near hip
  [0, [0, -1, 0]], // straight up over the chest
  [1, [-0.35, 0.5, -0.79]], // low past the far shoulder
];
function rainbowDir(side: number): Dir3 {
  const i = side <= 0 ? 0 : 1;
  const [s0, a] = RAINBOW[i];
  const [s1, b] = RAINBOW[i + 1];
  const t = (side - s0) / (s1 - s0);
  const d: Dir3 = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const n = Math.hypot(...d);
  return [d[0] / n, d[1] / n, d[2] / n];
}

const bridgeRainbow: Spec = {
  name: "Bench Bridge Kettlebell Rainbow",
  aka: ["Hip Thrust Kettlebell Rainbow", "Kettlebell Rainbow Hip Thrust", "Bridge Kettlebell Rainbow", "Bench Bridge Rainbow"],
  mode: "alternate",
  seconds: 3.4,
  samples: 16,
  hands: { N: "fist" },
  primary: ["obliques", "abs", "glutes"],
  secondary: ["lats", "hamstrings", "delts_front", "forearms"],
  still: 0,
  scene: [{ draw: flatBench(-110, -24, -44), layer: "back" }],
  props: [
    { id: "kbFar", draw: kettlebell(), layer: "back" },
    { id: "kbNear", draw: kettlebell(), layer: "front" },
  ],
  motion: (p) => {
    // -1 low on the near side, +1 low on the far side, a beat at each end.
    const side = kf(p, [[0, -1], [0.12, -1], [0.5, 0], [0.88, 1], [1, 1]]);
    const d = rainbowDir(side);
    let angle = (Math.atan2(d[0], d[1]) * 180) / Math.PI;
    if (side > 0 && angle < 0) angle += 360; // over the top toward the head
    const k = Math.max(0.12, Math.hypot(d[0], d[1]));
    // The hips stay up; the trunk tips a touch toward the bell.
    let pose = bridgePose(v(-27, -44), 90 - side * 2, v(42, -8));
    const arm = { ...limb(angle, angle, angle), ku: k, kl: k, ke: Math.max(0.4, k) };
    pose = { ...pose, armN: arm, armF: { ...arm } };
    const g = grips(pose).N;
    const kb = { at: g, angle, scaleX: 1 };
    const hidden = { at: g, angle, scaleX: 0.001 };
    const near = d[2] >= 0;
    return { pose, props: { kbNear: near ? kb : hidden, kbFar: near ? hidden : kb } };
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

// Kneeling, ankles pinned, lowering forward from the knees with the hips
// kept straight. `band` runs from an anchor behind to the chest, taking some
// of the weight on the way down.
const NORDIC_ANCHOR = v(-96, -150);
function nordic(o: { name: string; aka?: string[]; band?: boolean }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 3.6,
    hands: { N: "palm" },
    primary: ["hamstrings"],
    secondary: ["glutes", "calves"],
    still: 0.7,
    scene: [
      { draw: { svg: `<circle class="pad" cx="-44" cy="-13" r="4.5"/>`, box: [-49, -18, -39, -8] }, layer: "front" },
      ...(o.band ? [{ draw: { svg: `<rect class="frame" x="${NORDIC_ANCHOR.x - 3}" y="${NORDIC_ANCHOR.y - 20}" width="6" height="${-NORDIC_ANCHOR.y + 20}"/>`, box: [NORDIC_ANCHOR.x - 3, NORDIC_ANCHOR.y - 20, NORDIC_ANCHOR.x + 3, 0] as [number, number, number, number] }, layer: "back" as const }] : []),
    ],
    props: o.band ? [{ id: "band", draw: { svg: `<path class="band" d="M0 0H1" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "front" }] : [],
    motion: (p) => {
      const lean = lerp(0, 68, p);
      const knee = v(0, -6);
      const hip = sub(knee, rot(v(0, 44), -lean));
      let pose = base(hip, { torso: -lean, pelvis: -lean, head: -lean + 10 });
      pose = { ...pose, legN: limb(-lean, -90, -180), legF: limb(-lean, -90, -180) };
      const arm = -lean + lerp(20, 70, p);
      pose = { ...pose, armN: limb(arm, arm + 40, arm + 70), armF: limb(arm, arm + 40, arm + 70) };
      const props: Record<string, PropState> = {};
      if (o.band) props.band = line(NORDIC_ANCHOR, onTrunk(pose, v(6, -30)));
      return { pose, props };
    },
  };
}

// One leg, the other held out in front. `box` sits down onto a box behind
// and stands back up; `assisted` holds a post in front, the hands sliding
// down it, so the arms can help.
function pistol(o: { name: string; aka?: string[]; box?: boolean; assisted?: boolean; landmine?: boolean }): Spec {
  const depth = o.box ? -58 : -42;
  const at1 = (p: number) => {
    const torso = lerp(-4, o.assisted ? -22 : -36, p);
    const probe = (pose: Pose) => onTrunk(pose, v(4, -20));
    return stand(lerp(-94.4, depth, p), { torso, pelvis: torso * 0.85, head: torso * 0.4 }, { probe, over: lerp(4, o.assisted ? 0 : -2, p) });
  };
  const bottom = at1(1).hip;
  const post = v(54, -150);
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 3.4,
    hands: { N: o.assisted || o.landmine ? "fist" : "hand" },
    primary: ["quads", "glutes"],
    secondary: o.landmine ? ["adductors", "hip_flexors", "abs", "obliques"] : ["adductors", "hip_flexors", "abs"],
    still: 0.85,
    scene: [
      ...(o.box ? [{ draw: box(bottom.x - 26, bottom.x + 12, bottom.y + 14), layer: "back" as const }] : []),
      ...(o.assisted ? [{ draw: column(post.x, post.y, 6), layer: "back" as const }] : []),
      ...(o.landmine ? [{ draw: landmineBase(BAZOOKA_PIVOT), layer: "back" as const }] : []),
    ],
    props: o.landmine ? bazookaProps : [],
    motion: (p) => {
      let pose = at1(p);
      const lift = lerp(10, o.box ? 70 : 82, p);
      pose = { ...pose, legF: limb(lift, lift, 10) };
      if (o.landmine) {
        pose = { ...pose, armF: limb(lerp(16, 84, p)) };
        return shoulderLoad(pose, "landmine");
      }
      if (o.assisted) {
        const s = shoulders(pose).N;
        pose = hold(pose, "side", v(post.x + 1, s.y + 14), undefined, -1);
      } else {
        pose = { ...pose, armN: limb(lerp(20, 88, p)), armF: limb(lerp(16, 84, p)) };
      }
      return { pose };
    },
  };
}

// A straight leg from `hip` to `ankle`, drawn shorter when the reach is less
// than the leg: a leg running toward or away from the viewer.
function reachLeg(hip: V, ankle: V, foot: number): Limb {
  const d = sub(ankle, hip);
  const k = Math.min(1, Math.hypot(d.x, d.y) / (LEN.thigh + LEN.shin));
  const a = dirAngle(d);
  return { upper: a, lower: a, end: foot, ku: k, kl: k };
}

// A two-bone limb drawn from `root` through `mid` to `end`, each bone
// foreshortened to the distance it spans — for a leg folded across the body.
function throughLimb(root: V, mid: V, end: V, l1: number, l2: number, foot: number): Limb {
  const a = sub(mid, root);
  const b = sub(end, mid);
  return {
    upper: dirAngle(a),
    lower: dirAngle(b),
    end: foot,
    ku: Math.min(1, Math.hypot(a.x, a.y) / l1),
    kl: Math.min(1, Math.hypot(b.x, b.y) / l2),
  };
}

// One leg, the other knee bent so its foot rides up behind. The back knee
// comes down to the floor a little behind the standing heel with the back
// thigh close to in line with the trunk, which is what makes it a shrimp
// rather than a reverse lunge. `held` holds the back foot up behind with the
// same-side hand, so only the knee touches and the trunk has to stay taller;
// `assisted` holds a post in front.
function shrimp(o: { name: string; aka?: string[]; held?: boolean; assisted?: boolean }): Spec {
  const KNEE_ON_FLOOR = -6;
  const bottom = v(o.held ? -8 : o.assisted ? -10 : -14, -46);
  const thighDown = (-Math.acos((KNEE_ON_FLOOR - bottom.y) / LEN.thigh) * 180) / Math.PI;
  const lean = o.held ? -18 : o.assisted ? -30 : -44;
  const post = v(54, -150);
  const kneeX = bottom.x + LEN.thigh * Math.sin((thighDown * Math.PI) / 180);
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 3.6,
    hands: { N: o.assisted ? "fist" : "hand", F: o.held || o.assisted ? "fist" : "hand" },
    primary: ["quads", "glutes"],
    secondary: ["hip_flexors", "adductors", "abs"],
    still: 0.85,
    scene: [
      { draw: mat(kneeX - 16, kneeX + 14), layer: "back" },
      ...(o.assisted ? [{ draw: column(post.x, post.y, 6), layer: "back" as const }] : []),
    ],
    motion: (p) => {
      const hip = lerpV(v(0.5, -94.4), bottom, p);
      const torso = lerp(-4, lean, p);
      let pose = base(hip, { torso, pelvis: torso * 0.85, head: torso * 0.45 });
      const thigh = lerp(-4, thighDown, p);
      const shin = o.held ? -170 : lerp(-98, -104, p);
      pose = { ...pose, legN: plantLeg(hip, v(0, -8), 0, 1), legF: limb(thigh, shin, shin - 55) };
      if (o.assisted) {
        const s = shoulders(pose).N;
        pose = hold(pose, "side", v(post.x + 1, s.y + 12), undefined, -1);
      } else {
        const reach = lerp(18, 86, p);
        pose = { ...pose, armN: limb(reach, reach + 6), armF: limb(reach - 8, reach - 2) };
      }
      if (o.held) {
        const toes = add(joints(pose).ankleF, rot(v(8, 4), shin - 55));
        pose = { ...pose, armF: gripArm(shoulders(pose).F, toes, 1) };
      }
      return { pose };
    },
  };
}

// The load for a "bazooka" squat: the sleeve end of a landmine bar (a plate
// on it) held on the front of the near shoulder, the bar running down and
// back to its pivot on the floor behind. The banded version swaps the bar
// for a band anchored low behind and pulled up across to the same shoulder.
// Both sit on the near side of the body, so they draw over the trunk.
const BAZOOKA_PIVOT = v(-92, -3);
const BAND_ANCHOR = v(-78, -10);
const bazookaProps: Prop[] = [
  { id: "bar", draw: barLine(), layer: "mid" },
  { id: "plate", draw: plateEdge(19), layer: "mid" },
];
const bandProps: Prop[] = [{ id: "band", draw: { svg: `<path class="band" d="M0 0H1" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "mid" }];

function shoulderLoad(pose: Pose, load: "band" | "landmine"): { pose: Pose; props: Record<string, PropState> } {
  const s = shoulders(pose).N;
  // Hand by the chin, elbow down in front of the chest.
  const grip = add(s, v(13, -9));
  pose = { ...pose, armN: gripArm(s, grip, -1, 0) };
  if (load === "band") return { pose, props: { band: line(BAND_ANCHOR, grip) } };
  const d = sub(grip, BAZOOKA_PIVOT);
  const len = Math.hypot(d.x, d.y);
  const unit = v(d.x / len, d.y / len);
  const bar = line(BAZOOKA_PIVOT, add(grip, v(unit.x * 4, unit.y * 4)));
  return { pose, props: { bar, plate: turned(sub(grip, v(unit.x * 22, unit.y * 22)), bar.angle ?? 0) } };
}

// One leg, the other knee bent with its foot lifted behind, then sitting down
// until the back knee touches the floor just behind the standing heel. The
// trunk stays taller than in a shrimp squat and the back shin angles up off
// the floor rather than lying along it. `load` holds a band or the end of a
// landmine bar (a "bazooka") on the near shoulder.
function skater(o: { name: string; aka?: string[]; load?: "band" | "landmine" }): Spec {
  const KNEE_ON_FLOOR = -6;
  const bottom = v(-10, -48);
  const thighDown = (-Math.acos((KNEE_ON_FLOOR - bottom.y) / LEN.thigh) * 180) / Math.PI;
  const lean = o.load ? -24 : -34;
  const kneeX = bottom.x + LEN.thigh * Math.sin((thighDown * Math.PI) / 180);
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 3.4,
    hands: { N: o.load ? "fist" : "hand", F: "hand" },
    primary: ["quads", "glutes"],
    secondary: o.load ? ["hip_flexors", "adductors", "abs", "obliques"] : ["hip_flexors", "adductors", "abs"],
    still: 0.85,
    scene: [
      { draw: mat(kneeX - 16, kneeX + 14), layer: "back" },
      ...(o.load === "landmine" ? [{ draw: landmineBase(BAZOOKA_PIVOT), layer: "back" as const }] : []),
      ...(o.load === "band"
        ? [{ draw: { svg: `<rect class="frame" x="${BAND_ANCHOR.x - 3}" y="${BAND_ANCHOR.y - 6}" width="6" height="${-BAND_ANCHOR.y + 6}"/>`, box: [BAND_ANCHOR.x - 3, BAND_ANCHOR.y - 6, BAND_ANCHOR.x + 3, 0] as [number, number, number, number] }, layer: "back" as const }]
        : []),
    ],
    props: o.load === "landmine" ? bazookaProps : o.load === "band" ? bandProps : [],
    motion: (p) => {
      const hip = lerpV(v(0.5, -94.4), bottom, p);
      const torso = lerp(-4, lean, p);
      let pose = base(hip, { torso, pelvis: torso * 0.85, head: torso * 0.45 });
      const thigh = lerp(-2, thighDown, p);
      const shin = lerp(-100, -128, p);
      pose = { ...pose, legN: plantLeg(hip, v(0, -8), 0, 1), legF: limb(thigh, shin, shin - 50) };
      if (o.load) {
        // The free hand swings forward for balance as the hips sink.
        pose = { ...pose, armF: limb(lerp(-14, 62, p), lerp(-4, 80, p)) };
        return shoulderLoad(pose, o.load);
      }
      // Arms swing like a skater's: the far one forward, the near one back.
      pose = { ...pose, armN: limb(lerp(-6, -34, p), lerp(4, -10, p)), armF: limb(lerp(10, 78, p), lerp(20, 90, p)) };
      return { pose };
    },
  };
}

// One leg, the other swung behind it and out long past the standing side, so
// from here it trails back and away from the viewer (drawn foreshortened).
// The trunk folds right over the working knee to balance it, both arms
// reaching toward the floor in front. `assisted` holds a post and stays a
// little taller.
function dragon(o: { name: string; aka?: string[]; assisted?: boolean }): Spec {
  const post = v(56, -150);
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 4,
    hands: { N: o.assisted ? "fist" : "hand" },
    primary: ["quads", "glutes"],
    secondary: ["abductors", "adductors", "abs"],
    still: 0.9,
    scene: o.assisted ? [{ draw: column(post.x, post.y, 6), layer: "back" }] : [],
    motion: (p) => {
      // The free leg threads behind first, then the hips sink while it slides out long.
      const sink = kf(p, [[0.18, 0], [1, 1]]);
      const hip = lerpV(v(1, -94.4), v(o.assisted ? -4 : -8, -40), sink);
      const torso = lerp(-6, o.assisted ? -44 : -68, sink);
      let pose = base(hip, { torso, pelvis: torso * 0.8, head: torso * 0.5 });
      pose = { ...pose, legN: plantLeg(hip, v(0, -8), 0, 1) };
      const ankle = kfv(p, [[0, v(8, -18)], [0.3, v(-22, -24)], [1, v(-80, -5)]]);
      const free = reachLeg(hip, ankle, 0);
      // Toes turn from forward to trailing back as the leg threads behind,
      // never dipping through the floor on the way.
      let foot = lerp(free.upper + 10, -148, kf(p, [[0, 0], [0.4, 1]]));
      while (ankle.y + rot(FOOT.toe, foot).y > -1 && foot > -180) foot -= 2;
      pose = { ...pose, legF: { ...free, end: foot } };
      if (o.assisted) {
        const s = shoulders(pose).N;
        pose = hold(pose, "side", v(post.x + 1, s.y + 10), undefined, -1);
      } else {
        pose = { ...pose, armN: limb(lerp(14, 62, sink), lerp(20, 66, sink)), armF: limb(lerp(10, 50, sink), lerp(16, 56, sink)) };
      }
      return { pose };
    },
  };
}

// Square-on: standing on the left-of-picture leg with the other ankle crossed
// over that thigh just above the knee, so the legs make a 4, then sitting
// back and down on the standing leg until the crossed shin lies level across
// the lap. The standing thigh points at the viewer, so it shortens as it
// bends. `box` sits down to a box behind.
function figure4(o: { name: string; aka?: string[]; box?: boolean }): Spec {
  const RAD = Math.PI / 180;
  const foot = v(-7, -8);
  return {
    name: o.name,
    aka: o.aka,
    view: "front",
    legsInFront: true,
    mode: "alternate",
    seconds: 3.6,
    hands: { N: "hand" },
    primary: ["quads", "glutes"],
    secondary: ["abductors", "adductors", "abs"],
    still: 0.9,
    scene: o.box ? [{ draw: box(-34, 34, -50), layer: "back" }] : [],
    motion: (p) => {
      const pitch = lerp(4, o.box ? 66 : 78, p);
      const tilt = lerp(2, 28, p);
      const ku = Math.cos(pitch * RAD);
      const kl = Math.cos(tilt * RAD);
      // The standing knee tracks a little out over the toes, which also keeps
      // the bend readable from the front; then the body is slid so that foot
      // stays planted.
      const standing: Limb = { upper: lerp(-1, -16, p), lower: lerp(0, 9, p), end: 0, ku, kl };
      let pose = base(v(0, -94.4), { torso: lerp(0, 3, p), pelvis: 0, head: 0 });
      pose = { ...pose, legF: standing };
      pose = { ...pose, hip: add(pose.hip, sub(foot, frontJoints(pose).ankleF)) };
      // The crossed ankle rests just above the standing knee, the foot hanging
      // off its outside; the crossed knee opens out to the right.
      const j = frontJoints(pose);
      const ankle = add(lerpV(j.hipF, j.kneeF, 0.8), v(-3, -2));
      const knee = add(ankle, v(38, lerp(2, 4, p)));
      pose = { ...pose, legN: throughLimb(j.hip, knee, ankle, LEN.thigh, LEN.shin, -100) };
      // Arms out for balance, then reaching forward (toward the viewer).
      const arm = { ...limb(lerp(34, 10, p), lerp(40, 10, p)), ku: lerp(1, 0.35, p), kl: lerp(1, 0.4, p) };
      pose = { ...pose, armN: arm, armF: mirror(arm) };
      return { pose };
    },
  };
}

// Square-on, one foot on each of two plyo boxes set a stride apart, toes
// turned out, a kettlebell hanging by its handle in both hands between the
// legs. Sitting down into a deep sumo squat, knees out over the toes and the
// chest bowing forward over the bell, lets it sink into the gap below the
// level of the feet: the boxes make the deficit, so the hips get the range the
// floor would stop. The legs are solved in 3D (z toward the viewer) and drawn
// foreshortened, because the thighs swing out and toward the camera.
const SUMO_BOX = { inner: 22, outer: 62, top: -36 };
const SUMO_ANKLE = { x: 35, y: SUMO_BOX.top - 8 };
const SUMO_TOE_OUT = 45;

type V3 = { x: number; y: number; z: number };
const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });

// Hip to ankle with the knee pushed toward `pole`, as a foreshortened limb.
function leg3(hip: V3, ankle: V3, pole: V3): Limb {
  const d = v3(ankle.x - hip.x, ankle.y - hip.y, ankle.z - hip.z);
  const L = Math.hypot(d.x, d.y, d.z);
  const u = v3(d.x / L, d.y / L, d.z / L);
  const T = LEN.thigh;
  const S = LEN.shin;
  const reach = Math.min(L, T + S - 0.01);
  const along = (T * T - S * S + reach * reach) / (2 * reach);
  const out = Math.sqrt(Math.max(0, T * T - along * along));
  const dp = pole.x * u.x + pole.y * u.y + pole.z * u.z;
  const q = v3(pole.x - dp * u.x, pole.y - dp * u.y, pole.z - dp * u.z);
  const qn = Math.hypot(q.x, q.y, q.z) || 1;
  const knee = v3(hip.x + u.x * along + (q.x / qn) * out, hip.y + u.y * along + (q.y / qn) * out, hip.z + u.z * along + (q.z / qn) * out);
  const thigh = v(knee.x - hip.x, knee.y - hip.y);
  const shin = v(ankle.x - knee.x, ankle.y - knee.y);
  return {
    upper: dirAngle(thigh),
    lower: dirAngle(shin),
    end: 0,
    ku: Math.hypot(thigh.x, thigh.y) / T,
    kl: Math.hypot(shin.x, shin.y) / S,
  };
}

const boxSumoSquat: Spec = {
  name: "Kettlebell Deficit Sumo Squat",
  aka: [
    "Deficit Sumo Squat",
    "Box Sumo Squat",
    "Sumo Squat on Boxes",
    "Kettlebell Sumo Squat on Boxes",
    "Elevated Sumo Squat",
    "Plyo Box Sumo Squat",
  ],
  view: "front",
  mode: "alternate",
  seconds: 3.6,
  hands: { N: "fist" },
  primary: ["adductors", "glutes", "quads"],
  secondary: ["hamstrings", "lower_back", "forearms"],
  still: 1,
  scene: [-1, 1].map((s) => {
    const [a, b] = [SUMO_BOX.inner * s, SUMO_BOX.outer * s];
    return { draw: box(Math.min(a, b), Math.max(a, b), SUMO_BOX.top, "mat"), layer: "back" as const };
  }),
  props: [{ id: "kb", draw: kettlebell(), layer: "mid" }],
  motion: (p) => {
    const hipY = lerp(-126, -74, p);
    const hipZ = lerp(0, -14, p);
    let pose: Pose = { ...base(v(0, hipY)), bow: lerp(6, 60, p) };
    const turn = (SUMO_TOE_OUT * Math.PI) / 180;
    const legFor = (s: 1 | -1) =>
      leg3(v3(9 * s, hipY, hipZ), v3(SUMO_ANKLE.x * s, SUMO_ANKLE.y, 0), v3(Math.sin(turn) * s, 0, Math.cos(turn)));
    pose = { ...pose, legN: legFor(1), legF: legFor(-1) };
    // Arms long, hands together on the handle under the chest.
    const sh = shoulders(pose, "front").N;
    const reachY = Math.sqrt((LEN.upperArm + LEN.forearm + LEN.grip - 0.6) ** 2 - (sh.x - 2.4) ** 2);
    const grip = sh.y + reachY;
    pose = hold(pose, "front", v(2.4, grip), v(-2.4, grip), 1);
    return { pose, props: { kb: at(v(0, grip)) } };
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
  sissySquat,
  gobletAnkleShift,
  pistol({ name: "Pistol Squat" }),
  pistol({ name: "Box Pistol Squat", box: true }),
  pistol({ name: "Assisted Pistol Squat", assisted: true }),
  shrimp({ name: "Shrimp Squat", aka: ["Hands-Free Shrimp Squat"] }),
  shrimp({ name: "Assisted Shrimp Squat", assisted: true }),
  shrimp({ name: "Advanced Shrimp Squat", held: true }),
  dragon({ name: "Dragon Squat", aka: ["Dragon Pistol Squat", "Dragon Pistol"] }),
  dragon({ name: "Assisted Dragon Squat", assisted: true }),
  skater({ name: "Skater Squat", aka: ["Skater Squats"] }),
  skater({ name: "Banded Skater Squat", aka: ["Band-Resisted Skater Squat", "Band Skater Squat"], load: "band" }),
  skater({ name: "Bazooka Squat", aka: ["Landmine Skater Squat", "Bazooka Skater Squat", "Bazooka Squats"], load: "landmine" }),
  pistol({ name: "Bazooka Pistol Squat", aka: ["Bazooka Pistol", "Bazooka Pistols", "Landmine Pistol Squat"], landmine: true }),
  figure4({ name: "Figure-4 Squat", aka: ["Figure-4 Single-Leg Squat", "Figure Four Squat", "Crossed-Leg Squat"] }),
  figure4({ name: "Box Figure-4 Squat", box: true }),
  boxSumoSquat,
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
  barbellSingleLegRdl,
  wallSingleLegRdl,
  goodMorning,
  seatedGoodMorning,
  swing({ name: "Kettlebell Swing", top: 88 }),
  swing({ name: "American Kettlebell Swing", top: 172 }),
  hipThrust,
  bridgeRainbow,
  gluteBridge({ name: "Glute Bridge" }),
  gluteBridge({ name: "Single-Leg Glute Bridge", single: true }),
  gluteBridge({ name: "Banded Glute Bridge", band: true }),
  legExtension,
  lyingLegCurl,
  seatedLegCurl,
  backExtension,
  cablePullThrough,
  nordic({ name: "Nordic Hamstring Curl" }),
  nordic({ name: "Band-Assisted Nordic Curl", aka: ["Band Assisted Nordic Curl"], band: true }),
  calfRaise,
  seatedCalfRaise,
];

