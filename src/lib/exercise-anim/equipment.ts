// Equipment, drawn side-on to match the athlete.
//
// Props (things that move with the athlete) are drawn around their own origin
// — the grip point for anything held — and placed per frame by the motion.
// Scene pieces (things that stay put) are drawn in world coordinates.

import type { Drawing } from "./render";
import type { V } from "./rig";

const n = (x: number) => Math.round(x * 10) / 10;

// A loaded barbell seen end-on, split in two so the athlete sits between the
// plates: the far plate solid behind the body, the near one an outline the
// body shows through — a solid near plate would hide the very muscles the
// drawing is about.
const FAR_PLATE = { x: -6.5, y: -3 };

export function barbellFar(radius = 22): Drawing {
  const { x, y } = FAR_PLATE;
  return {
    svg:
      `<circle class="farp" cx="${x}" cy="${y}" r="${radius}"/>` +
      `<circle fill="none" stroke="#79827f" stroke-width=".6" cx="${x}" cy="${y}" r="${n(radius * 0.72)}"/>`,
    box: [x - radius, y - radius, x + radius, y + radius],
  };
}

export function barbellNear(radius = 22): Drawing {
  const { x, y } = FAR_PLATE;
  return {
    svg:
      `<path class="steel" stroke-width=".5" d="M0 0L${x} ${y}" style="stroke-width:3.4;stroke:#6f7976"/>` +
      `<circle class="ghost" r="${radius}"/>` +
      `<circle class="steel" r="5.2"/><circle class="iron" r="2.2"/>`,
    box: [-radius, -radius, radius, radius],
  };
}

