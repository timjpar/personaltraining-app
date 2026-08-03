// Stick-figure illustration for a movement archetype.
//
// Two poses per figure, cross-faded by CSS (see .figure-animate in globals.css)
// so it reads as motion. Only the picker's active option animates — 178 figures
// moving at once would be noise and needless work.
//
// House SVG idiom throughout: viewBox 0 0 20 20, fill none, currentColor,
// rounded caps. Not a client component: it renders identically on the server
// and has no interactivity.

import { cn } from "@/lib/cn";
import type { Archetype } from "@/lib/exercise-archetypes";

// Head + the two body poses. `a` is the resting/start pose, `b` the end of the
// rep — the one reduced-motion users never see, so `a` must stand alone.
type Poses = { head: [number, number]; a: string; b: string; headB?: [number, number] };

const FIGURES: Record<Archetype, Poses> = {
  // Stand tall, then sit into the bottom position.
  squat: {
    head: [10, 4],
    headB: [10, 7],
    a: "M10 6v6M10 12l-2.5 4M10 12l2.5 4M6.5 8h7",
    b: "M10 9v3.5M10 12.5l-3 1.5M10 12.5l3 1.5M6.5 8.5h7",
  },
  // Upright, then hinge at the hip with a flat back.
  hinge: {
    head: [10, 4],
    headB: [5.5, 7],
    a: "M10 6v6.5M10 12.5v3.5M10 12.5l1.5 3.5M7 8.5h6",
    b: "M7 8l6 1.5M13 9.5v6.5M7 8l-1 1.5M7.5 9.5l5.5 1",
  },
  // Split stance, front knee bent.
  lunge: {
    head: [10, 4],
    headB: [10, 5],
    a: "M10 6v6M10 12l-3 4M10 12l3 4M7 8.5h6",
    b: "M10 7v5.5M10 12.5l-3.5 1.5-.5 2.5M10 12.5l3 3.5M7 9h6",
  },
  // Lying press: arms extended, then bent.
  "press-horizontal": {
    head: [4.5, 10],
    a: "M6 10h7M9 10l-2.5-3M9 10l-2.5 6M13 6.5v7",
    b: "M6 10h4.5M8.5 10l-2 -2.5M8.5 10l-2 5.5M10.5 7v6",
  },
  // Rack position, then locked out overhead.
  "press-overhead": {
    head: [10, 5],
    a: "M10 7v5.5M10 12.5l-2 3.5M10 12.5l2 3.5M7.5 8.5l2.5-1 2.5 1M6.5 8.5h7",
    b: "M10 7v5.5M10 12.5l-2 3.5M10 12.5l2 3.5M8 7l2-3 2 3M6.5 3.5h7",
  },
  // Hang, then chin over the bar.
  "pull-vertical": {
    head: [10, 7],
    headB: [10, 5],
    a: "M4 3h12M10 9v4.5M10 13.5l-1.5 3M10 13.5l1.5 3M8 3.5l2 3.5 2-3.5",
    b: "M4 3h12M10 7v4M10 11l-1.5 3.5M10 11l1.5 3.5M8 3.5l2 1.5 2-1.5",
  },
  // Arms extended, then elbows drawn back.
  "pull-horizontal": {
    head: [6.5, 6],
    a: "M6.5 8v4.5M6.5 12.5l-1.5 3.5M6.5 12.5l2 3.5M6.5 9.5h7",
    b: "M6.5 8v4.5M6.5 12.5l-1.5 3.5M6.5 12.5l2 3.5M6.5 9.5h4M10.5 8v3",
  },
  // Loaded walk: legs alternate.
  carry: {
    head: [10, 4],
    a: "M10 6v6M10 12l-2 4M10 12l2 4M7.5 7v5.5M12.5 7v5.5",
    b: "M10 6v6M10 12l-3 3.5M10 12l3 3.5M7.5 7v5.5M12.5 7v5.5",
  },
  // Plank, with a small brace shift.
  core: {
    head: [4, 9],
    a: "M5.5 9.5h10M15.5 9.5l1 5M5.5 9.5l-1 5M6.5 10.5v4",
    b: "M5.5 10h10M15.5 10l1 4.5M5.5 10l-1 4.5M6.5 11v3.5",
  },
  // Running: legs and arms swap.
  cardio: {
    head: [11, 4],
    a: "M11 6l-1.5 5M9.5 11l-3 4M9.5 11l2.5 4M11 7.5l3 1.5M11 7.5l-3 1",
    b: "M11 6l-1.5 5M9.5 11l-1.5 5M9.5 11l4 2M11 7.5l-3 2M11 7.5l3-.5",
  },
  // A held stretch, with only a small deepening.
  stretch: {
    head: [10, 5],
    a: "M10 7v4M10 11l-3.5 2M10 11l3 4M8 8l-2.5 2M12 8l2.5 1.5",
    b: "M10 7.5v3.5M10 11l-4 1.5M10 11l3 4.5M8 8.5l-2.5 3M12 8.5l3 1",
  },
  // Dip under the bar, then catch it overhead.
  explosive: {
    head: [10, 6],
    headB: [10, 4],
    a: "M10 8v4M10 12l-2.5 3.5M10 12l2.5 3.5M7 9.5h6M6.5 9.5h7",
    b: "M10 6v6M10 12l-2 4M10 12l2 4M8 5.5l2-2.5 2 2.5M6 3h8",
  },
  // Nothing recognised — a plain standing figure, deliberately still.
  neutral: {
    head: [10, 4.5],
    a: "M10 6.5v5.5M10 12l-2 4M10 12l2 4M7.5 8.5h5",
    b: "M10 6.5v5.5M10 12l-2 4M10 12l2 4M7.5 8.5h5",
  },
};

export function ExerciseFigure({
  archetype,
  size = 26,
  animated = false,
  className,
}: {
  archetype: Archetype;
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const f = FIGURES[archetype];
  const headB = f.headB ?? f.head;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={cn(animated && "figure-animate", className)}
    >
      <g className="pose-a" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <circle cx={f.head[0]} cy={f.head[1]} r="1.6" />
        <path d={f.a} />
      </g>
      <g className="pose-b" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <circle cx={headB[0]} cy={headB[1]} r="1.6" />
        <path d={f.b} />
      </g>
    </svg>
  );
}
