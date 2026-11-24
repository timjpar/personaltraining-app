// Trunk and hip work: planks, hollows, hanging raises, rollouts, crunches,
// rotations, levers, and the banded/cabled hip moves.

import { barbellAcross, barLine, box, cable, cableTower, column, flatBench, hyperBench, kettlebellFromAbove, landmineBase, matFromAbove, medBall, plateFace, pullUpBar, pullUpBarAcross, ring, stabilityBall, strap, wall } from "./equipment";
import {
  add,
  allFours,
  aroundBar,
  at,
  base,
  dirAngle,
  frontJoints,
  ankles,
  grips,
  hangSide,
  hold,
  holdBehind,
  kf,
  kfv,
  LEN,
  lerp,
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
  shoulders,
  standSquare,
  sub,
  supine,
  turned,
  v,
  wave,
  type Limb,
  type Pose,
  type Spec,
  type V,
} from "./kit";
import type { Drawing } from "./render";

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

// Copenhagen plank, long lever (top foot on the bench), with the bottom knee
// pulled up toward the chest and held there instead of hanging to the floor:
// the top adductor holds the body up while the bottom hip flexors hold the
// knee in. From reel DW62fqBjhmi. Seen from the front, the tucked thigh
// points at the camera, so it is drawn foreshortened.
const copenhagenKneeTuck: Spec = {
  name: "Copenhagen Plank Knee Tuck",
  aka: ["Copenhagen Plank with Knee Tuck", "Copenhagen Knee Tuck Hold", "Copenhagen Plank Bottom Knee Tuck"],
  view: "front",
  mode: "loop",
  seconds: 4,
  hands: { N: "fist" },
  primary: ["adductors", "obliques"],
  secondary: ["hip_flexors", "abs", "abductors"],
  still: 0.25,
  scene: [{ draw: box(-112, -64, -40, "pad"), layer: "back" }],
  motion: (p) => {
    const b = breathe(p, 2);
    const pose = sidePlankPose(v(46, -40), 18 + b, 10);
    return { pose: { ...pose, legN: { ...limb(30 + b, -100, -94), ku: 0.72 } } };
  },
};

// Forearm plank with the feet up on a bench: the near knee leaves the bench
// and drives in under the hips to the chest, holds, and goes back. The hip
// flexors lift the thigh against gravity while the trunk stays a plank.
const HFP_BENCH = -40;
const HFP_TOE = v(-70, HFP_BENCH);

function benchPlank(shoulderY: number): Pose {
  let lo = -40;
  let hi = 40;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (shoulders(prone(HFP_TOE, mid)).N.y > shoulderY) lo = mid;
    else hi = mid;
  }
  const pose = prone(HFP_TOE, (lo + hi) / 2);
  return { ...pose, armN: limb(0, 90, 90), armF: limb(0, 90, 90) };
}

const hipFlexorPlank: Spec = {
  name: "Bench Hip Flexor Plank",
  aka: ["Hip Flexor Plank", "Hip Flexer Plank", "Feet-Elevated Knee Drive Plank"],
  mode: "alternate",
  seconds: 2.6,
  hands: { N: "fist" },
  primary: ["hip_flexors", "abs"],
  secondary: ["obliques", "quads", "delts_front", "glutes"],
  still: 0.5,
  scene: [{ draw: flatBench(-118, -54, HFP_BENCH), layer: "back" }],
  motion: (p) => {
    const pose = benchPlank(-36 - p * 2);
    const body = pose.torso;
    // Thigh swings from along the body up under the chest, the knee staying
    // clear of the floor; the shin folds back under it, foot off the bench.
    // The thigh can't swing straight down past the floor, so the knee comes
    // a little out toward the viewer on the way (shorter drawn thigh).
    const out = 1 - 0.5 * Math.sin(Math.PI * p);
    const legN: Limb = {
      ...limb(lerp(body, 58, p), kf(p, [[0, body], [0.4, -128], [1, -112]]), kf(p, [[0, body + 10], [0.4, -100], [1, -88]])),
      ku: out,
      kl: out,
    };
    return { pose: { ...pose, legN } };
  },
};

// Lying on the near hip across a 45° hyperextension bench, seen from the
// front: the bench in profile, the athlete side-on in it. The pelvis stays on
// the pad and the trunk side-bends down toward the floor and back up past
// level. Feet stacked between the rollers, arms crossed on the chest.
const SIDE_HYPER_HIP = v(0, -82);

function sideHyperPose(bend: number): Pose {
  const pelvis = -45 + bend * 0.15;
  const torso = -45 + bend;
  let pose = base(SIDE_HYPER_HIP, { pelvis, torso, head: torso + bend * 0.2 });
  // The top leg closes onto the bottom one, so the feet stack.
  pose = { ...pose, legN: limb(-45, -45, -40), legF: limb(-39, -39, -34) };
  // Crossed arms, described upright and turned with the trunk: elbows down
  // and toward the viewer, each hand to the far side of the chest.
  const crossed = (s: 1 | -1): Limb => ({ ...limb(torso - 8 * s, torso - 108 * s), ku: 0.55, kl: 0.78 });
  return { ...pose, armN: crossed(1), armF: crossed(-1) };
}

const SIDE_HYPER_ANKLES = (() => {
  const j = frontJoints(sideHyperPose(0));
  return { N: j.ankleN, F: j.ankleF };
})();