// A dumbbell seen end-on: one hex head.
export function dumbbellEnd(r = 7): Drawing {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${n(Math.cos(a) * r)},${n(Math.sin(a) * r)}`;
  }).join(" ");
  return {
    svg: `<polygon class="iron" points="${pts}"/><circle fill="none" stroke="#5b6461" stroke-width=".6" r="${n(r * 0.45)}"/>`,
    box: [-r, -r, r, r],
  };
}

// A dumbbell lying in the plane of the drawing, handle through the fist.
export function dumbbellSide(): Drawing {
  return {
    svg:
      `<rect class="steel" x="-10" y="-1.4" width="20" height="2.8" rx="1"/>` +
      `<rect class="iron" x="-17" y="-6.5" width="7.5" height="13" rx="2"/>` +
      `<rect class="iron" x="9.5" y="-6.5" width="7.5" height="13" rx="2"/>`,
    box: [-17, -6.5, 17, 6.5],
  };
}

// A cable, drawn as a unit line along +x and stretched by the frame's scaleX.
export function cable(): Drawing {
  return { svg: `<path class="cable" d="M0 0H1"/>`, box: [0, -0.5, 1, 0.5] };
}

// The end of a straight cable bar, under the fist.
export function cableBarEnd(): Drawing {
  return { svg: `<circle class="steel" r="2.4"/>`, box: [-2.4, -2.4, 2.4, 2.4] };
}

export function flatBench(x0: number, x1: number, top: number): Drawing {
  const legs = [x0 + 12, x1 - 12]
    .map(
      (x) =>
        `<rect class="frame" x="${n(x - 2)}" y="${n(top + 7)}" width="4" height="${n(-top - 9)}"/>` +
        `<rect class="frame" x="${n(x - 9)}" y="-3" width="18" height="3" rx="1"/>`,
    )
    .join("");
  return {
    svg: legs + `<rect class="pad" x="${x0}" y="${top}" width="${x1 - x0}" height="7" rx="3"/>`,
    box: [x0, top, x1, 0],
  };
}

// Bench-press uprights behind the bench, hooks at `hook`.
export function benchUprights(x: number, hook: number): Drawing {
  return {
    svg:
      `<rect class="frame" x="${n(x - 2.5)}" y="${n(hook - 14)}" width="5" height="${n(-hook + 14)}"/>` +
      `<path class="frame" d="M${n(x + 2.5)} ${n(hook - 1)}h6v5h-2.5v-2.4h-3.5Z"/>`,
    box: [x - 2.5, hook - 14, x + 8.5, 0],
  };
}

// A cable tower standing at x, pulley wheel at `pulley`.
export function cableTower(x: number, pulley: V): Drawing {
  const top = Math.min(pulley.y - 14, -60);
  return {
    svg:
      `<rect class="frame" x="${x}" y="${n(top)}" width="12" height="${n(-top)}" rx="1.5"/>` +
      `<rect class="frame" x="${n(x - 4)}" y="-3" width="20" height="3" rx="1"/>` +
      `<path class="frame" d="M${x} ${n(pulley.y - 4)}L${n(pulley.x)} ${n(pulley.y - 4)}L${n(pulley.x)} ${n(pulley.y + 4)}L${x} ${n(pulley.y + 4)}Z"/>` +
      `<circle class="steel" cx="${n(pulley.x)}" cy="${n(pulley.y)}" r="3.6"/>`,
    box: [Math.min(x - 4, pulley.x - 4), top, x + 16, 0],
  };
}

// A pull-up bar seen end-on, with the bracket it hangs from.
export function pullUpBar(at: V): Drawing {
  return {
    svg:
      `<path class="frame" d="M${n(at.x - 1.6)} ${n(at.y)}L${n(at.x - 1.6)} ${n(at.y - 26)}L${n(at.x + 1.6)} ${n(at.y - 26)}L${n(at.x + 1.6)} ${n(at.y)}Z"/>` +
      `<circle class="steel" cx="${n(at.x)}" cy="${n(at.y)}" r="2.6"/>`,
    box: [at.x - 3, at.y - 26, at.x + 3, at.y + 3],
  };
}

// A pull-up bar across the picture, for the square-on views.
export function pullUpBarAcross(y: number, half = 48): Drawing {
  return {
    svg:
      `<rect class="frame" x="${-half - 3}" y="${n(y - 30)}" width="4" height="30"/>` +
      `<rect class="frame" x="${half - 1}" y="${n(y - 30)}" width="4" height="30"/>` +
      `<rect class="steel" x="${-half}" y="${n(y - 1.6)}" width="${half * 2}" height="3.2" rx="1.6"/>`,
    box: [-half - 3, y - 30, half + 3, y + 2],
  };
}

// --- Free weights, continued --------------------------------------------------

// A kettlebell hanging from its handle, which is the grip point.
export function kettlebell(): Drawing {
  return {
    svg:
      `<path class="iron" d="M-5 1.5C-6 -3 -4.5 -6 0 -6C4.5 -6 6 -3 5 1.5" fill="none" style="fill:none;stroke-width:2.2"/>` +
      `<circle class="iron" cx="0" cy="9" r="8.2"/>` +
      `<path d="M-3.6 4.6C-1.8 3.4 1.8 3.4 3.6 4.6" fill="none" stroke="#5b6461" stroke-width=".6"/>`,
    box: [-8.2, -7, 8.2, 17.2],
  };
}

// A kettlebell held upside-down by the horns at the chest (goblet): the grip
// point is the middle of the handle, bell up.
export function kettlebellGoblet(): Drawing {
  return {
    svg:
      `<circle class="iron" cx="0" cy="-8.5" r="8.2"/>` +
      `<path class="iron" d="M-5 -1.5C-6 3 -4.5 6 0 6C4.5 6 6 3 5 -1.5" style="fill:none;stroke-width:2.2"/>`,
    box: [-8.2, -16.7, 8.2, 7],
  };
}

// A dumbbell held on end against the chest (goblet), grip at the top head.
export function dumbbellGoblet(): Drawing {
  return {
    svg:
      `<rect class="steel" x="-1.4" y="-2" width="2.8" height="18" rx="1"/>` +
      `<rect class="iron" x="-7" y="-6" width="14" height="6.5" rx="2"/>` +
      `<rect class="iron" x="-7" y="13" width="14" height="6.5" rx="2"/>`,
    box: [-7, -6, 7, 19.5],
  };
}

export function medBall(r = 9): Drawing {
  return {
    svg: `<circle cx="0" cy="0" r="${r}" fill="#6d5a8c" stroke="#43365a" stroke-width=".8"/><path d="M${-r} 0C${-r / 2} ${r / 3} ${r / 2} ${r / 3} ${r} 0" fill="none" stroke="#43365a" stroke-width=".6"/>`,
    box: [-r, -r, r, r],
  };
}

// --- Benches, boxes, steps ----------------------------------------------------

export function box(x0: number, x1: number, top: number, cls = "wood"): Drawing {
  return {
    svg: `<rect class="${cls}" x="${n(x0)}" y="${n(top)}" width="${n(x1 - x0)}" height="${n(-top)}" rx="1.5"/>`,
    box: [x0, top, x1, 0],
  };
}

export function step(x0: number, x1: number, top: number): Drawing {
  return box(x0, x1, top, "frame");
}

// A seat with an upright back pad, for machines and seated presses.
export function seat(x0: number, x1: number, top: number, backTop?: number): Drawing {
  const backPad =
    backTop === undefined
      ? ""
      : `<rect class="pad" x="${n(x0 - 7)}" y="${n(backTop)}" width="7" height="${n(top - backTop + 4)}" rx="3"/>`;
  return {
    svg:
      `<rect class="frame" x="${n((x0 + x1) / 2 - 2.5)}" y="${n(top + 6)}" width="5" height="${n(-top - 8)}"/>` +
      `<rect class="frame" x="${n((x0 + x1) / 2 - 14)}" y="-3" width="28" height="3" rx="1"/>` +
      backPad +
      `<rect class="pad" x="${n(x0)}" y="${n(top)}" width="${n(x1 - x0)}" height="7" rx="3"/>`,
    box: [x0 - 7, backTop ?? top, x1, 0],
  };
}

export function mat(x0: number, x1: number): Drawing {
  return { svg: `<rect class="mat" x="${n(x0)}" y="-1.6" width="${n(x1 - x0)}" height="1.8" rx=".8"/>`, box: [x0, -2, x1, 0] };
}

// --- Machines ---------------------------------------------------------------

// A pad seen end-on (the roller on a leg extension or curl), drawn around its
// own centre.
export function roller(r = 4.5): Drawing {
  return { svg: `<circle class="pad" r="${r}"/><circle class="steel" r="1.2"/>`, box: [-r, -r, r, r] };
}

// The carriage of a 45° leg press: a footplate on a sled, drawn around the
// middle of the plate, which runs along the rail.
export function legPressSled(angle = 45): Drawing {
  return {
    svg:
      `<g transform="rotate(${-angle})"><rect class="iron" x="-3" y="-16" width="6" height="32" rx="1.5"/><rect class="frame" x="3" y="-10" width="16" height="20" rx="2"/>` +
      `<rect class="steel" x="10" y="-15" width="4" height="30" rx="1"/></g>`,
    box: [-18, -18, 18, 18],
  };
}

export function legPressFrame(from: V, angle = 45, length = 150): Drawing {
  const r = (angle * Math.PI) / 180;
  const to = { x: from.x + Math.cos(r) * length, y: from.y - Math.sin(r) * length };
  return {
    svg:
      `<path class="frame" d="M${n(from.x)} ${n(from.y)}L${n(to.x)} ${n(to.y)}L${n(to.x + 6)} ${n(to.y + 4)}L${n(from.x + 6)} ${n(from.y + 4)}Z"/>` +
      `<rect class="frame" x="${n(to.x - 2)}" y="${n(to.y)}" width="5" height="${n(-to.y)}"/>` +
      `<rect class="frame" x="${n(from.x - 30)}" y="-4" width="${n(to.x - from.x + 40)}" height="4" rx="1"/>`,
    box: [from.x - 30, to.y - 4, to.x + 10, 0],
  };
}

// A hyperextension bench: hip pad on a 45° frame, ankle rollers at the foot.
export function hyperBench(hipPad: V, ankle: V): Drawing {
  return {
    svg:
      `<path class="frame" d="M${n(ankle.x - 4)} 0L${n(ankle.x - 4)} ${n(ankle.y + 2)}L${n(hipPad.x + 6)} ${n(hipPad.y + 8)}L${n(hipPad.x + 10)} ${n(hipPad.y + 12)}L${n(hipPad.x + 10)} 0Z" style="fill-opacity:.9"/>` +
      `<rect class="pad" x="${n(hipPad.x - 2)}" y="${n(hipPad.y - 4)}" width="14" height="8" rx="3.5" transform="rotate(-40 ${n(hipPad.x + 5)} ${n(hipPad.y)})"/>` +
      `<circle class="pad" cx="${n(ankle.x + 2)}" cy="${n(ankle.y - 6)}" r="3.6"/><circle class="pad" cx="${n(ankle.x - 3)}" cy="${n(ankle.y + 5)}" r="3.6"/>`,
    box: [ankle.x - 8, hipPad.y - 10, hipPad.x + 14, 0],
  };
}

// A loaded sled on the floor, its push poles' grips at the origin of a
// separate prop; this is the sled body around its own front-bottom corner.
export function sled(): Drawing {
  return {
    svg:
      `<path class="frame" d="M0 0L-48 0L-50 -3L0 -3Z"/><rect class="frame" x="-40" y="-14" width="30" height="11" rx="1.5"/>` +
      `<circle class="iron" cx="-25" cy="-24" r="12"/><rect class="steel" x="-2" y="-60" width="3" height="58" rx="1"/>`,
    box: [-50, -60, 2, 0],
  };
}

// --- Upper-body fixtures ------------------------------------------------------

// Parallel bars seen side-on: the near bar is a rail at height y.
export function dipBar(x0: number, x1: number, y: number): Drawing {
  return {
    svg:
      `<rect class="frame" x="${n(x0 + 4)}" y="${n(y)}" width="4" height="${n(-y)}"/>` +
      `<rect class="frame" x="${n(x1 - 8)}" y="${n(y)}" width="4" height="${n(-y)}"/>` +
      `<rect class="steel" x="${n(x0)}" y="${n(y - 1.6)}" width="${n(x1 - x0)}" height="3.2" rx="1.6"/>`,
    box: [x0, y - 2, x1, 0],
  };
}

// A gymnastic ring around the grip, its strap rising to `top` (drawn by the
// motion as a line prop).
export function ring(): Drawing {
  return { svg: `<circle r="6.2" fill="none" stroke="#c99a62" stroke-width="2.2"/>`, box: [-7.4, -7.4, 7.4, 7.4] };
}

export function strap(): Drawing {
  return { svg: `<path d="M0 0H1" fill="none" stroke="#4d5a72" stroke-width="2" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1, 1, 1] };
}

