"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Model, ModelFrame, ModelPoint, ThreeDStage } from "@/lib/exercise-anim/three-d";

// A turnable 3D view of a movement the flat drawing can't make clear: the
// same motion, lifted out of the picture plane and drawn as a simple
// mannequin on a canvas. Turn it with the wheel (or by dragging the figure),
// slow it down, or scrub to any moment; the caption names each phase.
//
// Drawn by hand rather than with a 3D library: a dozen capsules sorted back
// to front is all a mannequin needs, and it keeps the page light.

type P3 = { x: number; y: number; z: number };

const BAR_HALF = 62;

// Fixed, like the flat drawings' plate, so the figure reads the same in both
// themes.
const PLATE = "#f4f6f5";
const SKIN = "#cfd5d2";
const SKIN_FAR = "#b4bcb8";
const OUTLINE = "#5f6966";
const BAR_ARM = "#2f8f7a";
const FREE_ARM = "#e07b39";
const STEEL = "#7d8784";

const SPEEDS = [1, 0.5, 0.25] as const;

const lift = ([x, y, z]: ModelPoint): P3 => ({ x, y: -y, z });

// The server has already placed every joint in 3D; flip y to point up.
function body(f: ModelFrame) {
  const out = {} as Record<Exclude<keyof ModelFrame, "torso">, P3>;
  for (const k of Object.keys(f) as (keyof ModelFrame)[]) {
    if (k !== "torso") out[k] = lift(f[k]);
  }
  return out;
}

const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpP = (a: ModelPoint, b: ModelPoint, t: number): ModelPoint => [lerpN(a[0], b[0], t), lerpN(a[1], b[1], t), lerpN(a[2], b[2], t)];

function frameAt(frames: ModelFrame[], p: number): ModelFrame {
  const at = Math.min(Math.max(p, 0), 1) * (frames.length - 1);
  const i = Math.min(Math.floor(at), frames.length - 2);
  const t = at - i;
  const a = frames[i];
  const b = frames[i + 1];
  const out = { torso: lerpN(a.torso, b.torso, t) } as ModelFrame;
  for (const k of Object.keys(a) as (keyof ModelFrame)[]) {
    if (k !== "torso") (out[k] as ModelPoint) = lerpP(a[k] as ModelPoint, b[k] as ModelPoint, t);
  }
  return out;
}

// Phase of the motion (0..1 of the spec) at a time through one rep.
function phaseAt(model: Model, u: number): number {
  if (model.mode === "loop") return u;
  return u < 0.5 ? u * 2 : 2 - u * 2;
}

type Shape =
  | { kind: "seg"; a: P3; b: P3; r: number; fill: string }
  | { kind: "ball"; a: P3; r: number; fill: string };

