// Warm-ups, mobility, stretches, foam rolling, breathing, and the recovery
// rooms (sauna, cold plunge).

import { box, doorFrame, foamRoller, sauna, tubBack, tubFront, wall } from "./equipment";
import {
  add,
  allFours,
  at,
  base,
  frontJoints,
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
  plantLeg,
  prone,
  rot,
  seated,
  seq,
  shoulders,
  stand,
  standSquare,
  supine,
  v,
  type Limb,
  type Pose,
  type Spec,
  type V,
} from "./kit";
import type { Prop } from "./render";

const breathe = (p: number) => kf(p, [[0, 0], [0.4, 1], [0.55, 1], [1, 0]]);
const band = (): Prop => ({ id: "band", draw: { svg: `<path class="band" d="M0 0H1" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "front" });

// --- Shoulders and arms -----------------------------------------------------------

const bandPullApart: Spec = {
  name: "Band Pull-Apart",
  view: "front",
  mode: "alternate",
  seconds: 2.4,
  hands: { N: "fist" },
  primary: ["delts_rear", "upper_back"],
  secondary: ["traps"],
  still: 1,
  props: [band()],
  motion: (p) => {
    const a = lerp(36, 88, p);
    const k = lerp(0.24, 1, p);
    const arm = { ...limb(a, a, a), ku: k, kl: k };
    const pose = { ...standSquare(), armN: arm, armF: mirror(arm) };
    const g = grips(pose, "front");
    return { pose, props: { band: line(g.F, g.N) } };
  },
};

const BAND_POST = v(96, -150);
const bandFacePull: Spec = {
  name: "Band Face Pull",
  mode: "alternate",
  seconds: 2.6,
  hands: { N: "fist" },
  primary: ["delts_rear", "upper_back"],
  secondary: ["traps"],
  still: 1,
  scene: [{ draw: { svg: `<rect class="frame" x="${BAND_POST.x}" y="-200" width="7" height="200"/>`, box: [BAND_POST.x, -200, BAND_POST.x + 7, 0] }, layer: "back" }],
  props: [band()],
  motion: (p) => {
    let pose = stand(-94.4, { torso: 3 }, { ankleN: v(-6, -8), ankleF: v(-14, -8) });
    const s = shoulders(pose).N;
    pose = hold(pose, "side", add(s, v(lerp(56, 14, p), lerp(-6, -20, p))), undefined, 1);
    pose = { ...pose, armN: { ...pose.armN, ku: lerp(1, 0.55, p) }, armF: { ...pose.armF, ku: lerp(1, 0.55, p) } };
    return { pose, props: { band: line(BAND_POST, grips(pose).N) } };
  },
};

const externalRotation: Spec = {
  name: "Shoulder External Rotation",
  view: "front",
  mode: "alternate",
  seconds: 2.4,
  hands: { N: "fist" },
  primary: ["delts_rear"],
  secondary: ["upper_back"],
  still: 1,
  props: [band()],
  motion: (p) => {
    const k = lerp(0.22, 1, p);
    const arm = { ...limb(4, lerp(60, 92, p), lerp(60, 92, p)), kl: k };
    const pose = { ...standSquare(), armN: arm, armF: mirror(arm) };
    const g = grips(pose, "front");
    return { pose, props: { band: line(g.F, g.N) } };
  },
};

const wallSlide: Spec = {
  name: "Wall Slide",
  view: "back",
  mode: "alternate",
  seconds: 3,
  hands: { N: "hand" },
  primary: ["upper_back", "traps"],
  secondary: ["delts_rear"],
  still: 0,
  scene: [{ draw: { svg: `<rect class="wall" x="-70" y="-230" width="140" height="230"/>`, box: [-70, -230, 70, 0] }, layer: "back" }],
  motion: (p) => {
    const upper = lerp(78, 152, p);
    const lower = lerp(176, 166, p);
    const arm = limb(upper, lower, lower);
    return { pose: { ...standSquare(), armN: arm, armF: mirror(arm) } };
  },
};

const armCircles: Spec = {
  name: "Arm Circles",
  view: "front",
  mode: "loop",
  seconds: 1.2,
  samples: 16,
  hands: { N: "hand" },
  primary: ["delts_side"],
  secondary: ["delts_front", "delts_rear", "traps"],
  still: 0,
  motion: (p) => {
    const a = 88 + Math.sin(2 * Math.PI * p) * 14;
    const k = 1 - (1 - Math.cos(2 * Math.PI * p)) * 0.06;
    const arm = { ...limb(a, a, a), ku: k, kl: k };
    return { pose: { ...standSquare(), armN: arm, armF: mirror(arm) } };
  },
};

const shoulderCars: Spec = {
  name: "Shoulder CARs",
  aka: ["Shoulder Controlled Articular Rotations"],
  mode: "loop",
  seconds: 4,
  samples: 24,
  hands: { N: "hand" },
  primary: ["delts_front", "delts_side", "delts_rear"],
  secondary: ["traps", "lats"],
  still: 0.35,
  motion: (p) => {
    const pose = stand(-94.4, { torso: -2 });
    const a = 360 * p;
    return { pose: { ...pose, armN: limb(a, a, a), armF: limb(0, 4, 4) } };
  },
};

// Forearms out in front, elbows bent at the sides.
function forearmsForward(pose: Pose, hand: number, ke = 1): Pose {
  const arm: Limb = { ...limb(8, 90, hand), ke };
  return { ...pose, armN: arm, armF: { ...arm } };
}

const wristCircles: Spec = {
  name: "Wrist Circles",
  mode: "loop",
  seconds: 1.6,
  samples: 16,
  hands: { N: "fist" },
  primary: ["forearms"],
  still: 0,
  motion: (p) => {
    const pose = stand(-94.4, { torso: -2 });
    return { pose: forearmsForward(pose, 90 + Math.sin(2 * Math.PI * p) * 34, 1 - (1 - Math.cos(2 * Math.PI * p)) * 0.12) };
  },
};

const fingerRolls: Spec = {
  name: "Finger Rolls",
  mode: "alternate",
  seconds: 1.4,
  hands: { N: "hand" },
  primary: ["forearms"],
  still: 0,
  motion: (p) => ({ pose: forearmsForward(stand(-94.4, { torso: -2 }), lerp(96, 62, p), lerp(1, 0.72, p)) }),
};

const forearmStretch: Spec = {
  name: "Forearm Stretch",
  aka: ["Wrist Flexor Stretch"],
  mode: "loop",
  seconds: 4,
  hands: { N: "hand", F: "fist" },
  primary: ["forearms"],
  still: 0.5,
  motion: (p) => {
    let pose = stand(-94.4, { torso: -2 });
    const bend = 150 + breathe(p) * 14;
    pose = { ...pose, armN: limb(88, 88, bend) };
    const fingers = add(grips(pose).N, rot(v(0, 4), bend));
    const far = hold(pose, "side", fingers, undefined, -1).armF;
    return { pose: { ...pose, armF: far } };
  },
};

const DOOR = 52;
const doorwayPecStretch: Spec = {
  name: "Doorway Pec Stretch",
  mode: "loop",
  seconds: 4,
  hands: { N: "palm" },
  primary: ["chest", "delts_front"],
  still: 0.5,
  scene: [{ draw: doorFrame(DOOR), layer: "front" }],
  motion: (p) => {
    const lean = breathe(p);
    let pose = stand(-94.4, { torso: lerp(-4, -10, lean), head: -2 }, { hipX: lerp(4, 10, lean), ankleN: v(10, -8), ankleF: v(-16, -8) });
    pose = { ...pose, armN: { ...limb(lerp(80, 72, lean), 180, 180), ku: 0.32 }, armF: limb(-2, 10, 10) };
    return { pose };
  },
};

// --- Lying and kneeling ------------------------------------------------------------

const thoracicRoller: Spec = {
  name: "Thoracic Extension over Foam Roller",
  aka: ["Thoracic Extension", "Foam Roller Thoracic Extension"],
  mode: "alternate",
  seconds: 3.2,
  hands: { N: "fist" },
  primary: ["upper_back", "abs"],
  secondary: ["chest"],
  still: 1,
  props: [{ id: "roller", draw: foamRoller(), layer: "back" }],
  motion: (p) => {
    const torso = lerp(64, 98, p);
    let pose = supine(0, 0, { torso, pelvis: 86, head: torso + 6 });
    pose = { ...pose, hip: v(0, -15) };
    pose = plant(pose, "side", v(34, -8));
    pose = hold(pose, "side", onTrunk(pose, v(-2, -58)), undefined, 1);
    return { pose, props: { roller: at(add(onTrunk(pose, v(-21, -22)), v(0, 0))) } };
  },
};

function rollerSlide(o: { name: string; part: "quads" | "glutes" | "lats" }): Spec {
  const muscles: Record<typeof o.part, Spec["primary"]> = { quads: ["quads"], glutes: ["glutes"], lats: ["lats"] };
  return {
    name: o.name,
    view: o.part === "lats" ? "front" : "side",
    mode: "alternate",
    seconds: 2.6,
    hands: { N: o.part === "glutes" ? "palm" : "fist" },
    primary: muscles[o.part],
    still: 0.5,
    props: [{ id: "roller", draw: foamRoller(), layer: o.part === "lats" ? "front" : "back" }],
    motion: (p) => {
      const slide = lerp(-10, 10, p);
      if (o.part === "quads") {
        // Face down on the forearms, the roller under the thighs.
        const toe = v(-70 + slide, -6);
        let pose = prone(toe, 14);
        pose = { ...pose, legN: { ...pose.legN, end: pose.legN.end + 40 }, legF: { ...pose.legF, end: pose.legF.end + 40 } };
        pose = { ...pose, armN: limb(4, 90, 90), armF: limb(4, 90, 90) };
        return { pose, props: { roller: at(v(pose.hip.x - 20, -7.5)) } };
      }
      if (o.part === "glutes") {
        const hip = v(slide, -24);
        let pose = base(hip, { torso: 24, pelvis: 10, head: 10 });
        pose = { ...pose, legF: plantLeg(hip, v(32 + slide * 0.2, -8), 0, 1), legN: { ...limb(70, 160, 150), ku: 0.7, kl: 0.6 } };
        const s = shoulders(pose).N;
        pose = palms(pose, "side", v(s.x - 18, 0), v(s.x - 18, 0), -90, 1);
        return { pose, props: { roller: at(v(hip.x - 2, -7.5)) } };
      }
      // Lying on the side, roller under the armpit, square-on.
      const pose = base(v(-30 + slide, -18), { torso: -90, pelvis: -90, head: -84 });
      const posed: Pose = {
        ...pose,
        legN: limb(-90, -90, -80),
        legF: { ...limb(-60, -110, -100), ku: 0.7 },
        armN: limb(90, 92, 92),
        armF: limb(-150, -170, -170),
      };
      const j = frontJoints(posed);
      return { pose: posed, props: { roller: at(add(j.shoulder, v(-10, 8))) } };
    },
  };
}

const childsPose: Spec = {
  name: "Child's Pose",
  aka: ["Childs Pose"],
  mode: "loop",
  seconds: 4,
  hands: { N: "palm" },
  primary: ["lats", "lower_back"],
  secondary: ["glutes", "delts_rear"],
  still: 0.5,
  motion: (p) => {
    const b = breathe(p);
    const knee = v(18, -6);
    const hip = v(-18, -22 - b * 2);
    let pose = base(hip, { torso: -122 + b * 4, pelvis: -110, head: -140 });
    pose = { ...pose, legN: { ...limb(dirTo(hip, knee), -90, -180) }, legF: { ...limb(dirTo(hip, knee), -90, -180) } };
    const s = shoulders(pose).N;
    pose = palms(pose, "side", v(s.x + 48, 0), v(s.x + 48, 0), 90, 1);
    return { pose };
  },
};

const dirTo = (a: V, b: V) => (Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI;

const threadTheNeedle: Spec = {
  name: "Thread the Needle",
  mode: "alternate",
  seconds: 3.4,
  hands: { N: "hand", F: "palm" },
  primary: ["upper_back", "delts_rear"],
  secondary: ["obliques", "lats"],
  still: 1,
  motion: (p) => {
    const pose = allFours({ torso: lerp(-90, -104, p), head: lerp(-80, -120, p) });
    const a = lerp(176, -50, p);
    const k = lerp(1, 0.55, p);
    return { pose: { ...pose, armN: { ...limb(a, a, a), ku: k, kl: k } } };
  },
};

const catCow: Spec = {
  name: "Cat-Cow",
  aka: ["Cat Cow"],
  mode: "loop",
  seconds: 4,
  samples: 20,
  hands: { N: "palm" },
  primary: ["lower_back", "abs"],
  secondary: ["upper_back"],
  still: 0.25,
  motion: (p) => {
    const c = Math.sin(2 * Math.PI * p);
    const pose = allFours({ torso: -90 + c * 10, pelvis: -90 - c * 16, head: -90 - c * 28, shrug: 0 });
    return { pose };
  },
};

const couchStretch: Spec = {
  name: "Couch Stretch",
  mode: "loop",
  seconds: 4,
  hands: { N: "hand" },
  primary: ["quads", "hip_flexors"],
  secondary: ["abs"],
  still: 0.5,
  scene: [{ draw: wall(-52, -120, 10), layer: "back" }],
  motion: (p) => {
    const b = breathe(p);
    const hip = v(-20 + b * 4, -50);
    const rearKnee = v(-32, -6);
    let pose = base(hip, { torso: -2, pelvis: 6, head: 0 });
    // Rear knee down at the wall, shin straight up it, instep flat on it.
    pose = {
      ...pose,
      legF: { upper: dirTo(hip, rearKnee), lower: 184, end: 96 },
      legN: plantLeg(hip, v(30, -8), 0, 1),
    };
    const j = frontJointsSide(pose);
    pose = hold(pose, "side", add(j, v(-2, -10)), undefined, -1);
    return { pose };
  },
};

// The near knee, for resting a hand on it.
const frontJointsSide = (pose: Pose) => {
  const knee = add(pose.hip, rot(v(0, 44), pose.legN.upper));
  return knee;
};

function halfKneel(o: { name: string; aka?: string[]; ankleRock?: boolean; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: 3,
    hands: { N: "hand" },
    primary: o.primary,
    secondary: o.secondary,
    still: 1,
    motion: (p) => {
      const push = o.ankleRock ? lerp(0, 14, p) : lerp(0, 12, p);
      const hip = v(-10 + push, -50);
      let pose = base(hip, { torso: o.ankleRock ? -6 : lerp(0, 6, p), pelvis: lerp(0, 8, p), head: 0 });
      const rearKnee = v(-30, -6);
      const front = v(34, -8);
      pose = {
        ...pose,
        legF: { ...plantLeg(hip, rearKnee, -180, -1), lower: -90, end: -180 },
        legN: plantLeg(hip, front, 0, 1),
      };
      const reach = o.ankleRock ? limb(70, 90, 90) : limb(lerp(10, 176, p), lerp(14, 176, p), lerp(14, 176, p));
      return { pose: { ...pose, armN: reach, armF: o.ankleRock ? limb(70, 90, 90) : { ...reach } } };
    },
  };
}

const pigeon: Spec = {
  name: "Pigeon Stretch",
  aka: ["Pigeon Pose"],
  mode: "alternate",
  seconds: 4,
  hands: { N: "palm" },
  primary: ["glutes"],
  secondary: ["hip_flexors", "abductors"],
  still: 1,
  motion: (p) => {
    const hip = v(0, -18);
    const torso = lerp(-6, -74, p);
    let pose = base(hip, { torso, pelvis: lerp(0, -30, p), head: torso + 20 });
    pose = { ...pose, legN: { ...limb(80, 160, 170), ku: 0.6, kl: 0.4 }, legF: limb(-88, -88, -180) };
    const s = shoulders(pose).N;
    pose = palms(pose, "side", v(s.x + lerp(8, 30, p), 0), v(s.x + lerp(8, 30, p), 0), 90, 1);
    return { pose };
  },
};

const hamstringStretch: Spec = {
  name: "Hamstring Stretch",
  mode: "alternate",
  seconds: 3.6,
  hands: { N: "hand" },
  primary: ["hamstrings"],
  secondary: ["calves", "lower_back"],
  still: 1,
  scene: [{ draw: box(40, 76, -46), layer: "back" }],
  motion: (p) => {
    const torso = lerp(-6, -58, p);
    const hip = v(lerp(0, -8, p), -93);
    let pose = base(hip, { torso, pelvis: torso * 0.7, head: torso * 0.6 });
    pose = { ...pose, legF: plantLeg(hip, v(-2, -8), 0, 1), legN: plantLeg(hip, v(56, -54), 60, -1) };
    const j = { ankle: v(56, -54) };
    const reach = add(j.ankle, v(-14 + (1 - p) * -18, -6 - (1 - p) * 10));
    pose = hold(pose, "side", reach, reach, -1);
    return { pose };
  },
};

const seatedForwardFold: Spec = {
  name: "Seated Forward Fold",
  mode: "alternate",
  seconds: 3.6,
  hands: { N: "hand" },
  primary: ["hamstrings", "lower_back"],
  secondary: ["calves"],
  still: 1,
  motion: (p) => {
    const torso = lerp(-4, -66, p);
    const hip = v(0, -14);
    let pose = base(hip, { torso, pelvis: lerp(0, -30, p), head: torso + 6 });
    pose = { ...pose, legN: limb(90, 90, 172), legF: limb(90, 90, 172) };
    const reach = lerp(40, 80, p);
    pose = hold(pose, "side", v(reach, -18 + p * 6), undefined, -1);
    return { pose };
  },
};

const calfStretch: Spec = {
  name: "Calf Stretch",
  mode: "loop",
  seconds: 4,
  hands: { N: "palm" },
  primary: ["calves"],
  still: 0.5,
  scene: [{ draw: wall(68, -220, 10), layer: "front" }],
  motion: (p) => {
    const lean = breathe(p);
    const hip = v(lerp(8, 14, lean), -90);
    let pose = base(hip, { torso: lerp(-14, -22, lean), pelvis: -10, head: -8 });
    pose = { ...pose, legN: plantLeg(hip, v(34, -8), 0, 1), legF: plantLeg(hip, v(-40, -8), 0, 1) };
    const s = shoulders(pose).N;
    pose = palms(pose, "side", v(68, s.y - 6), v(68, s.y - 6), 180, -1);
    return { pose };
  },
};

const supineTwist: Spec = {
  name: "Supine Twist",
  aka: ["Supine Spinal Twist"],
  view: "front",
  mode: "alternate",
  seconds: 4,
  hands: { N: "hand" },
  primary: ["obliques", "lower_back"],
  secondary: ["glutes"],
  still: 1,
  scene: [{ draw: { svg: `<rect class="mat" x="-100" y="-190" width="200" height="190" rx="6" style="fill-opacity:.35"/>`, box: [-100, -190, 100, 0] }, layer: "back" }],
  motion: (p) => {
    const pose = base(v(0, -94.6));
    const a = lerp(4, 64, p);
    const k = lerp(0.36, 0.95, p);
    const leg = { ...limb(a, a - 70 * (1 - p), a - 60), ku: k, kl: k };
    return { pose: { ...pose, armN: limb(90), armF: mirror(limb(90)), legN: leg, legF: { ...leg, upper: leg.upper - 4 } } };
  },
};

const boxBreathing: Spec = {
  name: "Box Breathing",
  mode: "loop",
  seconds: 8,
  hands: { N: "hand" },
  primary: ["abs"],
  secondary: ["chest"],
  still: 0.4,
  scene: [{ draw: box(-24, 18, -46), layer: "back" }],
  motion: (p) => {
    const b = kf(p, [[0, 0], [0.25, 1], [0.5, 1], [0.75, 0], [1, 0]]);
    let pose = seated(-46, 34, { torso: lerp(0, 3, b), head: lerp(0, 2, b), shrug: lerp(0, 1.8, b) });
    pose = { ...pose, armN: limb(14, 70, 80), armF: limb(14, 70, 80) };
    return { pose };
  },
};

// --- Dynamic warm-ups ------------------------------------------------------------

const legSwings: Spec = {
  name: "Leg Swings",
  mode: "alternate",
  seconds: 1.6,
  hands: { N: "palm" },
  primary: ["hip_flexors", "hamstrings"],
  secondary: ["glutes"],
  still: 1,
  scene: [{ draw: wall(56, -220, 10), layer: "front" }],
  motion: (p) => {
    let pose = stand(-94.4, { torso: -3 });
    const swing = lerp(-34, 64, p);
    pose = { ...pose, legN: limb(swing, swing - 6, swing + 10) };
    const s = shoulders(pose).N;
    pose = palms(pose, "side", v(56, s.y + 10), v(56, s.y + 10), 180, -1);
    return { pose };
  },
};

const inchworm: Spec = (() => {
  const toe = v(-30, 0);
  const plankPose = prone(toe, 20);
  const palm = v(shoulders(plankPose).N.x + 1, 0);
  const plank = palms(plankPose, "side", palm, palm, 90, -1);
  const standing = { ...stand(-94.4, { torso: -2 }, { hipX: -24, ankleN: v(-22, -8) }), armN: limb(0), armF: limb(0) };
  let fold = base(v(-30, -92), { torso: -112, pelvis: -86, head: -130 });
  fold = plant(fold, "side", v(-22, -8));
  const foldPalm = v(shoulders(fold).N.x + 4, 0);
  fold = palms(fold, "side", foldPalm, foldPalm, 90, -1);
  return {
    name: "Inchworm",
    mode: "loop",
    seconds: 5,
    samples: 30,
    hands: { N: "palm" },
    primary: ["hamstrings", "abs"],
    secondary: ["delts_front", "chest"],
    still: 0.45,
    motion: (p: number) => ({
      pose: seq(p, [
        [0, standing],
        [0.2, fold],
        [0.45, plank],
        [0.55, plank],
        [0.8, fold],
        [1, standing],
      ]),
    }),
  } satisfies Spec;
})();

const worldsGreatest: Spec = (() => {
  const hip = v(-6, -54);
  let lunge = base(hip, { torso: -50, pelvis: -30, head: -40 });
  lunge = { ...lunge, legN: plantLeg(hip, v(34, -8), 0, 1), legF: plantLeg(hip, v(-46, -15), -55, 1) };
  const s = shoulders(lunge).N;
  const floor = palms(lunge, "side", v(s.x + 4, 0), v(s.x + 4, 0), 90, -1);
  const elbow: Pose = { ...floor, torso: -64, armN: { ...floor.armN, upper: 10, lower: 60, end: 60 } };
  const reach: Pose = { ...floor, torso: -46, head: -10, armN: limb(178, 178, 178) };
  return {
    name: "World's Greatest Stretch",
    aka: ["Worlds Greatest Stretch"],
    mode: "loop",
    seconds: 5,
    samples: 26,
    hands: { N: "hand", F: "palm" },
    primary: ["hip_flexors", "upper_back"],
    secondary: ["hamstrings", "glutes", "obliques"],
    still: 0.6,
    motion: (p: number) => ({ pose: seq(p, [[0, floor], [0.25, elbow], [0.45, floor], [0.7, reach], [1, floor]]) }),
  } satisfies Spec;
})();

const hipAirplane: Spec = {
  name: "Hip Airplane",
  mode: "alternate",
  seconds: 3.4,
  hands: { N: "hand" },
  primary: ["glutes", "abductors"],
  secondary: ["hamstrings", "obliques"],
  still: 1,
  motion: (p) => {
    const torso = lerp(-6, -78, p);
    const probe = (pose: Pose) => onTrunk(pose, v(0, -6));
    let pose = stand(lerp(-94.4, -90, p), { torso, pelvis: torso * 0.9, head: torso * 0.8 }, { probe, over: 2 });
    pose = { ...pose, legN: limb(lerp(4, -80, p), lerp(4, -82, p), lerp(4, -60, p)) };
    const arm = { ...limb(lerp(10, 90, p) + torso * 0, 90), ku: lerp(1, 0.25, p), kl: lerp(1, 0.25, p) };
    return { pose: { ...pose, armN: { ...arm, upper: torso + 90 }, armF: { ...arm, upper: torso + 90 } } };
  },
};

// --- Recovery rooms -------------------------------------------------------------

const saunaSpec: Spec = {
  name: "Sauna",
  mode: "loop",
  seconds: 5,
  hands: { N: "hand" },
  primary: [],
  still: 0.5,
  scene: [{ draw: sauna(-70, 110, -46), layer: "back" }],
  motion: (p) => {
    const b = breathe(p);
    let pose = seated(-46, 36, { torso: lerp(6, 8, b), head: lerp(4, 6, b), shrug: b * 1.4 }, 0);
    pose = { ...pose, armN: limb(14, 60, 70), armF: limb(14, 60, 70) };
    return { pose };
  },
};

const coldPlunge: Spec = {
  name: "Cold Plunge",
  aka: ["Ice Bath"],
  mode: "loop",
  seconds: 5,
  hands: { N: "fist" },
  primary: [],
  still: 0.5,
  scene: [
    { draw: tubBack(-64, 88, -54), layer: "back" },
    { draw: tubFront(-64, 88, -54, -60), layer: "front" },
  ],
  motion: (p) => {
    const b = breathe(p);
    const hip = v(-22, -16);
    let pose = base(hip, { torso: lerp(14, 16, b), pelvis: 30, head: lerp(8, 10, b), shrug: b * 2 });
    pose = { ...pose, legN: plantLeg(hip, v(56, -14), 30, 1), legF: plantLeg(hip, v(52, -14), 30, 1) };
    // Forearms resting on the rim behind.
    pose = hold(pose, "side", v(-58, -56), v(-58, -56), 1);
    return { pose };
  },
};

const ninetyNinety: Spec = {
  name: "90/90 Hip Switch",
  aka: ["90/90 Hip Stretch"],
  view: "front",
  mode: "alternate",
  seconds: 3,
  hands: { N: "palm" },
  primary: ["glutes", "abductors"],
  secondary: ["adductors", "hip_flexors"],
  still: 0,
  motion: (p) => {
    const sweep = lerp(-58, 58, p);
    const pose = base(v(0, -14), { torso: sweep * -0.08 });
    const k = 0.6;
    const legN = { ...limb(sweep + 4, sweep + 90 * Math.sign(sweep || 1)), ku: k, kl: 0.8 };
    const legF = { ...limb(sweep - 4, sweep - 90 * Math.sign(sweep || 1)), ku: k, kl: 0.8 };
    const arm = limb(24, 18, 18);
    return { pose: { ...pose, legN, legF, armN: arm, armF: mirror(arm) } };
  },
};

const frogStretch: Spec = {
  name: "Frog Stretch",
  mode: "alternate",
  seconds: 3.6,
  hands: { N: "fist" },
  primary: ["adductors"],
  secondary: ["hip_flexors", "glutes"],
  still: 1,
  motion: (p) => {
    const back = lerp(0, 16, p);
    const knee = v(4, -6);
    const hip = v(knee.x - back, -40 + back * 0.6);
    let pose = base(hip, { torso: -92, pelvis: -70, head: -80 });
    pose = { ...pose, legN: { ...limb(dirTo(hip, knee), -90, -170), ku: 0.8 }, legF: { ...limb(dirTo(hip, knee), -90, -170), ku: 0.8 } };
    return { pose: { ...pose, armN: limb(0, 90, 90), armF: limb(0, 90, 90) } };
  },
};

export const MOBILITY: Spec[] = [
  bandPullApart,
  bandFacePull,
  externalRotation,
  wallSlide,
  armCircles,
  shoulderCars,
  wristCircles,
  fingerRolls,
  forearmStretch,
  doorwayPecStretch,
  thoracicRoller,
  rollerSlide({ name: "Foam Roll Quads", part: "quads" }),
  rollerSlide({ name: "Foam Roll Glutes", part: "glutes" }),
  rollerSlide({ name: "Foam Roll Lats", part: "lats" }),
  childsPose,
  threadTheNeedle,
  catCow,
  couchStretch,
  halfKneel({ name: "Hip Flexor Stretch", aka: ["Half-Kneeling Hip Flexor Stretch"], primary: ["hip_flexors", "quads"], secondary: ["abs"] }),
  halfKneel({ name: "Ankle Rock", aka: ["Ankle Rocks"], ankleRock: true, primary: ["calves"], secondary: ["tibialis"] }),
  pigeon,
  hamstringStretch,
  seatedForwardFold,
  calfStretch,
  supineTwist,
  boxBreathing,
  legSwings,
  inchworm,
  worldsGreatest,
  hipAirplane,
  saunaSpec,
  coldPlunge,
  ninetyNinety,
  frogStretch,
];

