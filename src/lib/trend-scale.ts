// The arithmetic behind the trend chart: turning rows and a selection into
// plottable series, picking an axis, and finding tick values that read well.
//
// Split from metrics.ts because none of this has an opinion about bodies — it
// is the same seam units.ts draws against body.ts. Pure, so the awkward cases
// (one reading, every reading identical, a series that starts at zero) can be
// reasoned about without a browser.
import type { Metric, TrendRow } from "@/lib/metrics";
import type { Units } from "@/lib/constants";

export type PlotPoint = {
  t: number;
  // The reading in the reader's units, unrounded. Always real — the tooltip and
  // the table show this even when the chart itself is drawn as percent change,
  // which is the entire reason the table is worth having.
  display: number;
  // What actually gets drawn: `display` in absolute mode, percent change from
  // this series' own first reading in indexed mode.
  v: number;
};

export type PlotSeries = {
  key: string;
  label: string;
  slot: number;
  dashed: boolean;
  unit: string;
  decimals: number;
  points: PlotPoint[];
  // In plotted units. Null in indexed mode — a goal weight is a position on a
  // real axis and means nothing on a percent one.
  reference: number | null;
};

export type AxisMode = "absolute" | "indexed";

export type Built = {
  mode: AxisMode;
  series: PlotSeries[];
  // Selected and non-empty, but undrawable in indexed mode because it starts at
  // zero. There is no honest percent change from nothing.
  dropped: { key: string; label: string }[];
  // The unit the y axis is in: a real unit in absolute mode, "%" in indexed.
  unit: string;
  decimals: number;
};

// Rows arrive newest-first from every caller (the pages reuse the same array
// for their history lists). One sort here rather than a sorted second copy at
// each call site.
export function ascending<R extends TrendRow>(rows: R[]): R[] {
  return [...rows].sort((a, b) => a.t - b.t);
}