export function Exercise3D({ src, stage, name }: { src: string; stage: ThreeDStage; name: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [failed, setFailed] = useState(false);
  // Opens from the bar-hand side and a little in front, where the reel's
  // camera stands.
  const [yaw, setYaw] = useState(-145);
  const [pitch, setPitch] = useState(14);
  // Respect a reader who asked for less motion: start paused. Only ever
  // rendered in the browser (inside an opened dialog).
  const [playing, setPlaying] = useState(
    () => typeof window === "undefined" || !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(0.5);
  // Time through one rep, 0..1.
  const [u, setU] = useState(0);

  useEffect(() => {
    let live = true;
    fetch(src)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((m: Model) => live && setModel(m))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [src]);

  useEffect(() => {
    if (!playing || !model) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setU((x) => (x + (dt * speed) / model.seconds) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, model, speed]);

  // Fit every frame, the bar and the floor once, so the camera doesn't
  // breathe as the body moves.
  const fit = useMemo(() => {
    if (!model) return null;
    let minX = stage.bar.x - 30;
    let maxX = stage.bar.x + 30;
    // The body and the bar, not the floor: the posts run off the bottom
    // rather than shrinking the figure to fit them.
    let minY = -stage.bar.y;
    let maxY = -stage.bar.y;
    for (const f of model.frames) {
      for (const [k, q] of Object.entries(f)) {
        if (k === "torso") continue;
        const [x, y] = q as ModelPoint;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, -y);
        maxY = Math.max(maxY, -y);
      }
    }
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, size: Math.max(maxX - minX, maxY - minY, BAR_HALF * 2) + 40 };
  }, [model, stage]);

  const draw = useCallback(() => {
    const el = canvas.current;
    const box = fit;
    if (!el || !model || !box) return;
    const dpr = window.devicePixelRatio || 1;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (el.width !== Math.round(w * dpr)) el.width = Math.round(w * dpr);
    if (el.height !== Math.round(h * dpr)) el.height = Math.round(h * dpr);
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PLATE;
    ctx.fillRect(0, 0, w, h);

    const cy = Math.cos((yaw * Math.PI) / 180);
    const sy = Math.sin((yaw * Math.PI) / 180);
    const cp = Math.cos((pitch * Math.PI) / 180);
    const sp = Math.sin((pitch * Math.PI) / 180);
    const dist = box.size * 2.4;
    const scale = (Math.min(w, h) / box.size) * 1.05;
    // World → camera: turn about the vertical through the scene's middle,
    // then tip toward the viewer. z out of the screen is toward the viewer.
    const cam = (q: P3) => {
      const x = q.x - box.cx;
      const y = q.y - box.cy;
      const x1 = x * cy + q.z * sy;
      const z1 = -x * sy + q.z * cy;
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      return { x: x1, y: y2, z: z2 };
    };
    const project = (q: P3) => {
      const c = cam(q);
      const k = dist / (dist - c.z);
      return { x: w / 2 + c.x * k * scale, y: h / 2 - c.y * k * scale, k, z: c.z };
    };

    // Floor grid.
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(95,105,102,0.18)";
    const fx0 = box.cx - box.size / 2;
    const fx1 = box.cx + box.size / 2;
    for (let i = 0; i <= 8; i++) {
      const x = lerpN(fx0, fx1, i / 8);
      const a = project({ x, y: 0, z: -BAR_HALF - 20 });
      const b = project({ x, y: 0, z: BAR_HALF + 20 });
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const z = lerpN(-BAR_HALF - 20, BAR_HALF + 20, i / 6);
      const a = project({ x: fx0, y: 0, z });
      const b = project({ x: fx1, y: 0, z });
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    const f = frameAt(model.frames, phaseAt(model, u));
    const j = body(f);
    const bar = (z: number): P3 => ({ x: stage.bar.x, y: -stage.bar.y, z });
    const shapes: Shape[] = [
      // The bar across, and its two posts.
      { kind: "seg", a: bar(-BAR_HALF), b: bar(BAR_HALF), r: 2.6, fill: STEEL },
      { kind: "seg", a: bar(-BAR_HALF), b: { ...bar(-BAR_HALF), y: 0 }, r: 3, fill: STEEL },
      { kind: "seg", a: bar(BAR_HALF), b: { ...bar(BAR_HALF), y: 0 }, r: 3, fill: STEEL },
      // Trunk.
      { kind: "seg", a: j.hipN, b: j.hipF, r: 9.5, fill: SKIN },
      { kind: "seg", a: j.hip, b: j.lumbar, r: 11, fill: SKIN },
      { kind: "seg", a: j.lumbar, b: j.neck, r: 12, fill: SKIN },
      { kind: "seg", a: j.shoulderN, b: j.shoulderF, r: 7.5, fill: SKIN },
      { kind: "seg", a: j.neck, b: j.head, r: 4.5, fill: SKIN },
      { kind: "ball", a: j.head, r: 10.5, fill: SKIN },
      // The face: a dark dot on the front of the head.
      { kind: "ball", a: j.face, r: 3, fill: OUTLINE },
      // Arms: the bar arm in green, the other in orange.
      { kind: "seg", a: j.shoulderN, b: j.elbowN, r: 5.2, fill: BAR_ARM },
      { kind: "seg", a: j.elbowN, b: j.wristN, r: 4.4, fill: BAR_ARM },
      { kind: "ball", a: j.handN, r: 4.6, fill: BAR_ARM },
      { kind: "seg", a: j.shoulderF, b: j.elbowF, r: 5.2, fill: stage.oneArm ? FREE_ARM : BAR_ARM },
      { kind: "seg", a: j.elbowF, b: j.wristF, r: 4.4, fill: stage.oneArm ? FREE_ARM : BAR_ARM },
      { kind: "ball", a: j.handF, r: 4.6, fill: stage.oneArm ? FREE_ARM : BAR_ARM },
      // Legs: the far one a shade darker, so crossed legs stay readable.
      { kind: "seg", a: j.hipN, b: j.kneeN, r: 7.5, fill: SKIN },
      { kind: "seg", a: j.kneeN, b: j.ankleN, r: 5.5, fill: SKIN },
      { kind: "seg", a: j.ankleN, b: j.toeN, r: 3.6, fill: SKIN },
      { kind: "seg", a: j.hipF, b: j.kneeF, r: 7.5, fill: SKIN_FAR },
      { kind: "seg", a: j.kneeF, b: j.ankleF, r: 5.5, fill: SKIN_FAR },
      { kind: "seg", a: j.ankleF, b: j.toeF, r: 3.6, fill: SKIN_FAR },
    ];

    // A soft shadow under the hips keeps the figure placed in the room.
    const sh = project({ x: f.hip[0], y: 0, z: 0 });
    ctx.fillStyle = "rgba(60,70,66,0.12)";
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, 34 * scale * sh.k, 9 * scale * sh.k, 0, 0, Math.PI * 2);
    ctx.fill();

    const placed = shapes.map((s) => {
      const a = project(s.a);
      const b = s.kind === "seg" ? project(s.b) : a;
      return { s, a, b, depth: (a.z + b.z) / 2 };
    });
    placed.sort((m, n) => m.depth - n.depth);
    ctx.lineCap = "round";
    for (const { s, a, b } of placed) {
      const k = ((a.k + b.k) / 2) * scale;
      if (s.kind === "seg") {
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = s.r * 2 * k + 2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.strokeStyle = s.fill;
        ctx.lineWidth = s.r * 2 * k;
        ctx.stroke();
      } else {
        ctx.fillStyle = OUTLINE;
        ctx.beginPath();
        ctx.arc(a.x, a.y, s.r * k + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = s.fill;
        ctx.beginPath();
        ctx.arc(a.x, a.y, s.r * k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [model, fit, stage, u, yaw, pitch]);

  useEffect(() => {
    draw();
  }, [draw]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  // Drag the figure: across turns it, up and down tips the view.
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const onFigureDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, yaw, pitch };
  };
  const onFigureMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setYaw(wrap(d.yaw + (e.clientX - d.x) * 0.6));
    setPitch(Math.max(-10, Math.min(70, d.pitch + (e.clientY - d.y) * 0.4)));
  };
  const onFigureUp = () => {
    drag.current = null;
  };

  const frame = model ? frameAt(model.frames, phaseAt(model, u)) : null;
  const phaseIndex = frame ? stage.phases.findIndex((ph) => frame.torso < ph.below) : 0;
  const phase = stage.phases[Math.max(0, phaseIndex)];

  if (failed) {
    return <p className="px-1 py-8 text-center text-sm text-ink-soft">The 3D view didn&rsquo;t load. The drawing is still there under 2D.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <canvas
          ref={canvas}
          role="img"
          aria-label={`${name} in 3D. ${phase?.label ?? ""}`}
          onPointerDown={onFigureDown}
          onPointerMove={onFigureMove}
          onPointerUp={onFigureUp}
          onPointerCancel={onFigureUp}
          className="block aspect-square w-full cursor-grab touch-none rounded-[var(--radius-sm)] border border-line active:cursor-grabbing"
          style={{ background: PLATE }}
        />
        {!model && <p className="absolute inset-0 grid place-items-center text-sm text-ink-soft">Loading 3D…</p>}
        {model && (
          <p
            aria-live="polite"
            className="pointer-events-none absolute left-2 top-2 max-w-[80%] rounded-[var(--radius-sm)] bg-white/85 px-2 py-1 text-[13px] font-medium leading-snug text-[#1f2624] shadow-sm"
          >
            <span className="mr-1.5 tabular-nums text-[#5f6966]">
              {phaseIndex + 1}/{stage.phases.length}
            </span>
            {phase.label}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SpinWheel yaw={yaw} onYaw={setYaw} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((x) => !x)}
              aria-label={playing ? "Pause" : "Play"}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line text-ink transition-colors hover:border-jade/60 focus-visible:outline-2 focus-visible:outline-jade"
            >
              {playing ? (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                  <rect x="2" y="1.5" width="2.8" height="9" rx="0.6" fill="currentColor" />
                  <rect x="7.2" y="1.5" width="2.8" height="9" rx="0.6" fill="currentColor" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                  <path d="M3 1.5L10.5 6L3 10.5Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <div role="group" aria-label="Speed" className="flex overflow-hidden rounded-[var(--radius-sm)] border border-line">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={speed === s}
                  onClick={() => setSpeed(s)}
                  className={
                    "h-9 px-2.5 text-xs tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-jade " +
                    (speed === s ? "bg-jade/15 font-semibold text-ink" : "text-ink-soft hover:text-ink")
                  }
                >
                  {s === 1 ? "1×" : s === 0.5 ? "½×" : "¼×"}
                </button>
              ))}
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(u * 1000)}
            onChange={(e) => {
              setPlaying(false);
              setU(Number(e.target.value) / 1000);
            }}
            aria-label="Scrub through the rep"
            className="w-full accent-[var(--color-jade,#2f8f7a)]"
          />
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: BAR_ARM }} />
          {stage.oneArm ? "Arm on the bar" : "Arms"}
        </span>
        {stage.oneArm && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: FREE_ARM }} />
            Free arm
          </span>
        )}
        <span>Turn the wheel or drag the figure to look around.</span>
      </p>
    </div>
  );
}

