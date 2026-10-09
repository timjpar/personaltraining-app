// Turns an exercise spec into a self-contained animated SVG.
//
// Each body part and each moving prop is its own <g> with a CSS keyframe
// animation of `translate(joint) rotate(angle)`. Flat rather than nested
// transforms so z-order is free (the near arm over the near leg, a plate over
// both), and a part that doesn't move — a planted foot — has identical
// keyframes and so stays perfectly still. Between samples a moving joint can
// drift a fraction of a unit from its parent; the round ends of every part
// hide that.
//
// Symmetric movements sample half a rep and play it `alternate`, which halves
// the keyframes and makes the way down the exact mirror of the way up.
//
// Every drawing is defined once in <defs> and placed with <use>: near and far
// limbs share art and differ only in the CSS custom properties they inherit,
// which is what keeps a file to a few KB.

import { BACK, FRONT } from "./body-front";
import { SIDE, type Layer, type Muscle, type PartArt } from "./body-side";
import { add, ease, frontJoints, joints, rot, v, type Limb, type Pose, type V } from "./rig";

export type HandShape = "hand" | "fist" | "palm";
export type View = "side" | "front" | "back";

// A drawing in local coordinates (origin at its attachment point), optionally
// animated by a per-frame position and angle.
export type Drawing = { svg: string; box: [number, number, number, number] };

export type PropState = { at: V; angle?: number; scaleX?: number };

export type Frame = { pose: Pose; props?: Record<string, PropState> };

export type Layering = "back" | "mid" | "front";

export type Prop = { id: string; draw: Drawing; layer: Layering };
export type SceneItem = { draw: Drawing; layer: Layering };

export type Spec = {
  name: string;
  // Other catalog names that are drawn exactly the same way.
  aka?: string[];
  view?: View;
  // Phase 0 → 1 of one rep for `alternate`, or one full cycle for `loop`.
  motion: (p: number) => Frame;
  mode: "alternate" | "loop";
  seconds: number; // one full rep, there and back
  samples?: number;
  hands?: { N: HandShape; F?: HandShape };
  primary: Muscle[];
  secondary?: Muscle[];
  scene?: SceneItem[];
  props?: Prop[];
  // The phase drawn when motion is off, and the one a still thumbnail shows.
  still?: number;
  // Side view: shift the far limbs by this much to suggest depth.
  depth?: V;
  // Paint the whole picture this colour (a climbing wall) instead of the
  // plain plate, and whether to draw the floor; by default the floor appears
  // whenever the movement reaches the ground.
  backdrop?: string;
  floor?: boolean;
};

// One drawn body part in one frame.
type Piece = { key: string; at: V; angle: number; k?: number; art: PartArt; far?: boolean; mirror?: boolean; pair?: boolean };

// --- Layout --------------------------------------------------------------------

function sidePieces(p: Pose, hands: Spec["hands"], depth: V): Piece[] {
  const j = joints(p);
  const far = (q: V) => add(q, depth);
  const handN = SIDE[hands?.N ?? "hand"];
  const handF = SIDE[hands?.F ?? hands?.N ?? "hand"];
  const arm = (l: Limb, s: "N" | "F"): Piece[] => {
    const f = s === "F";
    const sh = f ? far(j.shoulder) : j.shoulder;
    const el = f ? far(j.elbowF) : j.elbowN;
    const wr = f ? far(j.wristF) : j.wristN;
    return [
      { key: `hand${s}`, at: wr, angle: l.end, k: l.ke, art: f ? handF : handN, far: f },
      { key: `forearm${s}`, at: el, angle: l.lower, k: l.kl, art: SIDE.forearm, far: f },
      { key: `upperArm${s}`, at: sh, angle: l.upper, k: l.ku, art: SIDE.upperArm, far: f },
    ];
  };
  const leg = (l: Limb, s: "N" | "F"): Piece[] => {
    const f = s === "F";
    const hip = f ? far(j.hip) : j.hip;
    const kn = f ? far(j.kneeF) : j.kneeN;
    const an = f ? far(j.ankleF) : j.ankleN;
    return [
      { key: `foot${s}`, at: an, angle: l.end, k: l.ke, art: SIDE.foot, far: f },
      { key: `shin${s}`, at: kn, angle: l.lower, k: l.kl, art: SIDE.shin, far: f },
      { key: `thigh${s}`, at: hip, angle: l.upper, k: l.ku, art: SIDE.thigh, far: f },
    ];
  };
  return [
    ...arm(p.armF, "F"),
    ...leg(p.legF, "F"),
    { key: "head", at: j.neck, angle: p.head, art: SIDE.head },
    { key: "torso", at: j.lumbar, angle: p.torso, art: SIDE.torso },
    { key: "pelvis", at: j.hip, angle: p.pelvis, art: SIDE.pelvis },
    ...leg(p.legN, "N"),
    ...arm(p.armN, "N"),
  ];
}

