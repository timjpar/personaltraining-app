// Server side of the 3D views: sample a spec's motion and build the body in
// 3D. The side drawing gives every joint's place in the plane of the move;
// this adds what a flat drawing can't show: where each joint sits across the
// body, how a one-arm hang hangs under its hand, and where the free arm goes.
// The browser only draws what comes out (src/components/Exercise3D.tsx).
//
// Coordinates stay in drawing units: x forward, y down (the floor at 0), and
// z toward the viewer of the flat drawing, which is the person's right side.

import { add, clamp01, gripPoint, joints, LEN, rot, v, type V } from "./rig";
import { SPECS } from "./exercises";
import { animationSlug } from "./slug";
import { STAGES, type Model, type ModelFrame, type ModelPoint } from "./three-d";

const SAMPLES = 72;
// Half-widths across the body.
const SHOULDER = 15;
const HIP = 8.5;

const r2 = (n: number) => Math.round(n * 100) / 100;
const at = (q: V, z: number): ModelPoint => [r2(q.x), r2(q.y), r2(z)];

type D3 = [number, number, number];
const norm = ([x, y, z]: D3): D3 => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};
// Interpolate a direction through keys on the trunk angle. The trunk angle
// only ever grows through a pullover, so a negative played backwards reads
// the same keys.
function dirAt(torso: number, keys: [number, D3][]): D3 {
  if (torso <= keys[0][0]) return norm(keys[0][1]);
  for (let i = 1; i < keys.length; i++) {
    const [t1, d1] = keys[i];
    const [t0, d0] = keys[i - 1];
    if (torso <= t1) {
      const s = (torso - t0) / (t1 - t0 || 1);
      const e = s * s * (3 - 2 * s);
      return norm([d0[0] + (d1[0] - d0[0]) * e, d0[1] + (d1[1] - d0[1]) * e, d0[2] + (d1[2] - d0[2]) * e]);
    }
  }
  return norm(keys[keys.length - 1][1]);
}

// The free arm in the one-arm reel, as world directions [forward, up, out to
// the free side] for the upper arm and forearm, keyed by the trunk angle:
// hanging loose, then out to the side and bent up as the legs lift, down
// toward the floor while upside down, swept across the chest as the body
// comes up over the bar, past the forehead, and up and out to finish.
const FREE_UPPER: [number, D3][] = [
  [2, [0.05, -1, 0.25]],
  [30, [0.45, 0.1, 0.9]],
  [80, [0.3, -0.3, 0.9]],
  [140, [0.1, -1, 0.4]],
  [275, [0.15, -1, 0.3]],
  [305, [0.65, -0.45, -0.35]],
  [328, [0.6, 0.55, -0.05]],
  [352, [0.25, 0.8, 0.55]],
];
const FREE_FORE: [number, D3][] = [
  [2, [0.05, -1, 0.2]],
  [30, [0.15, 0.95, 0.3]],
  [80, [0.2, 0.2, 0.95]],
  [140, [0.1, -1, 0.35]],
  [275, [0.15, -1, 0.3]],
  [305, [0.45, 0.5, -0.5]],
  [328, [-0.15, 0.95, 0.05]],
  [352, [0.25, 0.8, 0.55]],
];

// How far the body has turned about the hanging arm, in radians, by trunk
// angle: none in the hang, half a turn by the time the hips reach the bar,
// and it stays turned: the body finishes on top facing the other way.
function twistAt(torso: number): number {
  const keys: [number, number][] = [
    [70, 0],
    [110, 50],
    [150, 140],
    [185, 180],
  ];
  if (torso <= keys[0][0]) return 0;
  for (let i = 1; i < keys.length; i++) {
    const [t1, a1] = keys[i];
    const [t0, a0] = keys[i - 1];
    if (torso <= t1) {
      const s = (torso - t0) / (t1 - t0);
      return ((a0 + (a1 - a0) * s * s * (3 - 2 * s)) * Math.PI) / 180;
    }
  }
  return Math.PI;
}

