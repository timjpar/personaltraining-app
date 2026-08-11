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

// The vertical window. References are folded in or a goal line sitting above
// every reading clips off the top of the chart — the bug WeightTrend avoids by
// pushing goalKg into its value list before taking the extent.
export function domainFor(
  series: PlotSeries[],
  flatPad: number,
): { lo: number; hi: number } {
  const values: number[] = [];
  for (const s of series) {
    for (const p of s.points) values.push(p.v);
    if (s.reference != null) values.push(s.reference);
  }
  if (values.length === 0) return { lo: 0, hi: 1 };

  let lo = Math.min(...values);
  let hi = Math.max(...values);

  // Every reading identical, or a single reading. Open a window around it
  // rather than dividing by a zero range — a flat weight belongs in the middle
  // of a sensible band, not pinned to an edge.
  if (hi - lo < Number.EPSILON) {
    lo -= flatPad;
    hi += flatPad;
  }
  return { lo, hi };
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