// A machine handle seen end-on under the fist.
export function handle(): Drawing {
  return { svg: `<circle class="pad" r="3"/>`, box: [-3, -3, 3, 3] };
}

export function wall(x: number, top: number, width = 8): Drawing {
  return { svg: `<rect class="wall" x="${n(x)}" y="${n(top)}" width="${width}" height="${n(-top)}"/>`, box: [x, top, x + width, 0] };
}

// A machine column standing behind the athlete.
export function column(x: number, top: number, width = 12): Drawing {
  return {
    svg: `<rect class="frame" x="${n(x)}" y="${n(top)}" width="${width}" height="${n(-top)}" rx="1.5"/><rect class="frame" x="${n(x - 6)}" y="-3" width="${width + 12}" height="3" rx="1"/>`,
    box: [x - 6, top, x + width + 6, 0],
  };
}

// A short straight bar seen end-on, for curls and rows: lighter plates.
export function lightBarFar(): Drawing {
  return { svg: `<circle class="farp" cx="-5" cy="-2.4" r="14"/>`, box: [-19, -16.4, 9, 11.6] };
}
export function lightBarNear(): Drawing {
  return {
    svg: `<path d="M0 0L-5 -2.4" style="stroke-width:3;stroke:#6f7976"/><circle class="ghost" r="14"/><circle class="steel" r="4.4"/><circle class="iron" r="1.8"/>`,
    box: [-14, -14, 14, 14],
  };
}