export function model3d(slug: string): Model | null {
  const stage = STAGES[slug];
  if (!stage) return null;
  const spec = SPECS.find((s) => animationSlug(s.name) === slug);
  if (!spec) return null;
  const oneArm = Boolean(stage.oneArm);
  // The bar hand is the person's left in the reel, so the near arm of the
  // drawing (the one that holds the bar) goes on the left side, -z.
  const bar = oneArm ? -1 : 1;
  const free = -bar;

  const frames: ModelFrame[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const { pose } = spec.motion(i / SAMPLES);
    const j = joints(pose);
    const t = pose.torso;
    // How much of a one-arm hang this is: the body hangs under the hand and
    // the bar-side shoulder rides up. Gone once the hips reach the bar.
    const hang = oneArm ? clamp01((170 - t) / 60) : 0;
    // Once on top, the bar hand sits beside the hip rather than over the head:
    // the body moves away from the hand, which stays where it grips.
    const onTop = oneArm ? clamp01((t - 190) / 60) : 0;
    const shift = bar * (4 * hang - 9 * onTop);

    const handZ = oneArm ? bar * 4 : bar * (SHOULDER + 3);
    const shoulderBarZ = bar * SHOULDER + shift;
    const handN = gripPoint(j, pose.armN, "N");
    // Lift the bar-side shoulder, drop the other: shoulders and trunk both
    // tilt under a single hand.
    const up = (q: V, dy: number) => add(q, v(0, -dy));

    const f: ModelFrame = {
      torso: Math.round(t * 10) / 10,
      shoulderN: at(up(j.shoulder, 4 * hang), shoulderBarZ),
      shoulderF: at(up(j.shoulder, -3 * hang), free * SHOULDER + shift),
      hipN: at(j.hip, bar * HIP + shift),
      hipF: at(j.hip, free * HIP + shift),
      hip: at(j.hip, shift),
      lumbar: at(j.lumbar, shift),
      neck: at(j.neck, shift),
      head: at(add(j.neck, rot(v(2, -11), pose.head)), shift),
      face: at(add(j.neck, rot(v(11, -12), pose.head)), shift),
      elbowN: at(j.elbowN, (shoulderBarZ + handZ) / 2 + bar * 3),
      wristN: at(j.wristN, handZ),
      handN: at(handN, handZ),
      elbowF: at(j.elbowF, free * (SHOULDER + 2) + shift),
      wristF: at(j.wristF, free * (SHOULDER + 3) + shift),
      handF: at(gripPoint(j, pose.armF, "F"), free * (SHOULDER + 3) + shift),
      kneeN: at(j.kneeN, bar * (HIP + 1) + shift),
      ankleN: at(j.ankleN, bar * HIP + shift),
      toeN: at(add(j.ankleN, rot(v(15, 6), pose.legN.end)), bar * (HIP + 1) + shift),
      kneeF: at(j.kneeF, free * (HIP + 1) + shift),
      ankleF: at(j.ankleF, free * HIP + shift),
      toeF: at(add(j.ankleF, rot(v(15, 6), pose.legF.end)), free * (HIP + 1) + shift),
    };

    if (oneArm) {
      // The free arm, built in 3D from its shoulder.
      const toWorld = ([fw, upw, out]: D3): D3 => [fw, -upw, out * free];
      const u = toWorld(dirAt(t, FREE_UPPER));
      const l = toWorld(dirAt(t, FREE_FORE));
      const s = f.shoulderF;
      const elbow: D3 = [s[0] + u[0] * LEN.upperArm, s[1] + u[1] * LEN.upperArm, s[2] + u[2] * LEN.upperArm];
      const wrist: D3 = [elbow[0] + l[0] * LEN.forearm, elbow[1] + l[1] * LEN.forearm, elbow[2] + l[2] * LEN.forearm];
      const hand: D3 = [wrist[0] + l[0] * LEN.grip, wrist[1] + l[1] * LEN.grip, wrist[2] + l[2] * LEN.grip];
      f.elbowF = elbow.map(r2) as ModelPoint;
      f.wristF = wrist.map(r2) as ModelPoint;
      f.handF = hand.map(r2) as ModelPoint;
    }
    if (oneArm) {
      // The twist round the arm (1.5–2.5 s in the reel): while piked and
      // rolling back, the whole body turns about the line of the hanging arm,
      // so the straight legs sweep out sideways along the bar and past the
      // arm, half a turn, before the hips come onto the bar from that side.
      const turn = twistAt(t);
      if (turn) {
        const c = Math.cos(turn);
        const sn = Math.sin(turn);
        const ax = stage.bar.x;
        const az = handZ;
        for (const k of Object.keys(f) as (keyof ModelFrame)[]) {
          if (k === "torso") continue;
          const q = f[k];
          const x = q[0] - ax;
          const z = q[2] - az;
          // Forward (+x) swings toward the bar-hand side first.
          f[k] = [r2(ax + x * c + z * sn * -bar), q[1], r2(az + -x * sn * -bar + z * c)];
        }
      }
    }
    frames.push(f);
  }
  return { mode: spec.mode, seconds: spec.seconds, frames };
}

export const model3dSlugs = () => Object.keys(STAGES);