const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

// A dial for the camera: drag the knob round, or use the arrow keys. The top
// of the wheel is the flat side view the 2D drawing shows.
function SpinWheel({ yaw, onYaw }: { yaw: number; onYaw: (deg: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const turning = useRef(false);
  const angleFrom = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return yaw;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    return wrap((Math.atan2(dx, -dy) * 180) / Math.PI);
  };
  const knob = ((yaw - 90) * Math.PI) / 180;
  const R = 26;
  return (
    <svg
      ref={ref}
      width="72"
      height="72"
      viewBox="-36 -36 72 72"
      role="slider"
      tabIndex={0}
      aria-label="Spin the view"
      aria-valuemin={-180}
      aria-valuemax={180}
      aria-valuenow={Math.round(yaw)}
      aria-valuetext={`${Math.round(yaw)} degrees`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        turning.current = true;
        onYaw(angleFrom(e));
      }}
      onPointerMove={(e) => turning.current && onYaw(angleFrom(e))}
      onPointerUp={() => (turning.current = false)}
      onPointerCancel={() => (turning.current = false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onYaw(wrap(yaw - 15));
        } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onYaw(wrap(yaw + 15));
        }
      }}
      className="shrink-0 cursor-grab touch-none rounded-full text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade active:cursor-grabbing"
    >
      <circle r="33" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="6" />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * 15 * Math.PI) / 180;
        const long = i % 6 === 0;
        return (
          <line
            key={i}
            x1={Math.sin(a) * (long ? 22 : 24)}
            y1={-Math.cos(a) * (long ? 22 : 24)}
            x2={Math.sin(a) * 28}
            y2={-Math.cos(a) * 28}
            stroke="currentColor"
            strokeOpacity={long ? 0.5 : 0.25}
            strokeWidth={long ? 1.4 : 1}
          />
        );
      })}
      <circle cx={Math.cos(knob) * R} cy={Math.sin(knob) * R} r="6.5" fill={BAR_ARM} stroke="#fff" strokeWidth="1.5" />
      <text y="4" textAnchor="middle" fontSize="10" fontWeight="600" fill="currentColor" fillOpacity="0.7">
        3D
      </text>
    </svg>
  );
}