// A lat-pulldown bar seen from behind, with the cable rising from its middle.
export function pulldownBar(half = 40): Drawing {
  return {
    svg: `<path class="steel" d="M${-half} -3L${-half + 8} 0L${half - 8} 0L${half} -3L${half} 0.6L${half - 8} 3L${-half + 8} 3L${-half} 0.6Z"/>`,
    box: [-half, -3, half, 3],
  };
}

// --- Cardio machines ------------------------------------------------------------

export function treadmill(x0 = -60, x1 = 62): Drawing {
  return {
    svg:
      `<path class="frame" d="M${x1 - 6} -6L${x1 + 12} -118L${x1 + 17} -118L${x1 + 2} -6Z"/>` +
      `<rect class="frame" x="${x1 + 4}" y="-124" width="22" height="9" rx="2"/>` +
      `<rect class="pad" x="${x0}" y="-7" width="${x1 - x0 + 6}" height="6" rx="3"/>` +
      `<rect class="frame" x="${x0 - 2}" y="-2" width="${x1 - x0 + 10}" height="2" rx="1"/>`,
    box: [x0 - 2, -124, x1 + 26, 0],
  };
}

// A rowing erg: rail, flywheel housing at the front, footplate.
export function rowerFrame(): Drawing {
  return {
    svg:
      `<rect class="frame" x="-74" y="-20" width="150" height="5" rx="2"/>` +
      `<rect class="frame" x="-72" y="-15" width="4" height="15"/><rect class="frame" x="62" y="-15" width="4" height="15"/>` +
      `<circle class="iron" cx="80" cy="-34" r="17"/><circle fill="none" stroke="#6b7471" stroke-width=".8" cx="80" cy="-34" r="11"/>` +
      `<path class="frame" d="M44 -16L52 -40L58 -40L52 -16Z"/>`,
    box: [-74, -51, 97, 0],
  };
}

