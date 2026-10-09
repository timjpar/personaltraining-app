// The athlete in profile, facing right, drawn in bind pose (see rig.ts).
//
// Each part is a silhouette plus the muscles that sit on it. The silhouette is
// layer 0; muscle layers are filled base-grey until an exercise names them,
// when they turn red (primary) or salmon (secondary). `line` layers are the
// definition strokes that make a grey figure read as anatomy rather than as a
// mannequin.
//
// Coordinates are absolute bind-pose body units; the renderer shifts each part
// so its joint sits at the origin before rotating it.

import { BIND, type V } from "./rig";

export const MUSCLES = [
  "neck",
  "traps",
  "delts_front",
  "delts_side",
  "delts_rear",
  "chest",
  "lats",
  "upper_back",
  "lower_back",
  "abs",
  "obliques",
  "biceps",
  "triceps",
  "forearms",
  "glutes",
  "hip_flexors",
  "quads",
  "hamstrings",
  "adductors",
  "abductors",
  "calves",
  "tibialis",
] as const;

export type Muscle = (typeof MUSCLES)[number];

export type Layer = { d: string; m?: Muscle; line?: boolean };
export type PartArt = { joint: V; layers: Layer[] };

type SidePart =
  | "head" | "torso" | "pelvis" | "thigh" | "shin" | "foot"
  | "upperArm" | "forearm" | "hand" | "fist" | "palm";