// How far back the chart looks. Measured from *today*, not from the newest
// reading: "the last week" is a claim about the calendar, and anchoring to the
// last entry would quietly relabel a range that ended two months ago. The cost
// is that a range can come back empty for someone who hasn't logged in a
// while, which is itself worth seeing — the chart says so and All is one tap.
export const RANGES = [
  { key: "7d", label: "1W", days: 7 },
  { key: "30d", label: "1M", days: 30 },
  { key: "90d", label: "3M", days: 90 },
  { key: "180d", label: "6M", days: 180 },
  { key: "365d", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
] as const;

export type RangeKey = (typeof RANGES)[number]["key"];
export const DEFAULT_RANGE: RangeKey = "all";

export function toRangeKey(value: unknown): RangeKey {
  return RANGES.some((r) => r.key === value) ? (value as RangeKey) : DEFAULT_RANGE;
}

// Filtering happens before buildSeries, which is what makes the indexed
// baseline follow the range: pick 1M and every line rebases to its first
// reading inside that month rather than to one from last year. That is the
// only honest reading of "percent change" once a window exists.
export function withinRange<R extends TrendRow>(
  rows: R[],
  range: RangeKey,
  now = Date.now(),
): R[] {
  const days = RANGES.find((r) => r.key === range)?.days ?? null;
  if (days == null) return rows;
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return rows.filter((r) => r.t >= cutoff);
}

export function buildSeries<Row extends TrendRow, Ctx>({
  rows,
  metrics,
  ctx,
  units,
}: {
  rows: Row[]; // ascending
  metrics: Metric<Row, Ctx>[]; // the selection, already filtered of blocked ones
  ctx: Ctx;
  units: Units;
}): Built {
  // Pass one: pull real values out, in the reader's units.
  const extracted = metrics.map((m) => {
    const points: PlotPoint[] = [];
    for (const row of rows) {
      const canonical = m.value(row, ctx);
      if (canonical == null || !Number.isFinite(canonical)) continue;
      const display = m.family.toDisplay(canonical, units);
      points.push({ t: row.t, display, v: display });
    }
    return { metric: m, points };
  });

  // A metric with nothing to plot is dropped silently: the caller only ever
  // passes metrics its own chips have already shown as available, so reaching
  // here with none is a stale stored selection, and the greyed chip has
  // already said so.
  const live = extracted.filter((e) => e.points.length > 0);

  // The axis is decided by what can actually be drawn. A selected metric with
  // no readings must not flip a real kg axis to percent change on the strength
  // of a line that isn't there.
  const families = new Set(live.map((e) => e.metric.family.key));
  const mode: AxisMode = families.size <= 1 ? "absolute" : "indexed";

  const dropped: { key: string; label: string }[] = [];
  const series: PlotSeries[] = [];

  for (const { metric, points } of live) {
    if (mode === "indexed") {
      const baseline = points[0].display;
      if (baseline === 0) {
        dropped.push({ key: metric.key, label: metric.label });
        continue;
      }
      series.push({
        key: metric.key,
        label: metric.label,
        slot: metric.slot,
        dashed: metric.dashed,
        unit: metric.family.unit(units),
        decimals: metric.family.decimals,
        points: points.map((p) => ({
          ...p,
          v: ((p.display - baseline) / baseline) * 100,
        })),
        reference: null,
      });
      continue;
    }

    const ref = metric.reference?.(ctx) ?? null;
    series.push({
      key: metric.key,
      label: metric.label,
      slot: metric.slot,
      dashed: metric.dashed,
      unit: metric.family.unit(units),
      decimals: metric.family.decimals,
      points,
      reference: ref == null ? null : metric.family.toDisplay(ref, units),
    });
  }

  const family = live[0]?.metric.family;
  return {
    mode,
    series,
    dropped,
    unit: mode === "indexed" ? "%" : (family?.unit(units) ?? ""),
    decimals: mode === "indexed" ? 1 : (family?.decimals ?? 1),
  };
}

// How much of the plot's height the actual readings must still occupy once a
// reference line has been folded in. Below this the goal wins and the data
// becomes a horizontal smear: someone 23 lb from target had a real 5 lb loss
// drawn as a flat line, which is the chart failing at its only job. The stat
// strip above already states the goal as a number, so dropping the line costs
// the reader nothing they cannot already see.
// A quarter: a goal ten pounds from a five-pound spread still earns its line
// (5/15 ≈ 0.33), one twenty-three pounds away does not (5/28 ≈ 0.18).
const MIN_DATA_SHARE = 0.25;

// The vertical window, and which references earn a place in it.
//
// A reference inside the data's own window is free. One outside expands the
// window, and that expansion is only worth it while the readings still fill
// enough of the result to be readable — otherwise the line is dropped rather
// than drawn, because a reference must never sit outside the domain (it would
// clip off the top). Time ranges made this urgent: pick one week and every
// reading in it is within a pound, so a goal twenty pounds away flattens the
// lot.
export function domainFor(
  series: PlotSeries[],
  flatPad: number,
): { lo: number; hi: number; references: string[] } {
  const values: number[] = [];
  for (const s of series) for (const p of s.points) values.push(p.v);
  if (values.length === 0) return { lo: 0, hi: 1, references: [] };

  let lo = Math.min(...values);
  let hi = Math.max(...values);

  // Every reading identical, or a single reading. Open a window around it
  // rather than dividing by a zero range — a flat weight belongs in the middle
  // of a sensible band, not pinned to an edge.
  if (hi - lo < Number.EPSILON) {
    lo -= flatPad;
    hi += flatPad;
  }

  const references: string[] = [];
  for (const s of series) {
    const ref = s.reference;
    if (ref == null) continue;
    if (ref >= lo && ref <= hi) {
      references.push(s.key);
      continue;
    }
    const nextLo = Math.min(lo, ref);
    const nextHi = Math.max(hi, ref);
    if ((hi - lo) / (nextHi - nextLo) >= MIN_DATA_SHARE) {
      lo = nextLo;
      hi = nextHi;
      references.push(s.key);
    }
  }

  return { lo, hi, references };
}

// Ticks a person would have chosen: steps of 1, 2, 2.5 or 5 times a power of
// ten, with the domain widened to land on them.
export function niceScale(
  lo: number,
  hi: number,
  targetSteps = 4,
): { lo: number; hi: number; ticks: number[] } {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
    return { lo: 0, hi: 1, ticks: [0, 1] };
  }

  const rough = (hi - lo) / targetSteps;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalised = rough / magnitude;
  const step =
    (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10) *
    magnitude;

  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const count = Math.max(1, Math.round((end - start) / step));

  // Multiply, never accumulate. `v += 2.5` eight times reaches
  // 17.500000000000004 and puts it on the axis.
  const ticks = Array.from({ length: count + 1 }, (_, i) => start + i * step);
  return { lo: start, hi: end, ticks };
}

// Which of the crosshair's stops is nearest a pointer position. Binary search
// because this runs on every pointermove.
export function nearestIndex(sorted: number[], t: number): number {
  if (sorted.length === 0) return -1;
  if (t <= sorted[0]) return 0;
  const last = sorted.length - 1;
  if (t >= sorted[last]) return last;

  let lo = 0;
  let hi = last;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] === t) return mid;
    if (sorted[mid] < t) lo = mid;
    else hi = mid;
  }
  return t - sorted[lo] <= sorted[hi] - t ? lo : hi;
}

// The dates the crosshair may land on: those where at least one drawn series
// has a reading. Snapping to every row instead would stop the pointer on days
// where the tooltip has nothing to say but a column of dashes.
export function stopsFor(series: PlotSeries[]): number[] {
  const set = new Set<number>();
  for (const s of series) for (const p of s.points) set.add(p.t);
  return [...set].sort((a, b) => a - b);
}