const sideHyperextension: Spec = {
  name: "Side Hyperextension",
  aka: ["Side Back Extension", "45-Degree Side Bend"],
  view: "front",
  mode: "alternate",
  seconds: 3.2,
  hands: { N: "fist" },
  primary: ["obliques"],
  secondary: ["lower_back", "abs", "abductors"],
  still: 1,
  scene: [
    {
      draw: hyperBench(add(SIDE_HYPER_HIP, v(9, 14)), SIDE_HYPER_ANKLES.N, [
        add(SIDE_HYPER_ANKLES.F, v(-5, -5)),
        add(SIDE_HYPER_ANKLES.N, v(5, 5)),
      ]),
      layer: "back",
    },
  ],
  motion: (p) => ({ pose: sideHyperPose(lerp(10, -40, p)) }),
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

// Skin the cat: from a dead hang, tuck the knees and roll backwards between
// the arms, through an inverted tuck hang, and on round until the body hangs
// face-down behind the hands in a German hang with the shoulders fully
// extended. The hands never move; the body turns about the shoulders. Then
// back the same way. Drawn on rings, where it is usually done; the straps
// hang either side of the body, so it can pass between them.
function skinPose(torso: number, arm: number, tuck: number): Pose {
  const shoulder = sub(HANG_BAR, rot(v(0, LEN.upperArm + LEN.forearm + LEN.grip), arm));
  const lumbar = sub(shoulder, rot(v(0, -41), torso));
  const hip = sub(lumbar, rot(v(0, -11), torso));
  const pose = base(hip, { torso, pelvis: torso, head: torso - 10 });
  const thigh = lerp(torso, torso + 128, tuck);
  const shin = lerp(torso, torso - 30, tuck);
  return { ...pose, armN: limb(arm), armF: limb(arm), legN: limb(thigh, shin, shin + 30), legF: limb(thigh - 2, shin - 2, shin + 28) };
}

const SKIN_TORSO = 322;
const SKIN_ARM_LEVER = 166;
const SKIN_ARM_GERMAN = 206;
const SKIN_TUCK = 0.2;

const skinTheCat: Spec = {
  name: "Skin the Cat",
  aka: ["Skin The Cat", "Skin-the-Cat", "German Hang Skin the Cat"],
  mode: "alternate",
  seconds: 7,
  samples: 60,
  hands: { N: "fist" },
  primary: ["lats", "abs", "delts_front"],
  secondary: ["chest", "biceps", "upper_back", "hip_flexors", "forearms"],
  still: 0.6,
  props: [
    { id: "sN", draw: strap(), layer: "back" },
    { id: "rN", draw: ring(), layer: "front" },
  ],
  motion: (p) => {
    const torso = kf(p, [[0, 0], [0.22, 18], [0.6, 180], [0.82, 262], [1, SKIN_TORSO]]);
    const arm = kf(p, [[0, 180], [0.4, SKIN_ARM_LEVER], [0.6, 180], [1, SKIN_ARM_GERMAN]]);
    const tuck = kf(p, [[0, 0], [0.22, 1], [0.7, 1], [1, SKIN_TUCK]]);
    return { pose: skinPose(torso, arm, tuck), props: { rN: at(HANG_BAR), sN: line(v(HANG_BAR.x, HANG_BAR.y - 40), HANG_BAR) } };
  },
};

// The rest of the lever ladder: hips opened from the tuck, legs out straddled,
// then together.
function lever(o: { name: string; aka?: string[]; tuck: number; straddle?: boolean }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "loop",
    seconds: 4,
    hands: { N: "fist" },
    primary: ["lats", "abs"],
    secondary: ["upper_back", "delts_rear", "triceps", "forearms", "glutes"],
    still: 0.25,
    scene: [{ draw: pullUpBar(HANG_BAR), layer: "back" }],
    motion: (p) => {
      const pose = leverPose(1 - breathe(p, 0.04) - 0.02, o.tuck);
      if (!o.straddle) return { pose };
      // Side-on a straddle is the far leg swung out towards the viewer.
      return { pose: { ...pose, legF: { ...pose.legF, upper: pose.legF.upper - 6, lower: pose.legF.lower - 6, ku: 0.82, kl: 0.82 } } };
    },
  };
}

// --- Back lever ----------------------------------------------------------------------
//
// From the reel DZK0jZqIymN. The back lever hangs face-down with the body
// level under the bar and the arms straight behind it, the hands over the
// lower back. skinPose already turns the body that far round (torso past 180
// is face-down), so the ladder is skinPose at a level torso: tucked, the hips
// opened, straddled, then legs together. On a bar, as in the reel.
const BACK_LEVER_TORSO = 268;
const BACK_LEVER_ARM = 214;

function backLever(o: { name: string; aka?: string[]; tuck: number; straddle?: boolean }): Spec {
  return {
    name: o.name,
    aka: o.aka,
    mode: "loop",
    seconds: 4,
    hands: { N: "fist" },
    primary: ["chest", "delts_front", "biceps"],
    secondary: ["lats", "abs", "lower_back", "glutes", "forearms"],
    still: 0.25,
    scene: [{ draw: pullUpBar(HANG_BAR), layer: "back" }],
    motion: (p) => {
      // A slight sag and recovery: the hips are what drop first.
      const sag = breathe(p, 2);
      const pose = skinPose(BACK_LEVER_TORSO - sag, BACK_LEVER_ARM + sag * 0.4, o.tuck);
      if (!o.straddle) return { pose };
      return { pose: { ...pose, legF: { ...pose.legF, upper: pose.legF.upper + 6, lower: pose.legF.lower + 6, ku: 0.82, kl: 0.82 } } };
    },
  };
}

// The German hang: the end of skin the cat held still, the body hanging
// behind the hands with the shoulders fully extended, feet towards the floor.
// The first rung of the back lever, for the shoulder range it needs.
const germanHang: Spec = {
  name: "German Hang",
  aka: ["German Hang Hold", "Bar German Hang"],
  mode: "loop",
  seconds: 4,
  hands: { N: "fist" },
  primary: ["chest", "delts_front", "biceps"],
  secondary: ["lats", "forearms"],
  still: 0.25,
  scene: [{ draw: pullUpBar(HANG_BAR), layer: "back" }],
  motion: (p) => {
    const sink = breathe(p, 3);
    return { pose: skinPose(SKIN_TORSO + sink, SKIN_ARM_GERMAN + sink * 0.6, 0.15) };
  },
};

// Rear support to back lever, the end of the reel: in support on top of the
// bar with the bar behind the hips (as for a Korean dip), lean forward and let
// the elbows bend so the bar rolls up to the lower back while the legs come
// up level; then push the body away from the bar until the arms are straight
// in a back lever, hold, and come back up the same way. `c` is where the bar
// sits on the trunk (onTrunk offsets, behind the back); the lever end comes
// from the arm angle, so it matches the back lever drawings exactly.
const BEHIND_BAR = HANG_BAR;
const LEVER_CONTACT = add(v(0, -41), rot(v(0, LEN.upperArm + LEN.forearm + LEN.grip), BACK_LEVER_ARM - BACK_LEVER_TORSO));
const rearSupportToBackLever: Spec = {
  name: "Rear Support to Back Lever",
  aka: ["Korean Dip to Back Lever", "Back Lever from Rear Support"],
  mode: "alternate",
  seconds: 5,
  samples: 40,
  hands: { N: "fist" },
  primary: ["chest", "delts_front", "triceps"],
  secondary: ["biceps", "lats", "abs", "lower_back", "glutes"],
  still: 1,
  scene: [{ draw: { svg: `<circle class="steel" cx="${BEHIND_BAR.x}" cy="${BEHIND_BAR.y}" r="2.8"/>`, box: [BEHIND_BAR.x - 3, BEHIND_BAR.y - 3, BEHIND_BAR.x + 3, BEHIND_BAR.y + 3] }, layer: "front" }],
  motion: (p) => {
    const keys: [number, number][] = [[0, 0], [0.2, 0.25], [0.42, 0.55], [0.58, 0.8], [0.8, 1], [1, 1]];
    const q = kf(p, keys);
    const torso = kf(q, [[0, -18], [0.25, -42], [0.55, -72], [0.8, -90], [1, BACK_LEVER_TORSO - 360]]);
    const c = kfv(q, [[0, v(-16, 16)], [0.25, v(-15, 8)], [0.55, v(-15, 0)], [0.8, v(-16, -6)], [1, LEVER_CONTACT]]);
    let pose = aroundBar(BEHIND_BAR, torso, c, { head: torso * 0.6 + kf(q, [[0, 0], [0.55, -40], [1, -44]]) });
    // Legs from hanging under the hips to level with the trunk.
    const leg = kf(q, [[0, 2], [0.25, -20], [0.55, -66], [0.8, -90], [1, torso]]);
    pose = { ...pose, legN: limb(leg, leg - kf(q, [[0, 6], [0.55, 0]]), leg + 24), legF: limb(leg - 2, leg - 2 - kf(q, [[0, 10], [0.55, 0]]), leg + 22) };
    return { pose: holdBehind(pose, BEHIND_BAR) };
  },
};