function squarePieces(p: Pose, hands: Spec["hands"], back: boolean): Piece[] {
  const j = frontJoints(p);
  const A = back ? BACK : FRONT;
  const hand = (s: "N" | "F") => A[(s === "N" ? hands?.N : (hands?.F ?? hands?.N)) === "fist" ? "fist" : "hand"];
  const leg = (l: Limb, s: "N" | "F"): Piece[] => {
    const m = s === "F";
    return [
      { key: `foot${s}`, at: m ? j.ankleF : j.ankleN, angle: l.end, k: l.ke, art: A.foot, mirror: m },
      { key: `shin${s}`, at: m ? j.kneeF : j.kneeN, angle: l.lower, k: l.kl, art: A.shin, mirror: m },
      { key: `thigh${s}`, at: m ? j.hipF : j.hip, angle: l.upper, k: l.ku, art: A.thigh, mirror: m },
    ];
  };
  const arm = (l: Limb, s: "N" | "F"): Piece[] => {
    const m = s === "F";
    return [
      { key: `hand${s}`, at: m ? j.wristF : j.wristN, angle: l.end, k: l.ke, art: hand(s), mirror: m },
      { key: `forearm${s}`, at: m ? j.elbowF : j.elbowN, angle: l.lower, k: l.kl, art: A.forearm, mirror: m },
      { key: `upperArm${s}`, at: m ? j.shoulderF : j.shoulder, angle: l.upper, k: l.ku, art: A.upperArm, mirror: m },
    ];
  };
  const hipRoot = p.hip;
  return [
    ...leg(p.legF, "F"),
    ...leg(p.legN, "N"),
    { key: "pelvis", at: hipRoot, angle: p.pelvis, art: A.pelvis, pair: true },
    { key: "torso", at: j.lumbar, angle: p.torso, art: A.torso, pair: true },
    { key: "head", at: j.neck, angle: p.head, art: A.head },
    ...arm(p.armF, "F"),
    ...arm(p.armN, "N"),
  ];
}

function pieces(spec: Spec, pose: Pose): Piece[] {
  const view = spec.view ?? "side";
  if (view === "side") return sidePieces(pose, spec.hands, spec.depth ?? v(-2.2, -1));
  return squarePieces(pose, spec.hands, view === "back");
}

// --- Geometry helpers --------------------------------------------------------