const RAW: Record<SidePart, PartArt> = {
  head: {
    joint: BIND.neck,
    layers: [
      {
        d: "M-4.5 -147C-5 -150 -8.5 -153 -10 -157C-11.5 -161 -11.5 -167 -9 -171C-6.5 -175 -2 -177 2 -176.5C7 -176 11 -172.5 12 -167.5C12.4 -165.5 12.2 -164 12.6 -163L14.2 -159.6C14.4 -159 13.8 -158.6 13 -158.6C13.2 -157.6 13.2 -156.6 12.8 -155.8C12.6 -154 11.6 -152.6 9.6 -152.2C7.6 -151.8 6 -151.6 5 -150.5C4.6 -149.6 4.6 -148.4 4.8 -146Z",
      },
      { d: "M-1 -160C1 -155 3 -151 4.2 -147", m: "neck", line: true },
      { d: "M-3.6 -163.2C-3.6 -165.8 -2.2 -167 -1 -167C0.4 -167 0.8 -165 0.6 -163.2C0.4 -161.4 -0.6 -160 -1.8 -160.2C-3 -160.4 -3.6 -161.6 -3.6 -163.2Z", line: true },
      { d: "M-1.5 -158.6C1.5 -155.6 5 -153.4 9 -152.6", line: true },
      { d: "M8.4 -165.6C9.6 -165.8 11 -165.4 12 -164.6", line: true },
    ],
  },

  torso: {
    joint: BIND.lumbar,
    layers: [
      {
        d: "M5 -149C6 -147.5 7.5 -146.5 9 -146C13 -144 15 -139 14.8 -134C14.6 -130 13.5 -128 12 -127C12 -123 11.8 -118 11.6 -113C11.4 -108 11.8 -104 11 -99L10 -95L-9 -96C-9.5 -101 -10.5 -106 -10 -110C-10.5 -116 -12.5 -123 -13.2 -130C-13.6 -137 -12.5 -143 -10 -147C-8.5 -149 -6.5 -150.5 -4.5 -151Z",
      },
      { m: "traps", d: "M-4.5 -151C-7 -150 -10 -147.5 -11.6 -143.6C-9 -143.2 -5 -144.8 -1.4 -147C-2 -148.6 -3 -150 -4.5 -151Z" },
      { m: "upper_back", d: "M-11.6 -143.6C-12.8 -139 -13.3 -134 -13 -130C-10.4 -131.6 -7 -134.6 -4.4 -138C-6 -140.4 -8.6 -142.6 -11.6 -143.6Z" },
      { m: "chest", d: "M7 -146C11 -145 14.6 -140 14.8 -134C14.6 -130 13.5 -128 12 -127C9 -127.5 5.5 -129.5 3 -132C3.5 -137 5 -142 7 -146Z" },
      { m: "lats", d: "M-4.4 -138C-7 -134.6 -10.4 -131.6 -13 -130C-12.6 -123 -11 -116 -9.8 -111.4C-6 -114 -2.6 -119 -1 -124C-1.2 -129 -2.4 -134 -4.4 -138Z" },
      { m: "lower_back", d: "M-12.6 -125C-11.4 -118 -10.4 -112 -9.9 -107C-9.6 -103 -9.3 -99.6 -9 -96.2L-6 -96.2C-6.3 -100 -6.8 -105.6 -7.4 -110.6C-8.2 -116 -9.6 -121 -10.8 -126Z" },
      { m: "obliques", d: "M7.8 -125C8.2 -118 8.2 -108 7.8 -98.5L-5.6 -97.6C-6.4 -102 -8.2 -107.6 -9.4 -110.8C-6 -114 -2.6 -118.4 -0.6 -123.4C2.6 -124.6 5 -125.2 7.8 -125Z" },
      { m: "abs", d: "M8.2 -126.8C10 -127 11.6 -126.6 12 -125C11.9 -120 11.6 -115 11.6 -111C11.5 -106 11.6 -102 11 -98.5L8 -98.4C8.3 -104 8.4 -112 8.2 -120Z" },
      { d: "M8.3 -120.6L11.8 -120.4M8.4 -114.6L11.6 -114.4M8.4 -108.4L11.6 -108.2", line: true },
      { d: "M1.4 -129.4C2.4 -128.4 3.4 -127.8 4.6 -127.6M2.2 -125.6C3.2 -124.6 4.2 -124 5.4 -123.8M2.8 -121.8C3.8 -120.8 4.8 -120.2 6 -120", line: true },
      { d: "M5 -149C2 -148.2 -1 -148 -3.8 -148.6", line: true },
    ],
  },

  pelvis: {
    joint: BIND.hip,
    layers: [
      {
        d: "M10.6 -99.5C11 -95 10.4 -90 9 -86C6 -83.5 2 -82.5 -1 -82C-4 -81.5 -7 -81 -9 -82C-12.5 -84 -14.6 -88 -14.4 -92.5C-14 -96.5 -11.6 -99.5 -9.4 -101C-3 -101.5 4 -101 10.6 -99.5Z",
      },
      { m: "glutes", d: "M-9.4 -101C-11.6 -99.5 -14 -96.5 -14.4 -92.5C-14.6 -88 -12.5 -84 -9 -82C-6 -82.4 -3.4 -84 -1.8 -87.2C-1.8 -92 -4 -97 -9.4 -101Z" },
      { m: "hip_flexors", d: "M6 -99.5C8.5 -99.5 10.5 -98.5 10.7 -96C10.6 -93 10 -90 9 -87.5C7.8 -90.5 6.6 -95 6 -99.5Z" },
      { m: "abductors", d: "M-1.8 -87.2C-1.8 -92 -4 -97 -9.4 -101C-5 -101.3 0.6 -101.1 5.4 -100.4C2.6 -97 0.2 -92.6 -1.8 -87.2Z" },
      { d: "M-7 -101C-2 -100.2 3 -99.8 8 -99.8", line: true },
    ],
  },

  thigh: {
    joint: BIND.hip,
    layers: [
      {
        d: "M8.8 -95C11.6 -89 12.4 -80 11.6 -71C11 -64 9.6 -58 8.6 -53.5C8.4 -51.5 7.6 -50 6.5 -49L-5.6 -49.5C-6.6 -53 -7.6 -58 -8.4 -64C-9.6 -72 -10 -80 -9.6 -85C-9.4 -89 -8 -93 -6 -96C-1 -98 4 -98 8.8 -95Z",
      },
      { m: "quads", d: "M1.4 -93C5 -95.6 8 -95.6 8.8 -95C11.6 -89 12.4 -80 11.6 -71C11 -64 9.6 -58 8.4 -53C6.4 -55 4.4 -57 3 -60C1.2 -69 0.4 -80 1.4 -93Z" },
      { m: "hamstrings", d: "M-1.6 -88C-0.8 -78 -1.2 -66 -3.4 -56C-4.8 -54 -5.4 -52 -5.6 -50C-6.6 -53 -7.6 -58 -8.4 -64C-9.6 -72 -10 -80 -9.6 -85C-7 -87.6 -4 -88.6 -1.6 -88Z" },
      { m: "adductors", d: "M1.4 -93C0.4 -86 0 -78 0.6 -70C-0.6 -76 -1.4 -83 -1.6 -88C-0.6 -90.6 0.4 -92 1.4 -93Z" },
      { d: "M4.2 -90C6.2 -80 6.6 -68 5.6 -58", line: true },
      { d: "M5.4 -55.6C5.4 -53.4 6.4 -51.6 7.6 -51.4C8.6 -51.6 8.8 -54 8.2 -56", line: true },
    ],
  },

  shin: {
    joint: BIND.knee,
    layers: [
      {
        d: "M6.8 -51C7.4 -46 6.4 -40 5.6 -34C4.8 -27 4 -19 3.8 -12C3.6 -10 3.6 -9 4 -7.6L-3.4 -8.4C-3.6 -12 -3.8 -17 -4.4 -22C-6.4 -27 -8.8 -34 -9 -40C-9 -45 -7.8 -49 -5.8 -51C-2 -52.6 3 -52.6 6.8 -51Z",
      },
      { m: "calves", d: "M-1 -48C-1.4 -40 -2.2 -30 -3.6 -21.4C-5.8 -26 -8.4 -33 -9 -40C-9 -45 -7.8 -49 -5.8 -51C-4 -51.2 -2.4 -50.4 -1 -48Z" },
      { m: "tibialis", d: "M2.2 -49C4.2 -49.6 6 -49.8 6.6 -49C6.8 -44 6 -38 5.2 -32C4.6 -27 4.2 -22 3.9 -17C2.6 -24 1.6 -33 1.4 -41C1.5 -45 1.8 -47.6 2.2 -49Z" },
      { d: "M-3.6 -21.4C-3.6 -17 -3.4 -12.6 -3.2 -9", line: true },
    ],
  },

  foot: {
    joint: BIND.ankle,
    layers: [
      {
        d: "M4 -9C6 -8.4 9 -6.5 12 -4.6C15 -3 18 -2.4 20 -2C21.2 -1.6 21.4 -0.2 20.4 0L-3.6 0C-5.6 0 -6.2 -2 -5.6 -4C-5 -6.5 -4 -8.2 -3.4 -9C-1 -10.2 2 -10 4 -9Z",
      },
      { d: "M0.6 -7.2C1.4 -7.2 1.9 -6.6 1.9 -5.9C1.9 -5.2 1.3 -4.6 0.6 -4.6C-0.1 -4.6 -0.6 -5.2 -0.6 -5.9C-0.6 -6.6 -0.1 -7.2 0.6 -7.2Z", line: true },
    ],
  },

  upperArm: {
    joint: BIND.shoulder,
    layers: [
      {
        d: "M-7.4 -142C-7.6 -147 -4.5 -151 0 -151.2C4.6 -151.2 8 -148 8.2 -143.5C8.4 -139 7 -136 6.6 -133C7 -129 6.6 -124 5.4 -120C5 -118.5 4.6 -117.4 4.4 -116.5L-4.6 -116C-5.6 -118 -6.6 -121 -6.8 -125C-7.4 -130 -7.8 -136 -7.4 -142Z",
      },
      { m: "triceps", d: "M-3.6 -138.5C-1.4 -134.5 -0.6 -129 -1.2 -123C-1.8 -120 -2.8 -118 -4.6 -116.4C-5.6 -118 -6.6 -121 -6.8 -125C-7.4 -130 -7.8 -134.5 -7.6 -137.5C-6.2 -138.4 -4.8 -138.8 -3.6 -138.5Z" },
      { m: "biceps", d: "M2.5 -134.5C4.5 -135 6 -135 6.8 -133.4C7.2 -129 6.6 -124 5.4 -120C5 -118.5 4.6 -117.6 4.2 -117C3 -119 2 -124 1.8 -128C1.8 -131 2 -133 2.5 -134.5Z" },
      { m: "delts_rear", d: "M0 -151.2C-2.6 -148 -3.8 -143 -3.6 -138.5C-4.6 -137 -6 -136.5 -7.6 -137C-7.8 -140 -7.6 -146 -4.5 -150C-3 -151 -1.5 -151.3 0 -151.2Z" },
      { m: "delts_side", d: "M0 -151.2C0.8 -149.6 1.4 -147 1.6 -144.5C3 -140 4.4 -136 6.2 -134.5C4 -132.6 1.6 -131 0.4 -130.4C-1.2 -132 -2.8 -135 -3.6 -138.5C-3.8 -143 -2.6 -148 0 -151.2Z" },
      { m: "delts_front", d: "M0 -151.2C4.6 -151.2 8 -148 8.2 -143.5C8.4 -140 7.4 -137 6.2 -134.5C4.4 -136 3 -140 1.6 -144.5C1.4 -147 0.8 -149.6 0 -151.2Z" },
      { d: "M1 -130.4C0.8 -126 1.4 -121.6 2.6 -118", line: true },
    ],
  },

  forearm: {
    joint: BIND.elbow,
    layers: [
      {
        d: "M4.6 -118C6.4 -115 6.4 -110 5.6 -106C4.8 -101 3.6 -96 3.2 -92L-3 -91.6C-3.4 -96 -4.4 -102 -5 -107C-5.6 -111 -5.6 -115 -4.8 -118.5C-1.6 -120 2 -120 4.6 -118Z",
      },
      { m: "forearms", d: "M4.6 -118C6.4 -115 6.4 -110 5.6 -106C4.9 -102 4.2 -99 3.7 -96.4L-3.3 -96C-3.8 -100 -4.6 -104 -5 -107C-5.6 -111 -5.6 -115 -4.8 -118.5C-1.6 -120 2 -120 4.6 -118Z" },
      { d: "M0.6 -117C0.2 -110 -0.2 -103 -0.2 -96.4", line: true },
    ],
  },

  // Relaxed, hanging: thumb forward.
  hand: {
    joint: BIND.wrist,
    layers: [
      {
        d: "M3.4 -92C4.6 -90 5 -87.5 4.6 -85C4.4 -83 3.6 -81.4 2.2 -80.6C0 -79.6 -2.4 -80.4 -3.2 -82.5C-3.8 -85 -3.6 -88.5 -3.2 -91.6Z",
      },
      { d: "M3.6 -90.5C4.8 -88 5.4 -86 4.2 -84.2", line: true },
    ],
  },

  // Closed around a bar that runs into the page, centred LEN.grip below the
  // wrist.
  fist: {
    joint: BIND.wrist,
    layers: [
      {
        d: "M3.4 -92C5 -90 5.6 -87.4 5.2 -84.8C4.8 -82 2.8 -80.2 0 -80.2C-2.8 -80.2 -4.4 -82.2 -4.2 -85C-4 -87.6 -3.6 -89.6 -3.2 -91.6Z",
      },
      { d: "M-1.6 -81C-0.6 -82.2 1 -82.6 2.6 -82M-3 -83.6C-2 -84.6 -0.6 -85 0.8 -84.6", line: true },
    ],
  },

  // Flat, fingers along the bone, palm on the -x side: rotate the hand +90
  // and the palm faces the floor with the fingers pointing forward.
  palm: {
    joint: BIND.wrist,
    layers: [
      {
        d: "M1.4 -92.4C2 -88 1.8 -80 1.4 -74.6C1.2 -73.2 0.2 -72.6 -1 -72.8L-2.6 -73.4C-2.9 -80 -2.8 -87 -2.6 -91.6Z",
      },
      { d: "M1.2 -84C0.2 -83.6 -1 -83.6 -2.4 -84", line: true },
    ],
  },
};

// The outlines above are drawn to real profile depths, and a real profile
// reads as skinny at thumbnail size. Bulk every part out across its bone — the
// joints don't move, so the rig is unaffected — until the figure reads as an
// athlete.
const BULK: Record<SidePart, number> = {
  head: 1.02,
  torso: 1.16,
  pelvis: 1.14,
  thigh: 1.24,
  shin: 1.2,
  foot: 1,
  upperArm: 1.3,
  forearm: 1.24,
  hand: 1.08,
  fist: 1.1,
  palm: 1,
};

function bulk(art: PartArt, k: number): PartArt {
  const jx = art.joint.x;
  const fix = (d: string) => {
    let i = 0;
    return d.replace(/-?\d*\.?\d+/g, (m) => {
      const n = Number(m);
      const out = i++ % 2 === 0 ? jx + (n - jx) * k : n;
      return String(Math.round(out * 100) / 100);
    });
  };
  return { joint: art.joint, layers: art.layers.map((l) => ({ ...l, d: fix(l.d) })) };
}

export const SIDE = Object.fromEntries(
  (Object.keys(RAW) as SidePart[]).map((k) => [k, bulk(RAW[k], BULK[k])]),
) as Record<SidePart, PartArt>;