// Supported on parallettes with straight arms, hips between the hands and the
// legs held out in front: tucked, one leg out, both, or lifted into a V.
const PARALLETTE = v(2, -16);
function lSit(o: { name: string; aka?: string[]; kind: "tuck" | "one" | "full" | "v"; primary: Spec["primary"]; secondary?: Spec["secondary"] }): Spec {
  const out = (a: number): Limb => limb(a, a, a + 26);
  const tucked = limb(140, 8, 24);
  return {
    name: o.name,
    aka: o.aka,
    mode: "loop",
    seconds: 4,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.25,
    scene: [
      {
        draw: {
          svg: `<rect class="frame" x="${PARALLETTE.x - 14}" y="${PARALLETTE.y - 2}" width="28" height="4" rx="2"/><rect class="frame" x="${PARALLETTE.x - 12}" y="${PARALLETTE.y}" width="3" height="16"/><rect class="frame" x="${PARALLETTE.x + 9}" y="${PARALLETTE.y}" width="3" height="16"/>`,
          box: [PARALLETTE.x - 14, PARALLETTE.y - 2, PARALLETTE.x + 14, 0],
        },
        layer: "front",
      },
    ],
    motion: (p) => {
      const b = breathe(p, 2);
      const torso = (o.kind === "v" ? 16 : 4) + b * 0.5;
      const shoulder = add(PARALLETTE, v(-3, -(LEN.upperArm + LEN.forearm + LEN.grip) + 0.6));
      const lumbar = sub(shoulder, rot(v(0, -41), torso));
      const hip = sub(lumbar, rot(v(0, -11), torso));
      let pose = base(hip, { torso, pelvis: torso, head: torso - 8 });
      const lift = (o.kind === "v" ? 136 : 92) - b;
      const legN = o.kind === "tuck" ? tucked : out(lift);
      const legF = o.kind === "full" || o.kind === "v" ? out(lift - 2) : tucked;
      pose = { ...pose, legN, legF };
      return { pose: hold(pose, "side", PARALLETTE, undefined, -1) };
    },
  };
}

// The V-sit ladder on the floor: hands flat beside the hips, the trunk
// leaning back and the legs lifted towards it. Hips are lifted until the arms
// are straight (`lift` = false keeps the seat on the floor).
function floorSit(torso: number, palmX: number, lift = true): Pose {
  const reach = LEN.upperArm + LEN.forearm + LEN.palm - 0.8;
  let hip = v(0, -12);
  if (lift) {
    // Raise the hip until the shoulder is one straight arm above the palm.
    let lo = -12;
    let hi = -40;
    for (let i = 0; i < 24; i++) {
      const y = (lo + hi) / 2;
      const s = shoulders(base(v(0, y), { torso })).N;
      if (Math.hypot(s.x - palmX, s.y) < reach) lo = y;
      else hi = y;
    }
    hip = v(0, lo);
  }
  const pose = base(hip, { torso, pelvis: torso, head: torso - 10 });
  return palms(pose, "side", v(palmX, 0), v(palmX, 0), 90, -1);
}
const outLeg = (a: number): Limb => limb(a, a, a + 26);
const tuckLeg = (torso: number): Limb => limb(torso + 150, torso + 14, torso + 40);

// Long sitting, one knee bent: the straight leg lifts and lowers with no help
// from leaning back — the first taste of active compression.
const seatedLegLift: Spec = {
  name: "Seated Leg Lift",
  aka: ["Seated Straight-Leg Raise", "Seated Leg Raise"],
  mode: "alternate",
  seconds: 2.4,
  primary: ["hip_flexors", "abs"],
  secondary: ["quads"],
  still: 1,
  motion: (p) => {
    const pose = floorSit(-6, 10, false);
    const hip = pose.hip;
    return {
      pose: {
        ...pose,
        legN: outLeg(lerp(86, 132, p)),
        legF: plantLeg(hip, v(hip.x + 40, -8), 0, 1),
      },
    };
  },
};

// Leaning back on a wall takes balance out of it, so all the work is in
// holding the legs up — one straight leg first, then both.
const V_WALL = -40;
function wallVSit(o: { name: string; aka?: string[]; one?: boolean }): Spec {
  const torso = 30;
  return {
    name: o.name,
    aka: o.aka,
    mode: "loop",
    seconds: 4,
    primary: ["abs", "hip_flexors"],
    secondary: ["triceps", "delts_front", "quads"],
    still: 0.25,
    scene: [{ draw: wall(V_WALL - 8, -120), layer: "back" }],
    motion: (p) => {
      const b = breathe(p, 2);
      let pose = floorSit(torso, -14);
      // Slide the body back until the upper back meets the wall.
      const back = onTrunk(pose, v(-17, -34));
      const dx = V_WALL - back.x;
      pose = floorSit(torso, -14 + dx);
      pose = { ...pose, hip: add(pose.hip, v(dx, 0)) };
      pose = palms(pose, "side", v(-14 + dx, 0), v(-14 + dx, 0), 90, -1);
      const up = 152 - b;
      return { pose: { ...pose, legN: outLeg(up), legF: o.one ? tuckLeg(torso) : outLeg(up - 2) } };
    },
  };
}