function points(d: string): V[] {
  const n = (d.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
  const out: V[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push(v(n[i], n[i + 1]));
  return out;
}

// The silhouette of a piece, relative to its joint, mirrored and paired as
// drawn.
function outline(pc: Piece): V[] {
  const k = pc.k ?? 1;
  const pts = points(pc.art.layers[0].d).map((q) => v(q.x - pc.art.joint.x, (q.y - pc.art.joint.y) * k));
  const mirrored = pc.mirror ? pts.map((q) => v(-q.x, q.y)) : pts;
  return pc.pair ? [...mirrored, ...mirrored.map((q) => v(-q.x, q.y))] : mirrored;
}

type Box = { x0: number; y0: number; x1: number; y1: number };
const grow = (b: Box, q: V) => {
  b.x0 = Math.min(b.x0, q.x);
  b.y0 = Math.min(b.y0, q.y);
  b.x1 = Math.max(b.x1, q.x);
  b.y1 = Math.max(b.y1, q.y);
};

const r1 = (n: number) => {
  const s = (Math.round(n * 10) / 10).toFixed(1);
  const t = s.endsWith(".0") ? s.slice(0, -2) : s;
  return t === "-0" ? "0" : t;
};

type Placement = { at: V; angle?: number; scaleX?: number; k?: number };

const r3 = (n: number) => Math.round(n * 1000) / 1000;

// `scaled` keeps every keyframe of a track the same shape: CSS interpolates
// transform lists function by function, so if any frame foreshortens, all of
// them carry a scale.
const tf = (q: Placement, scaled = false) =>
  `translate(${r1(q.at.x)}px,${r1(q.at.y)}px) rotate(${r1(-(q.angle ?? 0))}deg)` +
  (q.scaleX !== undefined ? ` scaleX(${r3(q.scaleX)})` : "") +
  (scaled ? ` scaleY(${r3(q.k ?? 1)})` : "");

const tfAttr = (q: Placement) =>
  `translate(${r1(q.at.x)} ${r1(q.at.y)}) rotate(${r1(-(q.angle ?? 0))})` +
  (q.scaleX !== undefined ? ` scale(${r3(q.scaleX)} 1)` : "") +
  (q.k !== undefined && q.k !== 1 ? ` scale(1 ${r3(q.k)})` : "");

// --- Drawing ---------------------------------------------------------------------

function artSvg(art: PartArt, primary: Set<Muscle>, secondary: Set<Muscle>): string {
  const cls = (l: Layer, i: number) => {
    if (i === 0) return "b";
    if (l.line) return "ln";
    if (l.m && primary.has(l.m)) return "m mp";
    if (l.m && secondary.has(l.m)) return "m ms";
    return "m";
  };
  const shift = `translate(${r1(-art.joint.x)} ${r1(-art.joint.y)})`;
  const body = art.layers.map((l, i) => `<path class="${cls(l, i)}" d="${l.d}"/>`).join("");
  // The silhouette once more on top, unfilled, so the outline sits over the
  // muscle fills rather than under them.
  return `<g transform="${shift}">${body}<path class="ol" d="${art.layers[0].d}"/></g>`;
}

const STYLE = `
svg{--b:url(#skin);--m:#d4dad7;--mp:url(#mp);--ms:#f0a493;--mps:#a92a22;--mss:#cf7c6a}
.far{--b:url(#skinf);--m:#bcc3c0;--mp:url(#mpf);--ms:#dc8f7e}
.plate{fill:#f4f6f5}
.floor{fill:#dfe4e2}
.b{fill:var(--b)}
.m{fill:var(--m);stroke:#b9c0bd;stroke-width:.3}
.mp{fill:var(--mp);stroke:var(--mps)}
.ms{fill:var(--ms);stroke:var(--mss)}
.ln{fill:none;stroke:#a3aca8;stroke-width:.4;stroke-linecap:round}
.ol{fill:none;stroke:#7a8481;stroke-width:.55;stroke-linejoin:round}
.steel{fill:#8c9693;stroke:#55605c;stroke-width:.6}
.iron{fill:#3a413e;stroke:#232826;stroke-width:.8}
.farp{fill:#59615e;stroke:#3e4542;stroke-width:.8}
.ghost{fill:#3a413e;fill-opacity:.07;stroke:#3a413e;stroke-opacity:.6;stroke-width:1.1}
.pad{fill:#3d4542;stroke:#262b29;stroke-width:.8}
.frame{fill:#b4bcb9;stroke:#7c8582;stroke-width:.7}
.cable{fill:none;stroke:#3a413e;stroke-width:.8;vector-effect:non-scaling-stroke}
.wood{fill:#c99a62;stroke:#8d6539;stroke-width:.7}
.wall{fill:#cfc6b8;stroke:#a89d8c;stroke-width:.6}
.hold{fill:#e8a33a;stroke:#9c6614;stroke-width:.6}
.mat{fill:#5c8f86;stroke:#3d6760;stroke-width:.7}
.band{fill:none;stroke:#d9534f;stroke-width:1.6;stroke-linecap:round}
.a{transform-box:view-box;transform-origin:0 0}
@media (prefers-reduced-motion:reduce){.a{animation:none!important}}
`;

const GRADIENTS = `<linearGradient id="skin" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#e7ebe9"/><stop offset=".55" stop-color="#d9dedc"/><stop offset="1" stop-color="#c7cecb"/></linearGradient>
<linearGradient id="skinf" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#cdd3d0"/><stop offset="1" stop-color="#b6bdba"/></linearGradient>
<linearGradient id="mp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0574a"/><stop offset="1" stop-color="#c8322a"/></linearGradient>
<linearGradient id="mpf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d64a3f"/><stop offset="1" stop-color="#a92a22"/></linearGradient>`;

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Keep an angle within 180° of the one before it, so a part never spins the
// long way round between two samples.
function unwrap(prev: number | undefined, a: number) {
  if (prev === undefined) return a;
  while (a - prev > 180) a -= 360;
  while (a - prev < -180) a += 360;
  return a;
}

export function renderSvg(spec: Spec, opts: { freezeAt?: number } = {}): string {
  const n = spec.samples ?? (spec.mode === "alternate" ? 8 : 16);
  const primary = new Set(spec.primary);
  const secondary = new Set(spec.secondary ?? []);
  const stillPhase = opts.freezeAt ?? spec.still ?? 0;
  const animate = opts.freezeAt === undefined;

  // Sample the motion.
  const phases: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    phases.push(spec.mode === "alternate" ? ease(t) : t);
  }
  const frames = phases.map((p) => spec.motion(p));
  const still = spec.motion(stillPhase);
  const tracks = frames.map((f) => pieces(spec, f.pose));
  const stillPieces = pieces(spec, still.pose);
  const keys = tracks[0].map((pc) => pc.key);

  // Unwrap every angle track.
  for (let k = 0; k < keys.length; k++) {
    let prev: number | undefined;
    for (const t of tracks) {
      t[k].angle = unwrap(prev, t[k].angle);
      prev = t[k].angle;
    }
  }
  for (const prop of spec.props ?? []) {
    let prev: number | undefined;
    for (const f of frames) {
      const s = f.props?.[prop.id];
      if (!s) continue;
      s.angle = unwrap(prev, s.angle ?? 0);
      prev = s.angle;
    }
  }

  // Frame the whole movement.
  const box: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const t of tracks) {
    for (const pc of t) for (const q of outline(pc)) grow(box, add(pc.at, rot(q, pc.angle)));
  }
  for (const f of frames) {
    for (const prop of spec.props ?? []) {
      const s = f.props?.[prop.id];
      if (!s) continue;
      const [x0, y0, x1, y1] = prop.draw.box;
      for (const q of [v(x0, y0), v(x1, y0), v(x0, y1), v(x1, y1)]) {
        grow(box, add(s.at, rot(v(q.x * (s.scaleX ?? 1), q.y), s.angle ?? 0)));
      }
    }
  }
  for (const item of spec.scene ?? []) {
    const [x0, y0, x1, y1] = item.draw.box;
    grow(box, v(x0, y0));
    grow(box, v(x1, y1));
  }
  const pad = 10;
  const w = box.x1 - box.x0 + pad * 2;
  const h = box.y1 - box.y0 + pad * 2;
  const size = Math.max(w, h);
  const vx = box.x0 - pad - (size - w) / 2;
  const vy = box.y0 - pad - (size - h) / 2;

  // Timing: alternate holds briefly at each end of the rep.
  const hold = spec.mode === "alternate" ? 0.1 : 0;
  const pct = (i: number) => `${Math.round((hold + (1 - 2 * hold) * (i / n)) * 1000) / 10}%`;
  const dur = spec.mode === "alternate" ? spec.seconds / 2 : spec.seconds;
  const anim = (k: string) =>
    animate ? `animation:${k} ${dur}s linear infinite${spec.mode === "alternate" ? " alternate" : ""}` : "";

  const keyframes: string[] = [];
  let kn = 0;
  const track = (states: Placement[]) => {
    const name = `k${kn++}`;
    if (!animate) return name;
    const scaled = states.some((s) => s.k !== undefined && s.k !== 1);
    const steps = states.map((s, i) => `${pct(i)}{transform:${tf(s, scaled)}}`);
    if (hold > 0) {
      steps.unshift(`0%{transform:${tf(states[0], scaled)}}`);
      steps.push(`100%{transform:${tf(states[states.length - 1], scaled)}}`);
    }
    keyframes.push(`@keyframes ${name}{${steps.join("")}}`);
    return name;
  };

  // Each distinct drawing once.
  const defs = new Map<PartArt, string>();
  const ref = (art: PartArt) => {
    let id = defs.get(art);
    if (!id) {
      id = `p${defs.size}`;
      defs.set(art, id);
    }
    return id;
  };

  const layers: Record<Layering, string[]> = { back: [], mid: [], front: [] };
  for (const item of spec.scene ?? []) layers[item.layer].push(item.draw.svg);
  for (const prop of spec.props ?? []) {
    const states = frames.map((f) => f.props?.[prop.id] ?? { at: v(0, 0) });
    const s0 = still.props?.[prop.id] ?? states[0];
    const name = track(states);
    layers[prop.layer].push(`<g class="a" transform="${tfAttr(s0)}" style="${anim(name)}">${prop.draw.svg}</g>`);
  }

  const body: string[] = [];
  keys.forEach((key, k) => {
    const pc = stillPieces[k];
    const name = track(tracks.map((t) => t[k]));
    const id = ref(pc.art);
    const use = pc.pair
      ? `<use href="#${id}"/><use href="#${id}" transform="scale(-1 1)"/>`
      : pc.mirror
        ? `<use href="#${id}" transform="scale(-1 1)"/>`
        : `<use href="#${id}"/>`;
    body.push(
      `<g class="a${pc.far ? " far" : ""}" transform="${tfAttr(pc)}" style="${anim(name)}">${use}</g>`,
    );
    // Mid-layer props sit between the trunk and the near limbs.
    if (key === "pelvis" && (spec.view ?? "side") === "side") body.push(...layers.mid);
    if (key === "head" && (spec.view ?? "side") !== "side") body.push(...layers.mid);
  });

  const artDefs = [...defs].map(([art, id]) => `<g id="${id}">${artSvg(art, primary, secondary)}</g>`).join("");

  const floor =
    (spec.floor ?? box.y1 >= -2)
      ? `<rect class="floor" x="${r1(vx)}" y="0" width="${r1(size)}" height="${r1(Math.max(0, vy + size))}"/>`
      : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r1(vx)} ${r1(vy)} ${r1(size)} ${r1(size)}" role="img" aria-label="${xmlEscape(spec.name)}">`,
    `<defs>${GRADIENTS}${artDefs}</defs>`,
    `<style>${STYLE}${keyframes.join("")}</style>`,
    `<rect class="plate" x="${r1(vx)}" y="${r1(vy)}" width="${r1(size)}" height="${r1(size)}"${spec.backdrop ? ` style="fill:${spec.backdrop}"` : ""}/>`,
    floor,
    ...layers.back,
    ...body,
    ...layers.front,
    `</svg>`,
  ].join("");
}