export function rowerSeat(): Drawing {
  return { svg: `<rect class="pad" x="-11" y="-5" width="22" height="6" rx="2.5"/>`, box: [-11, -5, 11, 1] };
}

// An air bike from the side: fan wheel in front, seat post behind the crank.
export function airBike(seatAt: { x: number; y: number }, crank: { x: number; y: number }): Drawing {
  const hub = { x: crank.x + 48, y: crank.y - 20 };
  const bar = (a: { x: number; y: number }, b: { x: number; y: number }, w = 2.4) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * w;
    const ny = (dx / l) * w;
    return `<path class="frame" d="M${n(a.x + nx)} ${n(a.y + ny)}L${n(b.x + nx)} ${n(b.y + ny)}L${n(b.x - nx)} ${n(b.y - ny)}L${n(a.x - nx)} ${n(a.y - ny)}Z"/>`;
  };
  return {
    svg:
      `<circle fill="#eef1f0" stroke="#7c8582" stroke-width="1.4" cx="${n(hub.x)}" cy="${n(hub.y)}" r="30"/>` +
      `<path d="M${n(hub.x)} ${n(hub.y - 30)}V${n(hub.y + 30)}M${n(hub.x - 30)} ${n(hub.y)}H${n(hub.x + 30)}M${n(hub.x - 21)} ${n(hub.y - 21)}L${n(hub.x + 21)} ${n(hub.y + 21)}M${n(hub.x - 21)} ${n(hub.y + 21)}L${n(hub.x + 21)} ${n(hub.y - 21)}" stroke="#b3bbb8" stroke-width=".6"/>` +
      bar({ x: crank.x - 46, y: -3 }, crank) +
      bar(crank, hub) +
      bar(hub, { x: hub.x + 26, y: -3 }) +
      bar({ x: seatAt.x, y: seatAt.y + 4 }, { x: crank.x - 4, y: crank.y + 2 }) +
      `<rect class="frame" x="${n(crank.x - 56)}" y="-4" width="${n(hub.x - crank.x + 92)}" height="4" rx="1.5"/>` +
      `<circle class="steel" cx="${n(crank.x)}" cy="${n(crank.y)}" r="4"/>` +
      `<rect class="pad" x="${n(seatAt.x - 13)}" y="${n(seatAt.y)}" width="26" height="6" rx="3"/>`,
    box: [crank.x - 56, Math.min(seatAt.y, hub.y - 30), hub.x + 36, 0],
  };
}

// A crank arm with a pedal, drawn from the axle along +y.
export function crankArm(r: number): Drawing {
  return {
    svg: `<rect class="steel" x="-1.6" y="0" width="3.2" height="${r}" rx="1.2"/><rect class="iron" x="-5" y="${r - 1.6}" width="10" height="3.2" rx="1"/>`,
    box: [-5, -1.6, 5, r + 1.6],
  };
}

// An air-bike arm lever, pivoting at the bottom, the handle at the top.
export function bikeLever(len: number): Drawing {
  return {
    svg: `<rect class="steel" x="-1.4" y="${-len}" width="2.8" height="${len}" rx="1"/><rect class="pad" x="-2.6" y="${-len - 10}" width="5.2" height="13" rx="2"/>`,
    box: [-2.6, -len - 10, 2.6, 0],
  };
}

export function skiErg(x: number): Drawing {
  return {
    svg: `<rect class="frame" x="${x}" y="-236" width="12" height="236" rx="2"/><rect class="frame" x="${x - 18}" y="-4" width="44" height="4" rx="1.5"/><circle class="iron" cx="${x + 6}" cy="-120" r="11"/>`,
    box: [x - 18, -236, x + 26, 0],
  };
}

