// Server side of the 3D views: sample a spec's motion into joint positions.
// The browser lifts them into 3D (src/components/Exercise3D.tsx).

import { add, gripPoint, joints, rot, v, type V } from "./rig";
import { SPECS } from "./exercises";
import { animationSlug } from "./slug";
import { THREE_D_SLUGS, type Model, type ModelFrame, type ModelPoint } from "./three-d";

const SAMPLES = 72;
const pt = (q: V): ModelPoint => [Math.round(q.x * 100) / 100, Math.round(q.y * 100) / 100];

export function model3d(slug: string): Model | null {
  if (!THREE_D_SLUGS.includes(slug)) return null;
  const spec = SPECS.find((s) => animationSlug(s.name) === slug);
  if (!spec) return null;
  const frames: ModelFrame[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const { pose } = spec.motion(i / SAMPLES);
    const j = joints(pose);
    frames.push({
      torso: Math.round(pose.torso * 10) / 10,
      hip: pt(j.hip),
      lumbar: pt(j.lumbar),
      shoulder: pt(j.shoulder),
      neck: pt(j.neck),
      head: pt(add(j.neck, rot(v(2, -11), pose.head))),
      face: pt(add(j.neck, rot(v(11, -12), pose.head))),
      elbowN: pt(j.elbowN),
      wristN: pt(j.wristN),
      handN: pt(gripPoint(j, pose.armN, "N")),
      elbowF: pt(j.elbowF),
      wristF: pt(j.wristF),
      handF: pt(gripPoint(j, pose.armF, "F")),
      kneeN: pt(j.kneeN),
      ankleN: pt(j.ankleN),
      toeN: pt(add(j.ankleN, rot(v(15, 6), pose.legN.end))),
      kneeF: pt(j.kneeF),
      ankleF: pt(j.ankleF),
      toeF: pt(add(j.ankleF, rot(v(15, 6), pose.legF.end))),
    });
  }
  return { mode: spec.mode, seconds: spec.seconds, frames };
}

export const model3dSlugs = () => THREE_D_SLUGS;
