// Warm-ups, mobility, stretches, foam rolling, breathing, and the recovery
// rooms (sauna, cold plunge).

import { FRONT } from "./body-front";
import { SQUARE } from "./rig";
import { box, column, doorFrame, dumbbellEnd, flatBench, foamRoller, kettlebell, lightBarFar, lightBarNear, plateFace, sauna, tubBack, tubFront, uprightRoller, wall } from "./equipment";
import {
  add,
  allFours,
  at,
  base,
  dirAngle,
  frontJoints,
  grips,
  hips,
  hold,
  ik2,
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

// Seated on a bench, near foot up on the pad and the elbow resting on top of
// that knee, upper arm reaching forward and a little down. The forearm turns
// about the upper arm: from hanging down, out toward the viewer, to straight
// up. Seen from the side it only ever points along the line perpendicular to
// the upper arm, so it shortens to nothing halfway and flips over. Four
// seconds down, quick up, as the reel's caption says.
const KNEE_ER_HIP = v(0, -56);
const KNEE_ER_ANKLE = v(56, -52);
const kneeExternalRotation: Spec = {
  name: "Seated Dumbbell External Rotation",
  aka: [
    "Knee-Supported Dumbbell External Rotation",
    "Elbow-on-Knee External Rotation",
    "Seated External Rotation",
    "Dumbbell External Rotation",
  ],
  mode: "loop",
  seconds: 5.4,
  samples: 48,
  hands: { N: "fist", F: "hand" },
  primary: ["delts_rear"],
  secondary: ["upper_back", "forearms"],
  still: 0.05,
  depth: v(-3, -2),
  scene: [{ draw: flatBench(-50, 84, -44), layer: "back" }],
  props: [{ id: "db", draw: dumbbellEnd(6.5), layer: "front" }],
  motion: (p) => {
    // 180 = forearm straight up, 0 = hanging down.
    const theta = kf(p, [[0, 180], [0.1, 180], [0.74, 0], [0.8, 0], [0.88, 180], [1, 180]]);
    let pose = base(KNEE_ER_HIP, { torso: -12, pelvis: -6, head: -4 });
    pose = { ...pose, legN: plantLeg(KNEE_ER_HIP, KNEE_ER_ANKLE, -2, 1), legF: plantLeg(KNEE_ER_HIP, v(34, -8), 0, 1) };
    const j = joints(pose);
    const rest = add(j.kneeN, v(-1, -7));
    const upper = dirAngle(sub(rest, j.shoulder));
    const k = Math.abs(Math.cos((theta * Math.PI) / 180));
    const lower = theta > 90 ? upper + 90 : upper - 90;
    const armN: Limb = { upper, lower, end: lower, kl: Math.max(k, 0.04), ke: Math.max(k, 0.3) };
    const armF = palms(pose, "side", add(j.kneeF, v(-4, -5)), undefined, 70).armF;
    pose = { ...pose, armN, armF };
    const w = joints(pose).wristN;
    const g = add(w, rot(v(0, LEN.grip * Math.max(k, 0.3)), lower));
    return { pose, props: { db: at(g) } };
  },
};

// Side-lying dumbbell internal rotation, from reel DUD1UFajiQO (move 3 of 5).
// Lying on one side with the knees bent and the head on a pad, the bottom
// elbow on the floor in front of the chest, bent to a right angle. The bottom
// forearm turns about the upper arm: from flat on the floor toward the head,
// up through vertical, and over until the dumbbell rests near the belly.
// Square-on, head to the right like Clamshell: the upper arm points at the
// viewer, so the forearm sweeps in the picture plane. The near arm is the
// bottom one.
const sideLyingInternalRotation: Spec = {
  name: "Side-Lying Dumbbell Internal Rotation",
  aka: [
    "Side-Lying Internal Rotation",
    "Dumbbell Internal Rotation",
    "Shoulder Internal Rotation",
  ],
  view: "front",
  mode: "loop",
  seconds: 4.4,
  samples: 48,
  hands: { N: "fist", F: "hand" },
  primary: ["delts_front"],
  secondary: ["chest", "lats"],
  still: 0.3,
  scene: [{ draw: box(46, 76, -10, "pad"), layer: "back" }],
  props: [{ id: "db", draw: dumbbellEnd(6.5), layer: "front" }],
  motion: (p) => {
    // Forearm direction: 90 = along the floor toward the head, 180 = straight
    // up, 250 = over the trunk toward the feet.
    const theta = kf(p, [[0, 96], [0.08, 96], [0.5, 248], [0.6, 248], [0.94, 96], [1, 96]]);
    // Raised so the bottom shoulder, not the trunk's centre line, is on the floor.
    const pose = base(v(0, -22), { torso: -90, pelvis: -90, head: -86 });
    // Knees bent toward the viewer, angled down a touch so the feet reach the floor.
    const bent = { ...limb(-80, -80, -72), ku: 0.45, kl: 0.85 };
    let posed: Pose = { ...pose, legN: bent, legF: { ...bent } };
    const j = frontJoints({ ...posed, armN: limb(0), armF: limb(0) });
    // Bottom elbow on the floor just in front of (below) the shoulder.
    const elbow = v(j.shoulder.x - 6, -3);
    const up = sub(elbow, j.shoulder);
    const armN: Limb = { upper: dirAngle(up), lower: theta, end: theta, ku: Math.hypot(up.x, up.y) / LEN.upperArm };
    // Top hand on the floor in front of the belly.
    const hand = v(j.shoulderF.x - 26, -2);
    const reach = sub(hand, j.shoulderF);
    const ang = dirAngle(reach);
    const kk = Math.hypot(reach.x, reach.y) / (LEN.upperArm + LEN.forearm);
    const armF: Limb = { upper: ang + 8, lower: ang - 8, end: ang - 20, ku: kk, kl: kk };
    posed = { ...posed, armN, armF };
    const w = frontJoints(posed).wristN;
    const g = add(w, rot(v(0, LEN.grip), theta));
    return { pose: posed, props: { db: at(g) } };
  },
};

// Eccentric Thomas test. Sit near one end of a flat bench and hug the far knee
// to the chest. The near foot is hooked under a heavy dumbbell on the floor.
// Roll back slowly until the head and shoulders hang past the far end of the
// bench. The hugged knee keeps the pelvis tucked, so the anchored thigh is
// pulled into hip extension and the front of it lengthens under load. Then
// sit back up. About 2 s down, a beat at the bottom, 1 s up, as in reel
// DIJKJOEqwXf.
const THOMAS_SEAT = -44;
const THOMAS_ANKLE = v(40, -8);
const eccentricThomas: Spec = {
  name: "Eccentric Thomas Test",
  aka: ["Eccentric Thomas Stretch", "Bench Thomas Lowering", "Thomas Test Eccentric", "Eccentric Thomas"],
  mode: "loop",
  seconds: 5.5,
  samples: 48,
  hands: { N: "fist", F: "fist" },
  primary: ["hip_flexors", "quads"],
  secondary: ["abs"],
  still: 0.04,
  scene: [{ draw: flatBench(-24, 24, THOMAS_SEAT), layer: "back" }],
  props: [{ id: "db", draw: dumbbellEnd(7.5), layer: "front" }],
  motion: (p) => {
    // 0 = sitting tall, 1 = bottom.
    const d = kf(p, [[0, 0], [0.08, 0], [0.46, 1], [0.56, 1], [0.76, 0], [1, 0]]);
    const pelvis = lerp(2, 76, d);
    const torso = lerp(4, 124, d);
    const head = lerp(4, 150, d);
    const hip = v(lerp(0, -7, d), lerp(THOMAS_SEAT - 12, THOMAS_SEAT - 14, d));
    let pose = base(hip, { pelvis, torso, head });
    // Hugged far leg: the thigh rides with the pelvis, folded tight to the chest.
    const thigh = 140 + pelvis * 0.85;
    const legF: Limb = { upper: thigh, lower: thigh - 122, end: thigh - 112 };
    pose = { ...pose, legN: plantLeg(hip, THOMAS_ANKLE, 0, 1), legF };
    // Both hands wrap the shin just below the hugged knee.
    const knee = add(hip, rot(v(0, LEN.thigh), legF.upper));
    const grip = add(knee, rot(v(0, 9), legF.lower));
    pose = hold(pose, "side", add(grip, v(0, 0)), add(grip, v(1, -1)), 1);
    return { pose, props: { db: at(add(THOMAS_ANKLE, v(7, 0.5))) } };
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

// A plate circled close around the head, held by its rim at three and nine
// o'clock: in front of the chin, past one ear, behind the head, past the
// other. The plate keeps facing the viewer the whole way round, so it is
// drawn twice — once behind the body, once over the chest — and the front
// copy folds away to nothing while the plate is behind the head.
const HALO_R = 15;

// A value going once round a circle through four keys — front, right of the
// picture, back, left — as smoothly as the circle itself: the lowest
// harmonics that pass through all four.
function around(t: number, [front, right, back, left]: [number, number, number, number]): number {
  const a = 2 * Math.PI * t;
  return (
    (front + right + back + left) / 4 +
    ((front - back) / 2) * Math.cos(a) +
    ((right - left) / 2) * Math.sin(a) +
    ((front - right + back - left) / 4) * Math.cos(2 * a)
  );
}

// Wide enough at the ears that neither fist is over the face as the plate
// changes sides of the head.
const haloPlate = (t: number) => v(around(t, [0, 27, 0, -27]), around(t, [-141, -164, -158, -164]));
const haloBehind = (t: number) => Math.cos(2 * Math.PI * t) < 0.01;

// An arm from the shoulder to a fist at `grip` through an elbow at `elbow`,
// either of which may sit toward the viewer: each bone is drawn as long as
// it looks from the front.
function throughElbow(shoulder: V, elbow: V, grip: V): Limb {
  const up = sub(elbow, shoulder);
  const fore = sub(grip, elbow);
  const lower = dirAngle(fore);
  return {
    upper: dirAngle(up),
    lower,
    end: lower,
    ku: Math.min(1, Math.hypot(up.x, up.y) / LEN.upperArm),
    kl: Math.min(1, (Math.hypot(fore.x, fore.y) - LEN.grip) / LEN.forearm),
  };
}

// The right-of-picture arm at phase t; the left one is its mirror image at
// 1 - t. Elbows low and forward with the plate at the chest, high and wide
// with it behind the head, and the far arm crossing the face as it passes
// an ear.
function haloArm(pose: Pose, t: number): Limb {
  const elbow = v(around(t, [25, 44, 34, 10]), around(t, [-118, -138, -168, -150]));
  return throughElbow(shoulders(pose, "front").N, elbow, add(haloPlate(t), v(HALO_R, 0)));
}

// The head drawn a second time, over the arms: while the plate is behind it
// the hands are too, and the head has to hide whichever one is crossing.
const HEAD_COVER = (() => {
  const art = FRONT.head;
  const paths = art.layers.map((l, i) => `<path class="${i === 0 ? "b" : l.line ? "ln" : "m"}" d="${l.d}"/>`).join("");
  return {
    svg: `<g transform="translate(${-art.joint.x} ${-art.joint.y})">${paths}<path class="ol" d="${art.layers[0].d}"/></g>`,
    box: [-10, -26, 10, 2] as [number, number, number, number],
  };
})();

// Folded to nothing, for the copy that isn't showing.
const shown = (at: V, angle: number, show: boolean) => ({ at, angle, scaleX: show ? 1 : 0.001 });

const plateHalo: Spec = {
  name: "Plate Halo",
  aka: ["Kettlebell Halo"],
  view: "front",
  mode: "loop",
  seconds: 3.6,
  samples: 24,
  hands: { N: "fist" },
  primary: ["delts_front", "delts_side"],
  secondary: ["delts_rear", "triceps", "traps", "abs"],
  still: 0.375,
  props: [
    { id: "behind", draw: plateFace(HALO_R), layer: "back" },
    { id: "front", draw: plateFace(HALO_R), layer: "mid" },
    { id: "head", draw: HEAD_COVER, layer: "front" },
  ],
  motion: (p) => {
    let pose = standSquare(-94.6, { head: 5 * Math.sin(2 * Math.PI * p) }, 11);
    pose = { ...pose, armN: haloArm(pose, p), armF: mirror(haloArm(pose, 1 - p)) };
    const plate = haloPlate(p);
    const behind = haloBehind(p);
    return {
      pose,
      props: {
        behind: at(plate),
        front: shown(plate, 0, !behind),
        head: shown(frontJoints(pose).neck, pose.head, behind),
      },
    };
  },
};

// Kettlebell archer swing, from reel DUrP-HOEgeZ. One bell in one hand, the
// other hand behind the back. The bell goes round the shoulder in one loop:
// from beside the hip, straight-armed out to the side and up overhead; the
// elbow bends and the bell drops behind the head; the elbow comes forward to
// shoulder height with the forearm upright and the bell above the fist, like
// drawing a bow; then the arm opens and the bell swings down to the hip. Drawn
// square-on. The bell always points along the forearm, as a swung bell does.
const ARCHER: [number, { up: number; lo: number; ku: number; kl: number }][] = [
  [0, { up: 12, lo: 10, ku: 1, kl: 1 }],
  [0.22, { up: 92, lo: 94, ku: 1, kl: 1 }],
  [0.4, { up: 168, lo: 172, ku: 1, kl: 1 }],
  [0.54, { up: 158, lo: 312, ku: 0.95, kl: 0.9 }],
  [0.62, { up: 132, lo: 268, ku: 0.6, kl: 0.25 }],
  [0.72, { up: 100, lo: 186, ku: 0.35, kl: 1 }],
  [0.8, { up: 96, lo: 184, ku: 0.35, kl: 1 }],
  [0.92, { up: 40, lo: 36, ku: 0.85, kl: 0.9 }],
  [1, { up: 12, lo: 10, ku: 1, kl: 1 }],
];

const archerSwing: Spec = {
  name: "Kettlebell Archer Swing",
  aka: ["Archer Swing"],
  view: "front",
  mode: "loop",
  seconds: 2.4,
  samples: 36,
  hands: { N: "fist", F: "fist" },
  primary: ["delts_front", "delts_side", "delts_rear"],
  secondary: ["traps", "triceps", "forearms", "abs"],
  still: 0.76,
  props: [
    { id: "kbBack", draw: kettlebell(), layer: "back" },
    { id: "kbFront", draw: kettlebell(), layer: "front" },
    { id: "head", draw: HEAD_COVER, layer: "front" },
  ],
  motion: (p) => {
    const key = (f: (k: (typeof ARCHER)[number][1]) => number) => kf(p, ARCHER.map(([t, k]) => [t, f(k)]));
    const lo = key((k) => k.lo);
    const armN: Limb = { upper: key((k) => k.up), lower: lo, end: lo, ku: key((k) => k.ku), kl: key((k) => k.kl) };
    // Free hand on the hip (in the reel it sits on the small of the back).
    const armF = mirror({ ...limb(28, -52, -60), kl: 0.8 });
    const pose: Pose = { ...standSquare(-94.6, { head: kf(p, [[0, 0], [0.55, -4], [0.75, 3], [1, 0]]) }, 11), armN, armF };
    // Behind the head from when the elbow folds until it comes forward again.
    const behind = p > 0.46 && p < 0.68;
    const kb = turned(grips(pose, "front").N, lo);
    return {
      pose,
      props: {
        kbBack: kb,
        kbFront: { ...kb, scaleX: behind ? 0.001 : 1 },
        head: shown(frontJoints(pose).neck, pose.head, behind),
      },
    };
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

// Kneeling, sitting back on the heels with the tops of the feet flat, the
// chest resting on the thighs, forehead down past the knees and the arms
// reaching long along the floor. Breathing lifts the back a little.
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
    let pose = childsPoseBody(breathe(p));
    const s = shoulders(pose).N;
    pose = palms(pose, "side", v(s.x + 50, 0), v(s.x + 50, 0), 90, -1);
    return { pose };
  },
};

// Knees on the floor, shins flat behind them, the hip joint resting just
// above the heels and solved to sit a thigh-length from the knee. `b` is how
// far into a breath (0–1), which lifts the back a little. Arms not posed.
function childsPoseBody(b = 0): Pose {
  const knee = v(10, -5);
  const ankle = v(knee.x - LEN.shin, -5);
  const hipY = -24 - b * 1.5;
  const hip = v(knee.x - Math.sqrt(LEN.thigh ** 2 - (knee.y - hipY) ** 2), hipY);
  const pose = base(hip, { pelvis: -96, torso: -101 + b * 3, head: -118 + b * 2 });
  const leg: Limb = { ...limb(dirTo(hip, knee), dirTo(knee, ankle), -175) };
  return { ...pose, legN: leg, legF: { ...leg } };
}

const dirTo = (a: V, b: V) => (Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI;

// --- Lower trapezius: the child's pose lift-off and the prone Y ---------------
//
// From Squat University's reel DScuJl2AHZz, the fix for a weightlifter's
// shoulder pain: a prone Y for the lower trapezius, paired with an arm lift
// from child's pose for control of the shoulder blade. A Y-position arm
// reaches forward and out about 30° from the line of the body, so from the
// side it is drawn a little short.
const Y_SPREAD = Math.cos((30 * Math.PI) / 180);
// Shoulder to the centre of the fist, arm straight.
const ARM_TO_GRIP = LEN.upperArm + LEN.forearm + LEN.grip;

// A straight arm at `angle` (0 hanging, 90 reaching forward level), in a Y.
// `k` foreshortens it: the arm hangs plumb at the bottom of a bench Y, where
// nothing points out of the picture, and spreads as it rises.
const straightArm = (angle: number, k = Y_SPREAD): Limb => ({ ...limb(angle), ku: k, kl: k, ke: Math.max(k, 0.6) });

// Child's pose, then the near arm floats straight up off the floor, thumb up,
// holds, and sets back down. The far hand stays flat. In the reel the lift is
// small, a hand's height, and the side that couldn't lift at first is the
// one that hurt.
const childsPoseLiftOff: Spec = {
  name: "Child's Pose Lift-Off",
  aka: ["Childs Pose Lift-Off", "Child's Pose Lift Off", "Child's Pose Arm Lift", "Backward-Rocking Arm Lift"],
  mode: "loop",
  seconds: 4.4,
  samples: 40,
  hands: { N: "fist", F: "palm" },
  primary: ["traps", "upper_back"],
  secondary: ["delts_rear", "delts_side"],
  still: 0.5,
  motion: (p) => {
    let pose = childsPoseBody();
    const s = shoulders(pose).N;
    pose = palms(pose, "side", v(s.x + 48, 0), v(s.x + 48, 0), 90, -1);
    // The arm along the floor: the fist resting on it, thumb up.
    const reach = ARM_TO_GRIP * Y_SPREAD;
    const rest = (Math.acos((-4.5 - s.y) / reach) * 180) / Math.PI;
    const lift = kf(p, [[0, 0], [0.12, 0], [0.32, 1], [0.62, 1], [0.84, 0], [1, 0]]);
    return { pose: { ...pose, armN: straightArm(rest + lift * 20) } };
  },
};

// Face down on the floor, or along a flat bench with the head and arms past
// its end, arms in a Y with the thumbs up. On the floor the fists start on
// the floor ahead and float a few inches; off a bench they start hanging and
// rise until in line with the ears, which is the bigger range. `plates` puts
// a small change plate in each hand, as in the reel.
const Y_BENCH_TOP = -54;
const Y_PLATE_R = 8;
function proneY(o: { name: string; aka?: string[]; bench?: boolean; plates?: boolean }): Spec {
  const surface = o.bench ? Y_BENCH_TOP : 0;
  // Prone, the spine runs about 13 above whatever the chest rests on.
  const hip = v(-56, surface - 11);
  const body = base(hip, { pelvis: -90, torso: -90, head: -94 });
  const flat = { ...body, legN: limb(-90, -90, -172), legF: limb(-90, -90, -172) };
  const s = shoulders(flat).N;
  const ankle = joints(flat).ankleN;
  // On the floor, the fist rests on it ahead of the head.
  const floorRest = (Math.acos((-4.5 - s.y) / (ARM_TO_GRIP * Y_SPREAD)) * 180) / Math.PI;
  const [low, high] = o.bench ? [28, 98] : [floorRest, 102];
  const plate = (): Prop["draw"] => plateFace(Y_PLATE_R);
  return {
    name: o.name,
    aka: o.aka,
    mode: "loop",
    seconds: 4.6,
    samples: 40,
    hands: { N: "fist" },
    primary: ["traps", "upper_back"],
    secondary: ["delts_rear", "delts_side"],
    still: 0.5,
    depth: v(-3, -2),
    scene: o.bench ? [{ draw: flatBench(ankle.x + 6, s.x + 3, Y_BENCH_TOP), layer: "back" }] : [],
    props: o.plates
      ? [
          { id: "plF", draw: plate(), layer: "back" },
          { id: "plN", draw: plate(), layer: "mid" },
        ]
      : [],
    motion: (p) => {
      // Up in about a second, a two-second hold at the top, slower down.
      const t = kf(p, [[0, 0], [0.08, 0], [0.3, 1], [0.62, 1], [0.92, 0], [1, 0]]);
      const angle = lerp(low, high, t);
      const k = o.bench ? lerp(1, Y_SPREAD, Math.sin((Math.min(angle, 90) * Math.PI) / 180)) : Y_SPREAD;
      const arm = straightArm(angle, k);
      const pose: Pose = { ...flat, armN: arm, armF: { ...arm } };
      if (!o.plates) return { pose };
      // The fist pinches the rim; the plate sits on past it, along the arm.
      const g = grips(pose);
      const on = rot(v(0, Y_PLATE_R - 2.5), angle);
      return { pose, props: { plN: at(add(g.N, on)), plF: at(add(add(g.F, on), v(-3, -2))) } };
    },
  };
}

const proneYRaise = proneY({ name: "Prone Y Raise", aka: ["Prone Y", "Pronated Y Raise", "Floor Y Raise", "Lying Y Raise"] });
const benchProneYRaise = proneY({ name: "Bench Prone Y Raise", aka: ["Prone Y Raise on Bench", "Bench Y Raise"], bench: true });
const weightedProneYRaise = proneY({
  name: "Weighted Prone Y Raise",
  aka: ["Weighted Bench Y Raise", "Weighted Pronated Y Raise", "Prone Y Raise with Plates", "Dumbbell Prone Y Raise"],
  bench: true,
  plates: true,
});

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

// On hands and knees, head to the right, a foam roller stood on its end
// beside the near knee, about a third of the way to the hand. The near leg
// kicks straight back, circles out and forward with the knee bent so the foot
// clears the top of the roller, and plants flat beside the near hand; then
// lifts back over the roller the same way and the knee returns to the floor.
// Seen side-on, the leg shortens as it swings out toward the viewer, which is
// what the foreshortened knee and shin keys below draw.
// Shoulders a little above the hips, so the arms are straight as in the reel
// and there is room under the trunk for the foot to cross the roller.
const HURDLE_REST = allFours({ torso: -77 });
const HURDLE_HIP = HURDLE_REST.hip;
const HURDLE_REST_KNEE = joints(HURDLE_REST).kneeN;
const HURDLE_REST_ANKLE = joints(HURDLE_REST).ankleN;
const HURDLE_ROLLER_X = 15;
const HURDLE_ROLLER_H = 25;
const HURDLE_PLANT = v(38, -8);
const HURDLE_PLANT_KNEE = ik2(HURDLE_HIP, HURDLE_PLANT, LEN.thigh, LEN.shin, 1).mid;

// Thigh toward `knee` (shortened if the knee is closer than a thigh length),
// shin from wherever that leaves the knee toward `ankle`.
function legThrough(hip: V, knee: V, ankle: V, foot: number): Limb {
  const a = sub(knee, hip);
  const ku = Math.min(1, Math.hypot(a.x, a.y) / LEN.thigh);
  const upper = dirAngle(a);
  const k = add(hip, rot(v(0, LEN.thigh * ku), upper));
  const b = sub(ankle, k);
  return { upper, lower: dirAngle(b), end: foot, ku, kl: Math.min(1, Math.hypot(b.x, b.y) / LEN.shin) };
}

const rollerHurdle: Spec = {
  name: "Quadruped Roller Hurdle",
  aka: [
    "Quadruped Hip Hurdle",
    "Roller Hip Hurdle",
    "Kickback to Step-Through over Roller",
    "Quadruped Kickback to Step-Through",
  ],
  mode: "loop",
  seconds: 4.4,
  samples: 48,
  hands: { N: "palm" },
  primary: ["glutes", "hip_flexors"],
  secondary: ["abductors", "abs", "hamstrings"],
  still: 0.56,
  nearShinOnTop: true,
  scene: [{ draw: uprightRoller(HURDLE_ROLLER_X, HURDLE_ROLLER_H), layer: "mid" }],
  motion: (p) => {
    const restK = HURDLE_REST_KNEE;
    const restA = HURDLE_REST_ANKLE;
    const back = { k: v(-43.6, -55), a: v(-86, -61) };
    const over = { k: v(28, -57), a: v(12, -43) };
    const ahead = { k: v(41, -56), a: v(35, -32) };
    const knee = kfv(p, [
      [0, restK], [0.06, restK], [0.16, v(-26, -15)], [0.28, back.k], [0.38, back.k],
      [0.48, v(10, -44)], [0.52, v(20, -52)], [0.56, over.k], [0.61, ahead.k], [0.66, HURDLE_PLANT_KNEE],
      [0.76, HURDLE_PLANT_KNEE], [0.8, ahead.k], [0.84, over.k], [0.88, v(18, -56)], [0.94, v(8, -22)],
      [1, restK],
    ]);
    const ankle = kfv(p, [
      [0, restA], [0.06, restA], [0.16, v(-36, -57)], [0.28, back.a], [0.38, back.a],
      [0.48, v(-22, -50)], [0.52, v(-2, -52)], [0.56, over.a], [0.61, ahead.a], [0.66, HURDLE_PLANT],
      [0.76, HURDLE_PLANT], [0.8, ahead.a], [0.84, over.a], [0.88, v(0, -50)], [0.94, v(-22, -36)],
      [1, restA],
    ]);
    const foot = kf(p, [
      [0, -100], [0.06, -100], [0.16, -180], [0.28, -170], [0.38, -170],
      [0.48, -160], [0.52, -60], [0.56, -20], [0.61, -15], [0.66, 0],
      [0.76, 0], [0.8, -15], [0.84, -20], [0.88, -30], [0.94, -150],
      [1, -100],
    ]);
    return { pose: { ...HURDLE_REST, legN: legThrough(HURDLE_HIP, knee, ankle, foot) } };
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

// Standing couch stretch (reel DQ5cHDcDCJA): rear instep on a bench, front
// foot flat, both hands on an upright post ahead. It rocks between the
// bottom, rear knee bent ~70° (quad / rectus femoris), and a drive forward
// that straightens the rear knee to ~135° and opens the rear hip.
const RFE_REAR = v(-44, -43);
const RFE_FRONT = v(46, -8);
const RFE_POST = 84;
const rfeAt = (p: number): Pose => {
  const hip = lerpV(v(5, -60.5), v(28, -77), p);
  const torso = lerp(-32, -10, p);
  const pose = base(hip, { torso, pelvis: torso * 0.6, head: torso * 0.5 });
  return {
    ...pose,
    legN: plantLeg(hip, RFE_FRONT, 0, 1),
    legF: plantLeg(hip, RFE_REAR, -186, 1),
  };
};
const RFE_GRIP = v(RFE_POST - 2, -122);

const rearFootElevatedHipFlexor: Spec = {
  name: "Rear-Foot-Elevated Hip Flexor Stretch",
  aka: ["Standing Couch Stretch", "Elevated Couch Stretch", "RFE Hip Flexor Stretch"],
  mode: "alternate",
  seconds: 2.4,
  hands: { N: "fist" },
  primary: ["hip_flexors", "quads"],
  secondary: ["glutes", "adductors"],
  still: 0,
  scene: [
    { draw: flatBench(-96, -40, -44), layer: "back" },
    { draw: column(RFE_POST, -170, 6), layer: "back" },
  ],
  motion: (p) => ({ pose: hold(rfeAt(p), "side", RFE_GRIP, undefined, -1) }),
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
  scene: [{ draw: box(56, 92, -43), layer: "back" }],
  motion: (p) => {
    const torso = lerp(-6, -58, p);
    const hip = v(lerp(0, -1.5, p), -93);
    // The box sits a leg's length out, so the raised leg stays long with the
    // knee soft, heel on the box and toes pulled back.
    const ankle = v(73.5, -50);
    let pose = base(hip, { torso, pelvis: torso * 0.7, head: torso * 0.6 });
    pose = { ...pose, legF: plantLeg(hip, v(-2, -8), 0, 1), legN: plantLeg(hip, ankle, 80, 1) };
    // The hands slide down the leg as far as the fold lets them: the point
    // just above it that sits an arm's length from the shoulder.
    const s = shoulders(pose).N;
    const along = (t: number) => add(lerpV(ankle, hip, t), v(0, -4));
    let lo = 0.12;
    let hi = 0.7;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const q = along(mid);
      if (Math.hypot(s.x - q.x, s.y - q.y) > 58) lo = mid;
      else hi = mid;
    }
    pose = hold(pose, "side", along(hi), along(hi), -1);
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

// Standing on a box with a light bar, the spine peels down from the top —
// chin to chest, then the upper back, the lower back, the hips last — until
// the bar hangs past the toes, then stacks back up from the hips with the head
// last. The rig's spine is three pieces, so the order shows as which one
// leads; played backwards, the way up comes out in the right order too.
const JEFFERSON_BOX = -40;
const JEFFERSON_ANKLE = v(0, JEFFERSON_BOX - 8);

const jeffersonCurl: Spec = {
  name: "Jefferson Curl",
  // The Zercher version cradles the bar in the elbows; the spine does the same.
  aka: ["Zercher Jefferson Curl"],
  mode: "alternate",
  seconds: 6,
  hands: { N: "fist" },
  primary: ["lower_back", "hamstrings"],
  secondary: ["upper_back", "glutes"],
  still: 0.8,
  // Mid layer, so the box hides the far plate hanging beside it. The toes
  // reach its front edge.
  scene: [{ draw: box(-34, 19, JEFFERSON_BOX), layer: "mid" }],
  props: [
    { id: "bar", draw: lightBarFar(), layer: "back" },
    { id: "bar", draw: lightBarNear(), layer: "front" },
  ],
  motion: (p) => {
    const pelvis = -70 * kf(p, [[0.35, 0], [1, 1]]);
    const torso = pelvis - 100 * kf(p, [[0.08, 0], [0.85, 1]]);
    const head = torso - 34 * kf(p, [[0, 0], [0.4, 1]]);
    // Knees soften as the hips fold, and the hips drift back to keep the bar
    // over the feet, until at the bottom it hangs just clear of the box.
    const fold = kf(p, [[0.1, 0], [0.95, 1]]);
    const reach = lerp(86.4, 83.6, fold);
    const arm = limb(lerp(8, 0, fold));
    const trunk: Pose = { ...base(v(0, 0), { torso, pelvis, head }), armN: arm, armF: { ...arm } };
    const x = kf(fold, [[0, 9], [0.6, 19], [1, 23]]) - grips(trunk).N.x;
    const hip = v(x, JEFFERSON_ANKLE.y - Math.sqrt(reach * reach - x * x));
    let pose: Pose = { ...base(hip, { torso, pelvis, head }), armN: arm, armF: { ...arm } };
    pose = plant(pose, "side", JEFFERSON_ANKLE);
    return { pose, props: { bar: at(grips(pose).N) } };
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

// Seated tall with the hands on the floor beside the hips: one leg in front,
// shin across the body, the other out to the side with its shin pointing back,
// both knees bent to 90. The knees lift together through upright and lower to
// the other side. Square-on, so each leg is placed by where its knee and ankle
// land on screen and foreshortened to fit.
const ninetyNinety: Spec = {
  name: "90/90 Hip Switch",
  aka: ["90/90 Hip Stretch"],
  view: "front",
  legsInFront: true,
  mode: "alternate",
  seconds: 3,
  hands: { N: "palm" },
  primary: ["glutes", "abductors"],
  secondary: ["adductors", "hip_flexors"],
  still: 0.6,
  motion: (p) => {
    const t = p < 0.5 ? p * 2 : (p - 0.5) * 2;
    const ease = t * t * (3 - 2 * t);
    let pose = base(v(0, -14), { torso: lerp(-4, 4, p), head: lerp(-6, 6, p) });
    const h = hips(pose, "front");
    // Screen offsets from each hip, for the leg on the right of the picture.
    // Front leg: knee just ahead of the hip, shin across. Back leg: thigh out
    // to the side, shin running away from the viewer. Up: knees raised.
    const front = { knee: v(6, 8), ankle: v(44, 9) };
    const up = { knee: v(20, -26), ankle: v(26, 8) };
    const back = { knee: v(40, 8), ankle: v(38, 10) };
    const pick = (a: typeof front, b: typeof front) => ({
      knee: lerpV(a.knee, b.knee, ease),
      ankle: lerpV(a.ankle, b.ankle, ease),
    });
    // Right of the picture goes front → up → back; the left does the reverse,
    // mirrored, so both knees fall the same way.
    const right = p < 0.5 ? pick(front, up) : pick(up, back);
    const left = p < 0.5 ? pick(back, up) : pick(up, front);
    // How far the knees are through upright: the feet stand flat then, and
    // lie along the shin when the leg is down.
    const upness = p < 0.5 ? ease : 1 - ease;
    const legAt = (hip: V, o: typeof front, side: 1 | -1): Limb => {
      const knee = add(hip, v(o.knee.x * side, o.knee.y));
      const ankle = add(hip, v(o.ankle.x * side, o.ankle.y));
      const thigh = Math.hypot(knee.x - hip.x, knee.y - hip.y);
      const shin = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);
      return {
        ...limb(dirTo(hip, knee), dirTo(knee, ankle), lerp(dirTo(knee, ankle), 0, upness)),
        ku: Math.min(1, thigh / LEN.thigh),
        kl: Math.max(0.15, Math.min(1, shin / LEN.shin)),
        // A shin running away from the viewer hides its foot behind the knee.
        ke: Math.max(0.35, Math.min(1, shin / LEN.shin)),
      };
    };
    pose = { ...pose, legN: legAt(h.N, right, 1), legF: legAt(h.F, left, -1) };
    pose = palms(pose, "front", v(40, -2), v(-40, -2), 0, -1);
    return { pose };
  },
};

// Seated tall, soles of the feet together, knees out to the sides and sinking
// toward the floor. Square-on, like the 90/90: each leg is placed by where its
// knee and ankle land on screen. The heavier versions rest a kettlebell on
// each thigh just inside the knee, hands steadying the handles, and/or put
// the heels up on a yoga block so the knees have further to fall — the two
// ways the reel this was drawn from (DNqIvjvM9PW) loads it.
const BLOCK_TOP = -11;
function butterfly(o: { name: string; aka?: string[]; kb?: boolean; block?: boolean }): Spec {
  const lift = o.block ? -BLOCK_TOP : 0;
  return {
    name: o.name,
    aka: o.aka,
    view: "front",
    legsInFront: true,
    mode: "alternate",
    seconds: 4,
    hands: { N: o.kb ? "fist" : "palm" },
    primary: ["adductors"],
    secondary: ["glutes", "hip_flexors"],
    still: 1,
    scene: o.block ? [{ draw: box(-13, 13, BLOCK_TOP, "frame"), layer: "front" }] : [],
    props: o.kb
      ? [
          { id: "kbN", draw: kettlebell(), layer: "front" },
          { id: "kbF", draw: kettlebell(), layer: "front" },
        ]
      : [],
    motion: (p) => {
      const sink = breathe(p);
      let pose = base(v(0, -14), { torso: 0, head: lerp(0, 4, sink) });
      const h = hips(pose, "front");
      // Knee from the hip on the right of the picture: raised a little at
      // rest, sinking toward the floor on the stretch. Feet meet in the middle.
      const knee = lerpV(v(36, -4 - lift * 0.5), v(41, 5 - lift * 0.25), sink);
      const ankle = v(-SQUARE.hipX + 5, 9 - lift);
      const legAt = (hip: V, side: 1 | -1): Limb => {
        const k = add(hip, v(knee.x * side, knee.y));
        const a = add(hip, v(ankle.x * side, ankle.y));
        const thigh = Math.hypot(k.x - hip.x, k.y - hip.y);
        const shin = Math.hypot(a.x - k.x, a.y - k.y);
        return {
          ...limb(dirTo(hip, k), dirTo(k, a), 0),
          ku: Math.min(1, thigh / LEN.thigh),
          kl: Math.max(0.15, Math.min(1, shin / LEN.shin)),
          // Soles together, toes toward the viewer: the feet are short.
          ke: 0.45,
        };
      };
      pose = { ...pose, legN: legAt(h.N, 1), legF: legAt(h.F, -1) };
      if (!o.kb) {
        // Hands resting on the floor out past the knees.
        pose = palms(pose, "front", v(52, -1), v(-52, -1), 0, -1);
        return { pose };
      }
      // Each bell sits on its thigh just inside the knee; the hand holds
      // the handle, which is the bell's grip point.
      const j = frontJoints(pose);
      const on = (hip: V, k: V) => add(lerpV(hip, k, 0.9), v(0, -15.5));
      const gN = on(h.N, j.kneeN);
      const gF = on(h.F, j.kneeF);
      // Arms hang nearly straight to the handles, the elbows soft and set
      // back a touch, so each is drawn along the line to its grip and
      // foreshortened to reach it.
      const s = shoulders(pose, "front");
      const reachTo = (sh: V, g: V): Limb => {
        const a = dirTo(sh, g);
        const k = (Math.hypot(g.x - sh.x, g.y - sh.y) - LEN.grip) / (LEN.upperArm + LEN.forearm);
        const side = Math.sign(g.x - sh.x);
        return { ...limb(a + 6 * side, a - 6 * side, a), ku: k, kl: k };
      };
      pose = { ...pose, armN: reachTo(s.N, gN), armF: reachTo(s.F, gF) };
      return { pose, props: { kbN: turned(gN, 0), kbF: turned(gF, 0) } };
    },
  };
}

const butterflyStretch = butterfly({ name: "Butterfly Stretch", aka: ["Seated Butterfly Stretch", "Bound Angle Pose"] });
const butterflyElevated = butterfly({ name: "Feet-Elevated Butterfly Stretch", block: true });
const kbButterfly = butterfly({ name: "Kettlebell Butterfly Stretch", aka: ["Loaded Butterfly Stretch", "Weighted Butterfly Stretch"], kb: true });
const kbButterflyElevated = butterfly({
  name: "Feet-Elevated Kettlebell Butterfly Stretch",
  aka: ["Elevated Kettlebell Butterfly Stretch"],
  kb: true,
  block: true,
});

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

// Kneeling on the back knee with the front leg straight out, heel down and
// toes up, folding over it from the hips with the back long.
const halfSplit: Spec = {
  name: "Half Split",
  mode: "alternate",
  seconds: 3.6,
  hands: { N: "palm" },
  primary: ["hamstrings"],
  secondary: ["calves", "lower_back"],
  still: 1,
  motion: (p) => {
    const hip = v(lerp(-22, -28, p), -50);
    const torso = lerp(-8, -62, p);
    let pose = base(hip, { torso, pelvis: lerp(-4, -40, p), head: torso + 14 });
    const legLen = LEN.thigh + LEN.shin - 1;
    const heel = v(hip.x + Math.sqrt(legLen ** 2 - (hip.y + 8) ** 2), -8);
    pose = {
      ...pose,
      legF: { ...plantLeg(hip, v(-30, -6), -180, -1), lower: -90, end: -180 },
      legN: plantLeg(hip, heel, 80, 1),
    };
    // Hands down beside the front leg, as low as the fold lets them reach.
    const s = shoulders(pose).N;
    const reach = LEN.upperArm + LEN.forearm + LEN.palm;
    const floor = Math.min(0, s.y + reach);
    pose = palms(pose, "side", v(s.x + 6, floor), v(s.x + 6, floor), 90, -1);
    return { pose };
  },
};

// Sliding from a low lunge into the split: front leg straight ahead, back
// leg straight behind, hips square and settling to the floor.
const frontSplit: Spec = {
  name: "Front Split",
  mode: "alternate",
  seconds: 4,
  hands: { N: "palm" },
  primary: ["hamstrings", "hip_flexors"],
  secondary: ["adductors", "glutes", "quads"],
  still: 1,
  scene: [{ draw: box(-30, -18, -14), layer: "front" }],
  motion: (p) => {
    const hip = v(0, lerp(-58, -16, p));
    let pose = base(hip, { torso: lerp(-10, 0, p), pelvis: lerp(-6, 4, p), head: 0 });
    const front = lerp(48, 90, p);
    const back = lerp(-44, -90, p);
    pose = { ...pose, legN: limb(front, front, front + 70), legF: limb(back, back, back - 90) };
    // Fingertips on blocks either side, steadying.
    const s = shoulders(pose).N;
    const block = v(s.x - 4, -14);
    pose = palms(pose, "side", block, block, 90, -1);
    return { pose };
  },
};

// --- End-range quad strength, hamstrings long --------------------------------------

// Sitting in a pike, the chest folded toward the legs so the hamstrings stay
// long, with a roll under the near knee and a band from that ankle to a
// kettlebell on the floor ahead. The knee straightens over the roll until
// the heel lifts and the leg is locked, then lowers. The far leg stays long.
const SAQ_HIP = v(0, -14);
const SAQ_THIGH = 105; // resting up over the roll
const SAQ_KB = v(112, -17.2);
const saqInPike: Spec = {
  name: "Banded SAQ in Pike",
  aka: ["Banded Short Arc Quad in Pike", "Pike SAQ", "Banded Pike SAQ"],
  mode: "alternate",
  seconds: 2.8,
  hands: { N: "palm" },
  primary: ["quads"],
  secondary: ["hamstrings", "hip_flexors"],
  still: 1,
  props: [
    { id: "roll", draw: foamRoller(9), layer: "back" },
    { id: "kb", draw: kettlebell(), layer: "back" },
    band(),
  ],
  motion: (p) => {
    const torso = -56;
    let pose = base(SAQ_HIP, { torso, pelvis: -34, head: torso + 10 });
    const shin = lerp(74.6, SAQ_THIGH, p);
    pose = { ...pose, legN: limb(SAQ_THIGH, shin, shin + 82), legF: limb(90, 90, 172) };
    const s = shoulders(pose).N;
    pose = palms(pose, "side", v(s.x + 8, 0), v(s.x + 8, 0), 90, -1);
    const j = joints(pose);
    return {
      pose,
      props: {
        roll: at(v(j.kneeN.x - 2, -9)),
        kb: at(SAQ_KB),
        band: line(add(SAQ_KB, v(0, -4)), j.ankleN),
      },
    };
  },
};

// Square-on, sitting tall in a wide straddle with a yoga block outside each
// ankle. One straight leg at a time lifts up and over its block, sets down
// outside it, then lifts back over to where it started; toes stay pointing
// up and the knee stays locked. The trunk tips a touch away from the working
// leg to balance.
const STRADDLE_IN = v(54, -7); // ankle: x out from its own hip, y above the floor
const STRADDLE_UP = v(66, -54);
const STRADDLE_OUT = v(80, -7);
const STRADDLE_BLOCK: [number, number] = [61, 73];
const straddleLifts: Spec = {
  name: "Seated Straddle Leg Lifts over Blocks",
  aka: ["Seated Straddle Leg Lifts", "Straddle Leg Lifts over Blocks", "Seated Straddle Leg Lift"],
  view: "front",
  mode: "loop",
  seconds: 6,
  samples: 48,
  hands: { N: "hand" },
  primary: ["hip_flexors", "quads"],
  secondary: ["abs", "adductors", "hamstrings"],
  still: 0.125,
  scene: [-1, 1].map((s) => {
    const [a, b] = STRADDLE_BLOCK.map((x) => s * (x + 9));
    return { draw: box(Math.min(a, b), Math.max(a, b), -16), layer: "back" as const };
  }),
  motion: (p) => {
    // Near leg (right of the picture) over and back in the first half, far
    // leg in the second.
    const path = (q: number): V => {
      const k: [number, V][] = [[0, STRADDLE_IN], [0.25, STRADDLE_UP], [0.45, STRADDLE_OUT], [0.55, STRADDLE_OUT], [0.75, STRADDLE_UP], [1, STRADDLE_IN]];
      return v(kf(q, k.map(([t, a]) => [t, a.x])), kf(q, k.map(([t, a]) => [t, a.y])));
    };
    const qN = p < 0.5 ? p * 2 : 0;
    const qF = p < 0.5 ? 0 : (p - 0.5) * 2;
    const lift = (q: number) => Math.sin(Math.PI * q);
    let pose = base(v(0, -13), { torso: (lift(qN) - lift(qF)) * 4, pelvis: 0, head: 0 });
    const h = hips(pose, "front");
    // Ankle x is measured out from its own hip, y from the floor.
    const legTo = (hip: V, ankle: V, side: 1 | -1): Limb => {
      const d = v(ankle.x * side, ankle.y - hip.y);
      const k = Math.min(1, Math.hypot(d.x, d.y) / (LEN.thigh + LEN.shin));
      const a = dirAngle(d);
      return { upper: a, lower: a, end: 180 * side, ku: k, kl: k };
    };
    const ankleN = path(qN);
    const ankleF = path(qF);
    pose = {
      ...pose,
      legN: legTo(h.N, ankleN, 1),
      legF: legTo(h.F, ankleF, -1),
      armN: limb(16, 10, 10),
      armF: mirror(limb(16, 10, 10)),
    };
    return { pose };
  },
};

// Standing folded into a flat-backed pike, hips back over the heels and hands
// on a post in front, with a band from the post to the back of the near knee.
// The band draws the knees into a slight bend; the athlete locks them straight
// again without coming out of the fold.
const TKE_POST = 92;
const TKE_TORSO = -92;
const pikedTke: Spec = {
  name: "Piked TKE",
  aka: ["Piked Terminal Knee Extension", "Pike TKE", "Pike Terminal Knee Extension"],
  mode: "alternate",
  seconds: 2.6,
  hands: { N: "fist" },
  primary: ["quads"],
  secondary: ["hamstrings", "calves"],
  still: 1,
  scene: [{ draw: column(TKE_POST - 4, -150, 8), layer: "back" }],
  props: [band()],
  motion: (p) => {
    const bend = lerp(34, 0, p); // knee flexion, degrees
    const reach = Math.sqrt(LEN.thigh ** 2 + LEN.shin ** 2 + 2 * LEN.thigh * LEN.shin * Math.cos((bend * Math.PI) / 180));
    const back = -14;
    const hip = v(back, -8 - Math.sqrt(reach ** 2 - back ** 2));
    let pose = base(hip, { torso: TKE_TORSO, pelvis: -72, head: -100 });
    pose = plant(pose, "side", v(0, -8), v(0, -8));
    const s = shoulders(pose).N;
    pose = hold(pose, "side", v(TKE_POST, s.y + 6), undefined, -1);
    const knee = joints(pose).kneeN;
    return { pose, props: { band: line(v(TKE_POST, -48), add(knee, v(-3, 0))) } };
  },
};

// Sitting with the legs wide and straight, toes up, folding forward from the
// hips until the chest nears the floor. Side-on, the near leg is drawn swung
// out towards the viewer.
const pancake: Spec = {
  name: "Pancake Stretch",
  aka: ["Pancake"],
  mode: "alternate",
  seconds: 4,
  hands: { N: "palm" },
  primary: ["adductors", "hamstrings"],
  secondary: ["lower_back", "glutes"],
  still: 1,
  motion: (p) => {
    const torso = lerp(-6, -88, p);
    const hip = v(0, -14);
    let pose = base(hip, { torso, pelvis: lerp(-2, -58, p), head: torso + 8 });
    const wide = { ...limb(90, 90, 172), ku: 0.62, kl: 0.62 };
    pose = { ...pose, legN: wide, legF: { ...limb(90, 90, 172), ku: 0.8, kl: 0.8 } };
    const s = shoulders(pose).N;
    const reach = LEN.upperArm + LEN.forearm + LEN.palm;
    const ahead = Math.sqrt(Math.max(0, (reach - 2) ** 2 - (0 - s.y) ** 2));
    pose = palms(pose, "side", v(s.x + ahead, 0), v(s.x + ahead, 0), 90, -1);
    return { pose };
  },
};

// From the top of the head on the floor, pressing to straight arms with the
// hips high: hands by the ears, feet flat, the whole front of the body arched.
const BRIDGE_PALM = v(-38, 0);
const BRIDGE_ANKLE = v(30, -8);
const fullBridge: Spec = {
  name: "Full Bridge",
  aka: ["Wheel Pose", "Back Bridge"],
  mode: "alternate",
  seconds: 3.6,
  hands: { N: "palm" },
  primary: ["lower_back", "delts_front"],
  secondary: ["glutes", "triceps", "hip_flexors", "chest"],
  still: 1,
  motion: (p) => {
    const hip = v(lerp(6, 10, p), lerp(-62, -86, p));
    const torso = lerp(150, 125, p);
    let pose = base(hip, { torso, pelvis: lerp(110, 96, p), head: torso + 30 });
    pose = plant(pose, "side", BRIDGE_ANKLE, BRIDGE_ANKLE);
    pose = palms(pose, "side", BRIDGE_PALM, BRIDGE_PALM, 90, 1);
    return { pose };
  },
};

export const MOBILITY: Spec[] = [
  bandPullApart,
  bandFacePull,
  externalRotation,
  kneeExternalRotation,
  sideLyingInternalRotation,
  proneYRaise,
  benchProneYRaise,
  weightedProneYRaise,
  wallSlide,
  armCircles,
  plateHalo,
  archerSwing,
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
  childsPoseLiftOff,
  threadTheNeedle,
  catCow,
  rollerHurdle,
  couchStretch,
  rearFootElevatedHipFlexor,
  eccentricThomas,
  halfKneel({ name: "Hip Flexor Stretch", aka: ["Half-Kneeling Hip Flexor Stretch"], primary: ["hip_flexors", "quads"], secondary: ["abs"] }),
  halfKneel({ name: "Ankle Rock", aka: ["Ankle Rocks"], ankleRock: true, primary: ["calves"], secondary: ["tibialis"] }),
  pigeon,
  hamstringStretch,
  seatedForwardFold,
  pikedTke,
  saqInPike,
  straddleLifts,
  pancake,
  halfSplit,
  frontSplit,
  fullBridge,
  jeffersonCurl,
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
  butterflyStretch,
  butterflyElevated,
  kbButterfly,
  kbButterflyElevated,
  frogStretch,
];