export function stairMachine(): Drawing {
  return {
    svg:
      `<path class="frame" d="M-40 0L-40 -18L-14 -18L-14 -36L12 -36L12 -54L38 -54L38 0Z"/>` +
      `<rect class="frame" x="34" y="-160" width="6" height="106"/><rect class="frame" x="14" y="-132" width="26" height="5" rx="2"/>`,
    box: [-40, -160, 40, 0],
  };
}

// A battle rope anchor post to the right.
export function ropeAnchor(x: number): Drawing {
  return { svg: `<rect class="frame" x="${x}" y="-46" width="8" height="46" rx="2"/>`, box: [x, -46, x + 8, 0] };
}

export function ropeSegment(): Drawing {
  return { svg: `<path d="M0 0H1" fill="none" stroke="#3a413e" stroke-width="2.6" stroke-linecap="round" style="vector-effect:non-scaling-stroke"/>`, box: [0, -1.3, 1, 1.3] };
}

// A skipping rope as a loop hanging from the hands, swung around them.
export function skipRope(reach: number): Drawing {
  return {
    svg: `<ellipse cx="0" cy="${reach / 2}" rx="3.2" ry="${reach / 2}" fill="none" stroke="#3a413e" stroke-width="1.2"/>`,
    box: [-3.2, 0, 3.2, reach],
  };
}

// --- Recovery ----------------------------------------------------------------

export function foamRoller(r = 7.5): Drawing {
  return {
    svg: `<circle r="${r}" fill="#4f8fb8" stroke="#2f6488" stroke-width=".8"/><circle r="${n(r * 0.45)}" fill="none" stroke="#2f6488" stroke-width=".6"/>`,
    box: [-r, -r, r, r],
  };
}

// A sauna: a bench against a wall of planks.
export function sauna(x0: number, x1: number, seatTop: number): Drawing {
  const planks = Array.from({ length: 13 }, (_, i) => `<path d="M${x0} ${-16 * (i + 1)}H${x1}" stroke="#b07f48" stroke-width=".7"/>`).join("");
  return {
    svg:
      `<rect x="${x0}" y="-216" width="${x1 - x0}" height="216" fill="#dcb98c"/>${planks}` +
      `<rect class="wood" x="${x0}" y="${n(seatTop)}" width="${n(x1 - x0)}" height="7"/>` +
      `<rect class="wood" x="${x0 + 8}" y="${n(seatTop + 7)}" width="6" height="${n(-seatTop - 7)}"/><rect class="wood" x="${x1 - 14}" y="${n(seatTop + 7)}" width="6" height="${n(-seatTop - 7)}"/>` +
      `<path d="M${x1 - 40} -120c3 -6 -3 -10 0 -16c3 -6 -3 -10 0 -16M${x1 - 28} -114c3 -6 -3 -10 0 -16c3 -6 -3 -10 0 -16" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" stroke-linecap="round"/>`,
    box: [x0, -216, x1, 0],
  };
}

// A cold-plunge tub: the back wall drawn behind the athlete, the front wall
// and the water in front.
export function tubBack(x0: number, x1: number, top: number): Drawing {
  return { svg: `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${-top}" rx="4" fill="#9fb3bd" stroke="#6d838f" stroke-width=".8"/>`, box: [x0, top, x1, 0] };
}

export function tubFront(x0: number, x1: number, top: number, water: number): Drawing {
  return {
    svg:
      `<rect x="${x0 + 3}" y="${water}" width="${x1 - x0 - 6}" height="${top - water + 4}" fill="#7fc4e4" fill-opacity=".72"/>` +
      `<path d="M${x0 + 3} ${water}H${x1 - 3}" stroke="#4aa3cf" stroke-width="1.2"/>` +
      `<path d="M${x0 + 12} ${water + 6}h10M${x0 + 40} ${water + 10}h14M${x0 + 70} ${water + 5}h9" stroke="#e6f6fd" stroke-width=".9" stroke-linecap="round"/>` +
      `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${-top}" rx="4" fill="#b9cbd3" stroke="#6d838f" stroke-width=".8"/>`,
    box: [x0, water, x1, 0],
  };
}

export function doorFrame(x: number): Drawing {
  return { svg: `<rect class="wood" x="${x}" y="-210" width="9" height="210"/>`, box: [x, -210, x + 9, 0] };
}