// Free of the wall, a band from the feet round the upper back holds the legs
// up while the hands carry the body.
function bandedVSit(o: { name: string; aka?: string[] }): Spec {
  const torso = 34;
  return {
    name: o.name,
    aka: o.aka,
    mode: "loop",
    seconds: 4,
    primary: ["abs", "hip_flexors"],
    secondary: ["triceps", "delts_front", "quads", "hamstrings"],
    still: 0.25,
    props: [{ id: "band", draw: { svg: `<path class="band" d="M0 0H1" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] }, layer: "back" }],
    motion: (p) => {
      const b = breathe(p, 2);
      const pose = floorSit(torso, -12);
      const up = 150 - b;
      const posed = { ...pose, legN: outLeg(up), legF: outLeg(up - 2) };
      return { pose: posed, props: { band: line(onTrunk(posed, v(-10, -32)), ankles(posed).N) } };
    },
  };
}

// Lying on a bench gripping it behind the head, the body pivots on the upper
// back as one straight piece — or with the knees folded, in the tuck. Phase 1
// is the top, so the negative is this played as a slow lower.
const FLAG_BENCH = -44;
function dragonFlag(o: { name: string; tuck?: boolean }): Spec {
  const shoulder = v(-40, FLAG_BENCH - 9);
  const grip = v(-74, FLAG_BENCH + 1);
  return {
    name: o.name,
    mode: "alternate",
    seconds: 3.6,
    hands: { N: "fist" },
    primary: ["abs"],
    secondary: ["hip_flexors", "obliques", "lats", "lower_back"],
    still: 0.6,
    scene: [{ draw: flatBench(-82, 30, FLAG_BENCH), layer: "back" }],
    motion: (p) => {
      // Degrees the body is raised above the bench, pivoting at the shoulders.
      const rise = lerp(10, 72, p);
      const torso = 90 + rise;
      const lumbar = sub(shoulder, rot(v(0, -41), torso));
      const hip = sub(lumbar, rot(v(0, -11), torso));
      let pose = base(hip, { torso, pelvis: torso, head: 100 });
      pose = o.tuck
        ? { ...pose, legN: limb(torso, torso - 120, torso - 90), legF: limb(torso - 2, torso - 122, torso - 92) }
        : { ...pose, legN: limb(torso, torso, torso + 28), legF: limb(torso - 2, torso - 2, torso + 26) };
      return { pose: hold(pose, "side", grip, undefined, 1) };
    },
  };
}

// --- Human flag -------------------------------------------------------------------
//
// Square-on, the pole on the left of the picture and the athlete facing out
// from it: the top hand pulls, the bottom hand pushes with the arm locked, and
// the body sticks out sideways. `tilt` is how far the body is raised above
// level, 90 being the vertical flag, straight up over the bottom hand. The
// hands stay put on the pole; the shoulders slide in toward it as the body
// rises, as they have to on a real pole.
const POLE_X = -66;
const POLE_TOP = -214;
const PERCH = -128; // the shoulder line's height when the body is level
// Hands an even distance above and below the shoulders, so both arms lock
// straight when the body is level.
const GRIP_TOP = v(POLE_X, PERCH - 48);
const GRIP_BOTTOM = v(POLE_X, PERCH + 48);
const FLAG_MUSCLES: Pick<Spec, "primary" | "secondary"> = {
  primary: ["lats", "obliques", "delts_side"],
  secondary: ["delts_front", "triceps", "abs", "forearms", "glutes"],
};

type FlagLegs = "together" | "straddle" | "tuck";

function flagPose(tilt: number, legs: FlagLegs): Pose {
  const torso = 90 + tilt;
  const up = tilt / 90;
  const shoulderLine = v(POLE_X + lerp(54.3, 22, up), PERCH + lerp(0, 4, up));
  const lumbar = sub(shoulderLine, rot(v(0, -38), torso));
  const hip = sub(lumbar, rot(v(0, -11), torso));
  let pose = base(hip, { torso, pelvis: torso, head: torso - 4 });
  if (legs === "tuck") {
    // Knees pulled to the chest come toward the viewer, so both bones shorten;
    // the heels end up back by the seat.
    const thigh = (a: number): Limb => ({ ...limb(torso + a, torso + a + 165, torso + a + 140), ku: 0.55, kl: 0.6 });
    pose = { ...pose, legN: thigh(26), legF: thigh(-14) };
  } else {
    const spread = legs === "straddle" ? 24 : 1.5;
    pose = { ...pose, legN: limb(torso + spread, torso + spread, torso + spread), legF: limb(torso - spread, torso - spread, torso - spread) };
  }
  // Top elbow would bend upward, bottom one downward — both away from the body.
  return hold(pose, "front", GRIP_TOP, GRIP_BOTTOM, -1, 1);
}

const flagPole = (): Spec["scene"] => [{ draw: column(POLE_X - 3, POLE_TOP, 6), layer: "back" }];

function flagHold(o: { name: string; aka?: string[]; tilt: number; legs: FlagLegs } & Pick<Spec, "primary" | "secondary">): Spec {
  return {
    name: o.name,
    aka: o.aka,
    view: "front",
    mode: "loop",
    seconds: 4,
    hands: { N: "fist" },
    primary: o.primary,
    secondary: o.secondary,
    still: 0.25,
    scene: flagPole(),
    motion: (p) => ({ pose: flagPose(o.tilt + breathe(p, 2.4), o.legs) }),
  };
}

// The whole sweep from the vertical flag down to level, phase 1 at the top,
// so `negative()` turns it into a quick kick up and a slow lowering.
const flagSweep: Spec = {
  name: "Human Flag",
  view: "front",
  mode: "alternate",
  seconds: 3,
  hands: { N: "fist" },
  ...FLAG_MUSCLES,
  still: 0.5,
  scene: flagPole(),
  motion: (p) => ({ pose: flagPose(lerp(0, 90, p), "together") }),
};

type Frame = ReturnType<Spec["motion"]>;

const WHEEL: NonNullable<Spec["props"]>[number] = {
  id: "wheel",
  draw: { svg: `<circle class="iron" r="9"/><circle class="steel" r="2.4"/>`, box: [-9, -9, 9, 9] },
  layer: "front",
};
const ROLLOUT_MUSCLES: Pick<Spec, "primary" | "secondary"> = {
  primary: ["abs"],
  secondary: ["lats", "obliques", "hip_flexors", "triceps", "delts_front"],
};

// Arms straight from the shoulders down to the wheel on the floor.
function onWheel(pose: Pose): Frame {
  const s = shoulders(pose).N;
  const reach = LEN.upperArm + LEN.forearm + LEN.grip;
  const a = (Math.acos(Math.max(-1, Math.min(1, (-9 - s.y) / reach))) * 180) / Math.PI;
  pose = { ...pose, armN: limb(a), armF: limb(a) };
  return { pose, props: { wheel: at(grips(pose).N) } };
}

// The rollout from the feet: from a pike over the wheel out to a body near
// level with the floor, legs straight throughout.
function standingRollout(p: number): Frame {
  const ankle = v(-70, -8);
  const legAngle = lerp(-14, -74, p);
  const hip = sub(ankle, rot(v(0, LEN.thigh + LEN.shin - 1), legAngle));
  const torso = lerp(-150, -96, p);
  let pose = base(hip, { torso, pelvis: lerp(-120, -92, p), head: torso + 20 });
  pose = { ...pose, legN: limb(legAngle, legAngle, legAngle - 30), legF: limb(legAngle, legAngle, legAngle - 30) };
  return onWheel(pose);
}

// From the knees: hips tucked, the trunk lowering as the wheel goes out.
function kneelingRollout(p: number): Frame {
  const knee = v(0, -6);
  const thigh = lerp(-20, -72, p);
  const torso = lerp(-58, -98, p);
  const hip = sub(knee, rot(v(0, LEN.thigh), thigh));
  let pose = base(hip, { torso, pelvis: lerp(-30, -84, p), head: torso + 16 });
  pose = { ...pose, legN: limb(thigh, -90, -180), legF: limb(thigh, -90, -180) };
  return onWheel(pose);
}

const standingAbWheel: Spec = {
  name: "Standing Ab Wheel Rollout",
  mode: "alternate",
  seconds: 3.6,
  hands: { N: "fist" },
  ...ROLLOUT_MUSCLES,
  still: 1,
  props: [WHEEL],
  motion: standingRollout,
};

// The same rollouts cut short by a wall in front of the wheel, which stops it
// at `stop` of the full range: the athlete moves the wall back as they get
// stronger.
function wallStop(o: { name: string; aka?: string[]; stop: number; seconds: number; roll: (p: number) => Frame }): Spec {
  const wheelAt = o.roll(o.stop).props?.wheel?.at ?? v(0, 0);
  return {
    name: o.name,
    aka: o.aka,
    mode: "alternate",
    seconds: o.seconds,
    hands: { N: "fist" },
    ...ROLLOUT_MUSCLES,
    still: 1,
    scene: [{ draw: wall(wheelAt.x + 9, -96), layer: "back" }],
    props: [WHEEL],
    motion: (p) => o.roll(p * o.stop),
  };
}

// Only the way out, from the feet: a slow roll until the body is near the
// floor, then back in quickly (in practice, on the knees). The reverse of
// kit's negative(), whose slow half is the return.
const standingAbWheelNegative: Spec = {
  ...standingAbWheel,
  name: "Standing Ab Wheel Negative",
  aka: ["Ab Wheel Negative", "Standing Rollout Negative"],
  mode: "loop",
  seconds: 6,
  samples: 40,
  still: 0.5,
  motion: (p) => {
    const back = (t: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t)))) / 2;
    return standingRollout(p < 0.7 ? p / 0.7 : p < 0.8 ? 1 : 1 - back((p - 0.8) / 0.2));
  },
};

// Kneeling with the forearms on a big ball: the arms carry less of the body
// than on a wheel, and the ball only rolls as far as the forearms can reach.
// The elbows stay at the ball's height, so the upper arms swing up overhead as
// the body lowers.
const BALL_R = 25;
function ballRollout(p: number): Frame {
  const knee = v(0, -6);
  const thigh = lerp(-16, -58, p);
  const torso = lerp(-52, -80, p);
  const hip = sub(knee, rot(v(0, LEN.thigh), thigh));
  let pose = base(hip, { torso, pelvis: lerp(-26, -66, p), head: torso + 14 });
  pose = { ...pose, legN: limb(thigh, -90, -180), legF: limb(thigh, -90, -180) };
  const s = shoulders(pose).N;
  const elbowY = -2 * BALL_R - 3.5;
  const upper = (Math.acos(Math.max(-1, Math.min(1, (elbowY - s.y) / LEN.upperArm))) * 180) / Math.PI;
  const arm = limb(upper, 92, 92);
  pose = { ...pose, armN: arm, armF: { ...arm } };
  const elbow = add(s, rot(v(0, LEN.upperArm), upper));
  const centre = v(elbow.x + LEN.forearm * 0.55, -BALL_R);
  // Rolling, not sliding: the seam turns with the distance travelled.
  return { pose, props: { ball: turned(centre, -((centre.x / BALL_R) * 180) / Math.PI) } };
}

const stabilityBallRollout: Spec = {
  name: "Stability Ball Rollout",
  aka: ["Swiss Ball Rollout", "Ball Rollout", "Exercise Ball Rollout"],
  mode: "alternate",
  seconds: 3.2,
  hands: { N: "fist" },
  primary: ["abs"],
  secondary: ["lats", "obliques", "hip_flexors", "delts_front"],
  still: 1,
  props: [{ id: "ball", draw: stabilityBall(BALL_R), layer: "mid" }],
  motion: ballRollout,
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

// Hanging from two handles, square-on, low enough that the feet nearly brush
// the floor: from a long body leaning out to one side (feet out, head under
// the far hand), the knees fold to the chest as the hips swing under the
// hands, and the legs reach long out to the other side. The head-side arm
// hangs nearly straight; the feet-side shoulder rides high and that elbow
// bends. Human flag groundwork (reel DR2DVVZkcpt).
const SWEEP_H = -150;
const SWEEP_HAND = 25;
const SWEEP_LEAN = 54;

function tuckSweepPose(s: number): Pose {
  const side = s < 0 ? -1 : 1;
  const e = Math.abs(s);
  const reach = Math.pow(e, 1.4); // legs stay folded until late in the swing
  const torso = SWEEP_LEAN * s;
  // Shoulder-line centre: pulled up between the hands in the tuck, dropped
  // and shifted toward the head side when long.
  const centre = v(-side * lerp(0, 13, e), SWEEP_H + lerp(30, 46, e));
  const lumbar = sub(centre, rot(v(0, -38), torso));
  const hip = add(lumbar, rot(v(0, 11), torso));
  let pose = base(hip, { torso, pelvis: torso, head: torso - side * 6 * e });
  // Thigh: up to the chest (toward the viewer, short) in the tuck, then out
  // toward the feet side, then long along the body. Angles run continuously
  // from one side to the other (58 → 180 → 302), so the drawing sweeps
  // through the tuck instead of spinning.
  const thighOut = lerp(180, SWEEP_LEAN, reach);
  const thigh = side > 0 ? thighOut : 360 - thighOut;
  const shinOut = lerp(0, SWEEP_LEAN, reach);
  const shin = side > 0 ? shinOut : -shinOut;
  const ku = lerp(0.6, 1, reach);
  // Knees a little apart in the tuck, together once long.
  const spread = lerp(9, 1.5, reach);
  const leg = (d: number): Limb => ({ ...limb(thigh - d, shin + d * 0.3, shin + d * 0.3 + side * 10), ku, kl: lerp(0.9, 1, reach) });
  pose = { ...pose, legN: leg(spread), legF: leg(-spread) };
  return hold(pose, "front", v(SWEEP_HAND, SWEEP_H), v(-SWEEP_HAND, SWEEP_H), -1);
}

function sweepHandles(): Drawing {
  const post = (x: number) => `<rect class="frame" x="${x - 2}" y="${SWEEP_H - 40}" width="4" height="${-SWEEP_H + 40}"/>`;
  const grip = (x: number) => `<rect class="steel" x="${x - 6}" y="${SWEEP_H - 1.6}" width="12" height="3.2" rx="1.6"/>`;
  return {
    svg: post(-SWEEP_HAND - 8) + post(SWEEP_HAND + 8) + grip(-SWEEP_HAND) + grip(SWEEP_HAND),
    box: [-SWEEP_HAND - 10, SWEEP_H - 40, SWEEP_HAND + 10, 0],
  };
}

const hangingTuckSweep: Spec = {
  name: "Hanging Tuck Sweep",
  aka: ["Hanging Side Sweep", "Hanging Pendulum Tuck", "Side-to-Side Hanging Tuck"],
  view: "front",
  mode: "alternate",
  seconds: 2.4,
  hands: { N: "fist" },
  primary: ["obliques", "abs", "lats"],
  secondary: ["hip_flexors", "forearms", "biceps", "delts_side"],
  still: 0.5,
  scene: [{ draw: sweepHandles(), layer: "back" }],
  motion: (p) => ({ pose: tuckSweepPose(lerp(-1, 1, p)) }),
};

// --- Rollouts and crunches -------------------------------------------------------

const abWheel: Spec = {
  name: "Ab Wheel Rollout",
  aka: ["Ab Rollout", "Kneeling Ab Wheel Rollout", "Ab Roller", "Ab Rollers"],
  mode: "alternate",
  seconds: 3.2,
  hands: { N: "fist" },
  primary: ["abs"],
  secondary: ["lats", "obliques", "hip_flexors", "triceps"],
  still: 1,
  props: [WHEEL],
  motion: kneelingRollout,
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

// Seen from above, lying on a mat with the head to the right, each hand
// gripping a kettlebell's handle beside the head for an anchor, elbows out.
// The legs start straight and raised, hips up off the mat; both knees tuck in
// toward one shoulder, the hips turning with them, drive back out straight,
// and tuck in toward the other shoulder. From above, height shows only as
// shortening and as the shadow the legs throw on the mat, so each leg segment
// is aimed in three dimensions — along the body toward the head, across it
// toward the bottom of the picture, and up off the mat — and drawn as its
// projection, its shadow sliding further from it the higher it is.
type Dir3 = [along: number, across: number, up: number];
const unit3 = (d: Dir3): Dir3 => {
  const n = Math.hypot(...d);
  return [d[0] / n, d[1] / n, d[2] / n];
};
const toward3 = (a: Dir3, b: Dir3, t: number): Dir3 => unit3([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
const fromAbove = (d: Dir3) => ({ angle: dirAngle(v(d[0], d[1])), k: Math.max(0.05, Math.hypot(d[0], d[1])) });

const TUCK_HIP = v(0, -60);
const TUCK_BODY = -90; // head to the right
const TUCK_NECK = frontJoints(base(TUCK_HIP, { torso: TUCK_BODY, pelvis: TUCK_BODY })).neck;
// The handles sit level with the crown, a forearm and a bit out to each side.
const TUCK_GRIP = { N: add(TUCK_NECK, v(20, 27)), F: add(TUCK_NECK, v(20, -27)) };
// Legs straight, raised about 55° and pointing away from the head.
const TUCK_OUT: Dir3 = unit3([-0.6, 0, 0.8]);
// Where a point's shadow falls on the mat, per unit of height above it.
const TUCK_LIGHT = v(-0.2, 0.42);
// A soft shadow along a unit line, stretched to each leg segment.
const LEG_SHADOW: Drawing = {
  svg: `<ellipse cx=".5" rx=".55" ry="5.5" fill="#1f2a27" fill-opacity=".18"/>`,
  box: [-0.05, -5.5, 1.05, 5.5],
};

const twistingTuck: Spec = {
  name: "Twisting Alternating Tuck",
  aka: ["Twisting Alternating Tucks", "Twisting Tuck", "Kettlebell Twisting Tuck"],
  view: "front",
  mode: "alternate",
  seconds: 3.6,
  samples: 16,
  floor: false,
  backdrop: "#dfe4e2",
  legsInFront: true,
  hands: { N: "fist" },
  primary: ["abs", "obliques"],
  secondary: ["hip_flexors", "lats", "forearms"],
  still: 0,
  scene: [
    { draw: matFromAbove(TUCK_HIP.x - 80, TUCK_HIP.y - 48, TUCK_GRIP.N.x + 14, TUCK_HIP.y + 48), layer: "back" },
    { draw: kettlebellFromAbove(TUCK_GRIP.N), layer: "back" },
    { draw: kettlebellFromAbove(TUCK_GRIP.F), layer: "back" },
  ],
  props: ["thighN", "shinN", "thighF", "shinF"].map((id) => ({ id, draw: LEG_SHADOW, layer: "back" as const })),
  motion: (p) => {
    // -1 tucked toward the top of the picture, 0 legs out, +1 toward the bottom.
    const side = kf(p, [[0, -1], [0.5, 0], [1, 1]]);
    const t = Math.abs(side);
    const s = side < 0 ? -1 : 1;
    // Knees by the shoulder and out past the ribs; heels pulled in to the seat.
    const thighIn: Dir3 = unit3([0.5, 0.72 * s, 0.48]);
    const shinIn: Dir3 = unit3([-42, -5.7 * s, -11.1]);
    const aim = (spread: number) => ({
      thigh: toward3(TUCK_OUT, [thighIn[0], thighIn[1] + spread * t, thighIn[2]], t),
      shin: toward3(TUCK_OUT, shinIn, t),
    });
    const leg = (a: ReturnType<typeof aim>): Limb => {
      const thigh = fromAbove(a.thigh);
      const shin = fromAbove(a.shin);
      return { upper: thigh.angle, lower: shin.angle, end: shin.angle, ku: thigh.k, kl: shin.k, ke: lerp(0.75, 0.9, t) };
    };
    const aimN = aim(0.06 * s);
    const aimF = aim(-0.06 * s);
    let pose = base(TUCK_HIP, { pelvis: TUCK_BODY - side * 5, torso: TUCK_BODY - side * 2, head: TUCK_BODY });
    pose = hold({ ...pose, legN: leg(aimN), legF: leg(aimF) }, "front", TUCK_GRIP.N, TUCK_GRIP.F, -1, 1);
    // Shadows: the hips ride a little off the mat, the legs above them.
    const j = frontJoints(pose);
    const hipUp = lerp(14, 10, t);
    const onMat = (q: V, up: number) => add(q, v(TUCK_LIGHT.x * up, TUCK_LIGHT.y * up));
    const shadows = (hip: V, knee: V, ankle: V, a: ReturnType<typeof aim>) => {
      const kneeUp = hipUp + LEN.thigh * a.thigh[2];
      const ankleUp = kneeUp + LEN.shin * a.shin[2];
      return {
        thigh: line(onMat(hip, hipUp), onMat(knee, kneeUp)),
        shin: line(onMat(knee, kneeUp), onMat(ankle, ankleUp)),
      };
    };
    const n = shadows(j.hip, j.kneeN, j.ankleN, aimN);
    const f = shadows(j.hipF, j.kneeF, j.ankleF, aimF);
    return { pose, props: { thighN: n.thigh, shinN: n.shin, thighF: f.thigh, shinF: f.shin } };
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

// --- From a rugby core circuit -------------------------------------------------
//
// Four rotation and side-bend moves, all square-on: what they train happens
// side to side, which a side view would hide.

// A bar across the upper back, hands wide, driving one end down and the other
// up by bending side to side, the hips shifting the other way to stay over the
// feet. The bar tilts further than the trunk: the high shoulder shrugs up.
const barbellSeesaw: Spec = {
  name: "Barbell Seesaw",
  aka: ["Seesaw", "Barbell See-Saw", "Seesaws"],
  view: "front",
  mode: "alternate",
  seconds: 1.6,
  hands: { N: "fist" },
  primary: ["obliques"],
  secondary: ["abs", "lower_back", "traps", "glutes"],
  still: 1,
  props: [{ id: "bar", draw: barbellAcross(), layer: "back" }],
  motion: (p) => {
    const s = lerp(-1, 1, p);
    const torso = s * 14;
    let pose = base(v(-s * 4, -92.6), { torso, pelvis: s * 3, head: s * 5 });
    pose = plant(pose, "front", v(17, -8), v(-17, -8), {}, 1);
    const tilt = s * 24;
    const centre = add(frontJoints(pose).lumbar, rot(v(0, -40), torso));
    pose = hold(pose, "front", add(centre, rot(v(46, 0), tilt)), add(centre, rot(v(-46, 0), tilt)));
    return { pose, props: { bar: turned(centre, tilt) } };
  },
};

// Sitting on the floor, knees up, feet down: thighs point up at the viewer and
// the shins drop back to the floor. Drawn over the trunk.
function seatedKneesUp(): Pose {
  const pose = base(v(0, -16));
  const leg = { ...limb(160, -8, 0), ku: 0.55, kl: 0.72, ke: 0.4 };
  return { ...pose, legN: leg, legF: mirror(leg) };
}

// Catch the ball overhead, swing it down beside one hip with the trunk
// turning after it, swing it back up and throw it from overhead. Thrown
// toward a partner, which from the front reads as up and away; it drops back
// into the hands for the next rep.
const mul2 = (q: V, k: number) => v(q.x * k, q.y * k);
const BALL_TOP = v(0, -126);
const BALL_HIP = v(-34, -26);
const seatedBallThrow: Spec = {
  name: "Seated Medicine Ball Throw",
  aka: ["Ball Throws", "Seated Med Ball Throw", "Seated Rotational Med Ball Throw"],
  view: "front",
  legsInFront: true,
  mode: "loop",
  seconds: 2.4,
  samples: 36,
  hands: { N: "hand" },
  primary: ["obliques", "abs"],
  secondary: ["delts_front", "lats", "hip_flexors"],
  still: 0.4,
  props: [{ id: "ball", draw: medBall(10), layer: "front" }],
  motion: (p) => {
    const t = kf(p, [[0, 0], [0.38, 1], [0.64, 0]]);
    const torso = t * 14;
    let pose = { ...seatedKneesUp(), torso, pelvis: t * 3, head: t * 7 };
    const held = add(BALL_TOP, mul2(sub(BALL_HIP, BALL_TOP), t));
    // Elbows fold down and out as the ball comes across to the hip; overhead
    // the arms are straight, so which way they would fold never shows.
    pose = hold(pose, "front", add(held, v(8.5, 0)), add(held, v(-8.5, 0)), 1, 1);
    // Released at the top, up and away, and caught again.
    const flight = p > 0.64 ? Math.sin(((p - 0.64) / 0.36) * Math.PI) : 0;
    return { pose, props: { ball: at(add(held, v(0, -flight * 44))) } };
  },
};
// A plate held at its rim in both hands, chopped from over one shoulder down
// across to the opposite hip, swept across low to the other hip, and lifted
// over the far shoulder to chop down the other way: a figure of eight.
const CHOP_HIGH = v(40, -196);
const CHOP_LOW = v(42, -78);
const plateWoodchop: Spec = {
  name: "Plate Woodchop",
  aka: ["Plate Woodchopper", "Woodchoppers", "Woodchopper"],
  view: "front",
  mode: "loop",
  seconds: 4,
  samples: 48,
  hands: { N: "fist" },
  primary: ["obliques"],
  secondary: ["abs", "delts_front", "glutes", "quads"],
  still: 1 / 12,
  props: [{ id: "plate", draw: plateFace(14), layer: "front" }],
  motion: (p) => {
    const T = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
    // high left → low right → low left → high right → low left → low right → high left
    const xs = [-CHOP_HIGH.x, CHOP_LOW.x, -CHOP_LOW.x, CHOP_HIGH.x, -CHOP_LOW.x, CHOP_LOW.x, -CHOP_HIGH.x];
    const high = [1, 0, 0, 1, 0, 0, 1];
    const x = kf(p, T.map((q, i) => [q, xs[i]]));
    const h = kf(p, T.map((q, i) => [q, high[i]]));
    const target = v(x, lerp(CHOP_LOW.y, CHOP_HIGH.y, h));
    // The trunk leans toward the plate, bending more when it is low.
    const tilt = -(x / CHOP_HIGH.x) * lerp(16, 12, h);
    let pose = base(v(-tilt * 0.3, lerp(-86, -92.5, h)), { torso: tilt, pelvis: tilt * 0.3, head: tilt * 0.5 });
    pose = plant(pose, "front", v(22, -8), v(-22, -8), {}, 1);
    pose = hold(pose, "front", add(target, v(10, 0)), add(target, v(-10, 0)));
    return { pose, props: { plate: at(target) } };
  },
};

// The end of a landmine bar (a plate loaded on it) held in both hands, swung
// in an arc from beside one hip, up past the face and down beside the other,
// the trunk bending and turning after it over wide, bent knees. The pivot is
// on the floor in front, toward the viewer, so the bar runs down to it.
const RAINBOW_PIVOT = v(0, -3);
const rainbowEnd = (phi: number) => v(42 * Math.sin(phi), -74 - 116 * Math.cos(phi));
const landmineRainbow: Spec = {
  name: "Landmine Rainbow",
  aka: ["Pendulum Swing", "Landmine Pendulum Swing", "Landmine Swing", "Pendulum Swings"],
  view: "front",
  mode: "alternate",
  seconds: 2.2,
  samples: 36,
  hands: { N: "fist" },
  primary: ["obliques"],
  secondary: ["abs", "delts_front", "glutes", "quads"],
  still: 0.25,
  scene: [{ draw: landmineBase(RAINBOW_PIVOT), layer: "front" }],
  props: [
    { id: "bar", draw: barLine(), layer: "front" },
    { id: "plate", draw: plateFace(11), layer: "front" },
  ],
  motion: (p) => {
    const phi = lerp(-Math.PI / 2, Math.PI / 2, p);
    const side = Math.sin(phi);
    const end = rainbowEnd(phi);
    const tilt = -20 * side;
    let pose = base(v(8 * side, -86 - 5 * Math.cos(phi)), { torso: tilt, pelvis: tilt * 0.3, head: tilt * 0.4 });
    pose = plant(pose, "front", v(27, -8), v(-27, -8), {}, 1);
    const d = sub(end, RAINBOW_PIVOT);
    const L = Math.hypot(d.x, d.y);
    const dir = v(d.x / L, d.y / L);
    const across = v(-dir.y, dir.x);
    pose = hold(pose, "front", add(end, mul2(across, 4.5)), add(end, mul2(across, -4.5)));
    return {
      pose,
      props: {
        bar: line(RAINBOW_PIVOT, add(end, mul2(dir, 4))),
        plate: at(add(end, mul2(dir, -13))),
      },
    };
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
  copenhagenKneeTuck,
  hipFlexorPlank,
  sideHyperextension,
  hollowHold,
  deadBug,
  birdDog,
  vUp,
  sitUp,
  hangingRaise({ name: "Hanging Knee Raise", kind: "knee", primary: ["abs", "hip_flexors"], secondary: ["obliques", "forearms"] }),
  hangingRaise({ name: "Hanging Leg Raise", kind: "leg", primary: ["abs", "hip_flexors"], secondary: ["obliques", "forearms"] }),
  hangingRaise({ name: "Toes-to-Bar", aka: ["Toes to Bar"], kind: "toes", primary: ["abs", "hip_flexors"], secondary: ["lats", "obliques", "forearms"] }),
  frontLeverTuck,
  lever({ name: "Advanced Tuck Front Lever", tuck: 0.68 }),
  lever({ name: "Straddle Front Lever", tuck: 0, straddle: true }),
  lever({ name: "Front Lever", aka: ["Full Front Lever"], tuck: 0 }),
  frontLeverRaise,
  germanHang,
  backLever({ name: "Tuck Back Lever", aka: ["Back Lever Tuck"], tuck: 1 }),
  backLever({ name: "Advanced Tuck Back Lever", tuck: 0.68 }),
  backLever({ name: "Straddle Back Lever", tuck: 0, straddle: true }),
  backLever({ name: "Back Lever", aka: ["Full Back Lever"], tuck: 0 }),
  rearSupportToBackLever,
  skinTheCat,
  lSit({ name: "Tuck L-Sit", kind: "tuck", primary: ["abs", "hip_flexors"], secondary: ["triceps", "delts_front", "quads"] }),
  lSit({ name: "One-Leg L-Sit", kind: "one", primary: ["abs", "hip_flexors"], secondary: ["triceps", "delts_front", "quads"] }),
  lSit({ name: "L-Sit", aka: ["L Sit"], kind: "full", primary: ["abs", "hip_flexors"], secondary: ["triceps", "delts_front", "quads"] }),
  seatedLegLift,
  wallVSit({ name: "Wall One-Leg V-Sit", aka: ["Wall Single-Leg V-Sit"], one: true }),
  wallVSit({ name: "Wall V-Sit", aka: ["Wall-Supported V-Sit"] }),
  bandedVSit({ name: "Banded V-Sit", aka: ["Band-Assisted V-Sit"] }),
  lSit({ name: "V-Sit", aka: ["V Sit"], kind: "v", primary: ["abs", "hip_flexors"], secondary: ["triceps", "delts_front", "quads", "hamstrings"] }),
  dragonFlag({ name: "Tuck Dragon Flag", tuck: true }),
  negative(dragonFlag({ name: "Dragon Flag" }), "Dragon Flag Negative"),
  dragonFlag({ name: "Dragon Flag" }),
  flagHold({
    name: "Vertical Flag",
    aka: ["Vertical Flag Hold"],
    tilt: 90,
    legs: "together",
    primary: ["delts_side", "triceps", "lats"],
    secondary: ["obliques", "abs", "forearms", "traps"],
  }),
  flagHold({ name: "Tuck Flag", aka: ["Tuck Human Flag"], tilt: 4, legs: "tuck", ...FLAG_MUSCLES }),
  negative(flagSweep, "Human Flag Negative", ["Flag Negative"]),
  flagHold({ name: "Straddle Flag", aka: ["Straddle Human Flag"], tilt: 2, legs: "straddle", ...FLAG_MUSCLES }),
  flagHold({ name: "Human Flag", aka: ["Full Human Flag", "Full Flag"], tilt: 0, legs: "together", ...FLAG_MUSCLES }),
  windshieldWiper,
  hangingTuckSweep,
  stabilityBallRollout,
  wallStop({ name: "Wall-Stop Ab Wheel Rollout", aka: ["Partial Ab Wheel Rollout", "Kneeling Wall-Stop Rollout"], stop: 0.55, seconds: 2.6, roll: kneelingRollout }),
  abWheel,
  wallStop({ name: "Standing Wall-Stop Ab Wheel Rollout", aka: ["Standing Ab Wheel Rollout to Wall", "Standing Wall-Stop Rollout"], stop: 0.5, seconds: 3, roll: standingRollout }),
  standingAbWheelNegative,
  standingAbWheel,
  cableCrunch,
  russianTwist,
  twistingTuck,
  pallofPress,
  woodchop,
  plateWoodchop,
  barbellSeesaw,
  landmineRainbow,
  seatedBallThrow,
  cableHip({ name: "Hip Abduction", abduct: true }),
  cableHip({ name: "Hip Adduction", abduct: false }),
  monsterWalk,
  clamshell,
];

