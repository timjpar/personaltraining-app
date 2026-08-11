"use client";

// The multi-series trend chart: pick metrics, get lines.
//
// Generic over its row and its context, and it knows nothing about bodies or
// food — BodyTrend and NutritionTrend hand it a registry. It replaced a
// bodyweight sparkline (WeightTrend, now deleted) and kept two of its
// decisions: preserveAspectRatio="none" so the shape fills whatever width the
// card gives it, and vectorEffect="non-scaling-stroke" on every stroked
// element so the line keeps its weight while the geometry stretches.
//
// What is new is text. Tick labels can't live inside a non-uniformly scaled
// viewBox without being stretched with it, so the SVG holds geometry only and
// every label is HTML in a layer beside it, positioned with the *same* xFrac
// and yFrac functions expressed as percentages. One coordinate system, two
// syntaxes, no way for the two layers to drift.
//
// The alternative — measuring the element and using a pixel viewBox — makes
// text trivial and was rejected: it ships an empty box until hydration and
// nothing at all without JavaScript, which is a poor trade for the centrepiece
// of the page.
//
// One thing worth knowing before reading a slope off it: because x stretches
// with the card, the same data climbs more steeply on a phone than on a
// desktop. That's acceptable here because every comparison the chart invites is
// between series inside one render, where the stretch applies to all of them
// equally.

import { useCallback, useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { SERIES_DASH, SERIES_INK, type Metric, type TrendRow } from "@/lib/metrics";
import {
  ascending,
  buildSeries,
  domainFor,
  nearestIndex,
  niceScale,
  RANGES,
  stopsFor,
  withinRange,
  type RangeKey,
} from "@/lib/trend-scale";
import type { Units } from "@/lib/constants";

// Six, not fourteen. Every metric is selectable; six at a time are readable.
// Past that the lines spend more time crossing each other than saying anything,
// and the legend stops fitting on a phone.
export const MAX_VISIBLE = 6;

// Shorter than the plotted dash so it reads as dashed inside a 14px swatch.
const SWATCH_DASH = "4 3";

function Swatch({
  slot,
  dashed,
  dim,
}: {
  slot: number;
  dashed: boolean;
  dim?: boolean;
}) {
  return (
    <svg
      width="14"
      height="8"
      viewBox="0 0 14 8"
      aria-hidden
      className={cn("shrink-0", dim && "opacity-40")}
      style={{ color: SERIES_INK[slot] }}
    >
      <line
        x1="0"
        y1="4"
        x2="14"
        y2="4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap={dashed ? "butt" : "round"}
        strokeDasharray={dashed ? SWATCH_DASH : undefined}
      />
    </svg>
  );
}

// `signed` is for the indexed axis, where "−1.5" and "+1.5" are different
// readings and an unsigned tick is ambiguous exactly where it matters.
function format(v: number, decimals: number, unit: string, signed = false) {
  const body = signed
    ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(decimals)}`
    : v.toFixed(decimals);
  if (!unit) return body;
  return unit === "%" ? `${body}%` : `${body} ${unit}`;
}

export function TrendChart<Row extends TrendRow, Ctx>({
  rows,
  metrics,
  ctx,
  units,
  selected,
  onSelect,
  range,
  onRange,
  label,
}: {
  rows: Row[];
  metrics: Metric<Row, Ctx>[];
  ctx: Ctx;
  units: Units;
  selected: ReadonlySet<string>;
  onSelect: (next: ReadonlySet<string>) => void;
  range: RangeKey;
  onRange: (next: RangeKey) => void;
  // Names the thing being charted, for the image description: "weigh-ins".
  label: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [showAllChips, setShowAllChips] = useState(false);
  const readoutId = useId();

  const all = useMemo(() => ascending(rows), [rows]);

  // Windowed before anything else, so the whole chart — domain, ticks,
  // crosshair stops, and the indexed baseline — is computed over the range the
  // reader picked rather than over everything and then cropped.
  const sorted = useMemo(() => withinRange(all, range), [all, range]);

  // Availability is computed for every metric, not just the selected ones —
  // an unselected chip has to be able to say why it can't be picked. Cheap:
  // fourteen extractors over sixty rows.
  //
  // Deliberately over `all` rather than the windowed rows. A waist logged in
  // March is logged, and greying its chip out because the reader is looking at
  // this week would say "not logged" about a measurement they took. Whether it
  // has anything to draw *in this window* is the chart's problem, not the
  // chip's, and the blank state answers it.
  const availability = useMemo(() => {
    const map = new Map<string, { reason: string | null }>();
    for (const m of metrics) {
      const blocked = m.blocked?.(ctx) ?? null;
      if (blocked) {
        map.set(m.key, { reason: blocked });
        continue;
      }
      const has = all.some((r) => {
        const v = m.value(r, ctx);
        return v != null && Number.isFinite(v);
      });
      map.set(m.key, { reason: has ? null : (m.emptyHint ?? "not logged") });
    }
    return map;
  }, [metrics, all, ctx]);

  const drawn = useMemo(
    () => metrics.filter((m) => selected.has(m.key) && !availability.get(m.key)?.reason),
    [metrics, selected, availability],
  );

  const built = useMemo(
    () => buildSeries({ rows: sorted, metrics: drawn, ctx, units }),
    [sorted, drawn, ctx, units],
  );

  const { mode, series, dropped } = built;

  const { scale, shownRefs } = useMemo(() => {
    // In indexed mode the axis is percent, so a flat band of ±1% is the right
    // window; in absolute mode the family says what a sensible band is.
    const flatPad = mode === "indexed" ? 1 : (drawn[0]?.family.flatPad ?? 1);
    const { lo, hi, references } = domainFor(series, flatPad);
    // niceScale only ever widens, so a reference that fit the raw domain still
    // fits this one.
    return { scale: niceScale(lo, hi), shownRefs: new Set(references) };
  }, [series, mode, drawn]);

  const stops = useMemo(() => stopsFor(series), [series]);

  const tMin = sorted[0]?.t ?? 0;
  const tMax = sorted[sorted.length - 1]?.t ?? 0;
  const tSpan = tMax - tMin;

  // x is proportional to time, not to index — readings are irregular, and even
  // spacing would draw a three-week gap as though it were a week. The domain is
  // the full span of the rows and does NOT follow the selection: toggling a
  // line is turning a layer on and off, and re-fitting x would slide every
  // other line sideways underneath it.
  const xFrac = useCallback(
    (t: number) => (tSpan === 0 ? 0.5 : (t - tMin) / tSpan),
    [tMin, tSpan],
  );
  const yFrac = useCallback(
    (v: number) => (scale.hi - v) / (scale.hi - scale.lo),
    [scale],
  );

  const toggle = useCallback(
    (key: string) => {
      const next = new Set(selected);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onSelect(next);
      setActive(null);
    },
    [selected, onSelect],
  );

  const atCap = drawn.length >= MAX_VISIBLE;

  // Primaries always, anything selected always, everything when asked. The
  // second clause is the load-bearing one: without it, expanding the row,
  // picking Waist and collapsing again would leave a line on the chart with no
  // chip to turn it off.
  const hidden = useMemo(
    () => metrics.filter((m) => !m.primary && !selected.has(m.key)),
    [metrics, selected],
  );
  const shownChips = useMemo(
    () =>
      showAllChips
        ? metrics
        : metrics.filter((m) => m.primary || selected.has(m.key)),
    [metrics, selected, showAllChips],
  );

  const track = useCallback(
    (clientX: number, el: HTMLElement) => {
      if (stops.length === 0) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      const frac = (clientX - rect.left) / rect.width;
      setActive(nearestIndex(stops, tMin + frac * tSpan));
    },
    [stops, tMin, tSpan],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (stops.length === 0) return;
      const at = active ?? stops.length - 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActive(Math.max(0, at - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActive(Math.min(stops.length - 1, at + 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        setActive(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActive(stops.length - 1);
      } else if (e.key === "Escape") {
        setActive(null);
      }
    },
    [active, stops.length],
  );

  const activeT = active != null ? stops[active] : null;
  // flatMap rather than map+filter: a type predicate over a found-or-undefined
  // pair is more ceremony than the narrowing is worth.
  const readings =
    activeT == null
      ? []
      : series.flatMap((s) => {
          const p = s.points.find((q) => q.t === activeT);
          return p ? [{ s, p }] : [];
        });
  const activeRow =
    activeT == null ? null : (sorted.find((r) => r.t === activeT) ?? null);

  // Four labels at even *time* positions, snapped to the nearest real reading,
  // deduped. Even index spacing would bunch them wherever the weigh-ins bunch.
  const xTicks = useMemo(() => {
    if (sorted.length === 0) return [];
    if (tSpan === 0) return [sorted[0]];
    const times = sorted.map((r) => r.t);
    const picked = new Set<number>();
    const out: Row[] = [];
    for (let i = 0; i < 4; i++) {
      const target = tMin + (i / 3) * tSpan;
      const idx = nearestIndex(times, target);
      if (!picked.has(idx)) {
        picked.add(idx);
        out.push(sorted[idx]);
      }
    }
    return out;
  }, [sorted, tMin, tSpan]);

  // An empty chart still draws its frame, and the chips are always on screen.
  // Hiding the whole thing until someone logs a second reading — which is what
  // the sparkline this replaced did — leaves a coach opening a new athlete's
  // file unable to tell whether the app tracks a waist measurement at all. The
  // greyed chips answer exactly that, so they are the part that must not
  // disappear; the plot area holds the reason it is blank.
  const empty = series.length === 0;
  const rangeLabel =
    RANGES.find((r) => r.key === range)?.label.toLowerCase() ?? "range";
  const emptyMessage =
    all.length === 0
      ? "Nothing logged yet. Lines appear here from the first entry."
      : drawn.length === 0
        ? "Pick a metric above to plot it."
        : sorted.length === 0
          ? `Nothing logged in the last ${rangeLabel}. Try a wider range.`
          : `Nothing logged in the last ${rangeLabel} for the metrics picked.`;

  const description = empty
    ? emptyMessage
    : `${series.map((s) => s.label).join(", ")} for ${label} from ${
        sorted[0]?.short ?? ""
      } to ${sorted[sorted.length - 1]?.short ?? ""}, ${
        mode === "indexed"
          ? "shown as percent change from each series' first reading"
          : `in ${built.unit || "index units"}`
      }.`;

  return (
    <div>
      {/* Chips. A set of independent toggles, so aria-pressed buttons in a
          group rather than a radio-style control. Unavailable ones are
          aria-disabled and NOT disabled: a real `disabled` button drops out of
          the tab order, which hides the explanation from the person most
          likely to need it. */}
      <div role="group" aria-label="Metrics" className="flex flex-wrap gap-1.5">
        {shownChips.map((m) => {
          const reason = availability.get(m.key)?.reason ?? null;
          const on = selected.has(m.key) && !reason;
          const capped = !on && !reason && atCap;
          const off = reason ?? (capped ? `${MAX_VISIBLE} at a time` : null);
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={on}
              aria-disabled={off ? true : undefined}
              // The reason is hidden below `sm` to keep the row packable, so
              // the accessible name has to carry it at every width — otherwise
              // a phone screen-reader hears fourteen identical dimmed chips.
              aria-label={off ? `${m.label} — ${off}` : m.label}
              title={off ?? undefined}
              onClick={() => {
                if (off) return;
                toggle(m.key);
              }}
              className={cn(
                "eyebrow inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 transition-colors sm:min-h-0 sm:px-2.5 sm:py-1",
                // Deliberately not the house jade active-chip style. jade means
                // action and completion here; which line is showing is
                // identity, and identity is what the swatch carries.
                on
                  ? "border-ink/40 bg-paper text-ink"
                  : "border-line text-ink-soft hover:border-ink/30 hover:text-ink",
                off && "cursor-default opacity-55 hover:border-line hover:text-ink-soft",
              )}
            >
              <Swatch slot={m.slot} dashed={m.dashed} dim={!on} />
              {m.label}
              {/* A glyph, not a nested button — the whole chip already removes
                  the line when it's on, so a second control inside it would be
                  invalid markup for no new behaviour. aria-hidden because
                  aria-pressed on the chip is what actually says "this is on,
                  activating turns it off". */}
              {on ? (
                <span
                  aria-hidden
                  className="-mr-0.5 text-sm leading-none text-ink-soft/70"
                >
                  ×
                </span>
              ) : null}
              {/* Desktop only. Fourteen chips each carrying "not logged" is
                  three tidy rows at 1280px and fourteen stacked rows at 375px,
                  which buries the chart under its own legend. The dimming
                  still reads as unavailable on a phone, and aria-label above
                  keeps the reason for anyone who can't see the dimming. */}
              {off ? (
                <span className="hidden font-normal normal-case tracking-normal text-ink-soft/70 sm:inline">
                  {off}
                </span>
              ) : null}
            </button>
          );
        })}

        {hidden.length > 0 || showAllChips ? (
          <button
            type="button"
            onClick={() => setShowAllChips((v) => !v)}
            aria-expanded={showAllChips}
            className="eyebrow inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-line px-3 text-ink-soft transition-colors hover:border-ink/30 hover:text-ink sm:min-h-0 sm:px-2.5 sm:py-1"
          >
            {showAllChips ? "Fewer" : `+${hidden.length} more`}
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {/* No caption when there is no axis to describe. An empty frame
            labelled "In kg" would be claiming a scale it doesn't have. */}
        <p className="eyebrow text-ink-soft/70">
          {empty
            ? "\u00a0"
            : mode === "indexed"
              ? "% change from each line\u2019s first reading"
              : built.unit
                ? `In ${built.unit}`
                : "Index"}
        </p>

        {/* Segmented, and wearing the accent when active — this is a control,
            not a series, which is exactly why the metric chips avoid jade and
            this doesn't. Hidden when there is no data at all, where every
            option shows the same nothing. */}
        {all.length > 0 ? (
          <div
            role="group"
            aria-label="Time range"
            className="inline-flex rounded-[var(--radius-sm)] border border-line bg-card p-0.5"
          >
            {RANGES.map((r) => {
              const on = r.key === range;
              return (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    if (on) return;
                    onRange(r.key);
                    setActive(null);
                  }}
                  className={cn(
                    "eyebrow min-h-9 rounded-[calc(var(--radius-sm)-2px)] px-2 transition-colors sm:min-h-8 sm:px-2.5",
                    on
                      ? "bg-jade-wash text-jade-strong"
                      : "text-ink-soft hover:text-ink",
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

        <div className="mt-1.5 grid grid-cols-[2.75rem_1fr] gap-x-1">
          {/* y labels. aria-hidden because the SVG's own description and the
              table below are the accessible representations — read aloud,
              this layer is a stream of bare numbers. */}
          <div aria-hidden className="relative h-52">
            {empty
              ? null
              : scale.ticks.map((tick) => (
                  <span
                    key={tick}
                    className="metric absolute right-0 -translate-y-1/2 text-[0.625rem] leading-none text-ink-soft/70"
                    style={{ top: `${yFrac(tick) * 100}%` }}
                  >
                    {format(tick, built.decimals, "", mode === "indexed")}
                  </span>
                ))}
          </div>

          <div
            // touch-pan-y is what keeps the page scrollable: without it a
            // vertical swipe starting on the chart is swallowed and a phone
            // reader is stuck. Horizontal drags still scrub the crosshair.
            //
            // Focusable but deliberately un-roled — `role="application"`
            // would force arrow keys through to this handler at the cost of
            // taking a screen-reader user out of browse mode over the whole
            // card. The table below is the real accessible representation,
            // so the keyboard crosshair is a convenience, not the only way in.
            className="relative h-52 touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
            // Nothing to scrub when there's nothing drawn, so the empty
            // frame stays out of the tab order rather than offering a
            // crosshair that can't move.
            tabIndex={empty ? undefined : 0}
            aria-label={
              empty ? undefined : `${label} chart. Use arrow keys to read values.`
            }
            aria-describedby={empty ? undefined : readoutId}
            onPointerMove={
              empty ? undefined : (e) => track(e.clientX, e.currentTarget)
            }
            onPointerDown={
              empty ? undefined : (e) => track(e.clientX, e.currentTarget)
            }
            onPointerLeave={(e) => {
              // A touch reading has to survive lifting the finger — there is
              // no hover on a phone, so clearing here would make the tooltip
              // impossible to read. It clears on the next touch or a toggle.
              if (e.pointerType !== "touch") setActive(null);
            }}
            onKeyDown={empty ? undefined : onKeyDown}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              // The first and last points sit on x=0 and x=100 and their round
              // caps would be sliced in half by the viewport clip. One class,
              // and the card's own padding absorbs the few pixels of bleed.
              className="h-full w-full overflow-visible"
              role="img"
            >
              <title>{description}</title>

              {/* Evenly spaced placeholders when there is no scale, so the
                  blank state reads as a chart waiting for data rather than an
                  empty box. Fainter than real gridlines — they mark out the
                  shape without implying values. */}
              {empty
                ? [0, 25, 50, 75, 100].map((pct) => (
                    <line
                      key={pct}
                      x1={0}
                      x2={100}
                      y1={pct}
                      y2={pct}
                      className="stroke-line/40"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))
                : scale.ticks.map((tick) => {
                    const zero = mode === "indexed" && Math.abs(tick) < 1e-9;
                    return (
                      <line
                        key={tick}
                        x1={0}
                        x2={100}
                        y1={yFrac(tick) * 100}
                        y2={yFrac(tick) * 100}
                        className={zero ? "stroke-line" : "stroke-line/50"}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}

              {/* Reference lines — goal weight, calorie target. Neutral and
                  dashed so they read as chrome rather than as a series, and
                  absent in indexed mode, where a goal has no position.
                  domainFor decides which ones are worth the vertical room; the
                  rest are off-chart rather than squashing every reading into a
                  flat line to reach them. */}
              {series.map((s) =>
                s.reference == null || !shownRefs.has(s.key) ? null : (
                  <line
                    key={`ref-${s.key}`}
                    x1={0}
                    x2={100}
                    y1={yFrac(s.reference) * 100}
                    y2={yFrac(s.reference) * 100}
                    className="stroke-ink-soft/50"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    vectorEffect="non-scaling-stroke"
                  />
                ),
              )}

              {activeT != null ? (
                <line
                  x1={xFrac(activeT) * 100}
                  x2={xFrac(activeT) * 100}
                  y1={0}
                  y2={100}
                  className="stroke-ink/30"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}

              {/* One <g> per series carrying the colour as `color`, with
                  currentColor on the children. This is the only place in the
                  app that sets a colour outside a token class, and it is
                  forced: Tailwind can't generate a class name built at
                  runtime, and the slot is only known then. */}
              {series.map((s) => {
                // Markers on every reading while a series is sparse, and only
                // on the newest once it isn't. Four dots and three segments
                // reads unmistakably as four readings; forty dots reads as a
                // caterpillar.
                const showAll = s.points.length <= 12;
                return (
                  <g key={s.key} style={{ color: SERIES_INK[s.slot] }}>
                    {s.points.length > 1 ? (
                      <polyline
                        points={s.points
                          .map((p) => `${xFrac(p.t) * 100},${yFrac(p.v) * 100}`)
                          .join(" ")}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={s.dashed ? SERIES_DASH : undefined}
                        vectorEffect="non-scaling-stroke"
                      />
                    ) : null}

                    {s.points.map((p, i) => {
                      const last = i === s.points.length - 1;
                      if (!showAll && !last && p.t !== activeT) return null;
                      const cx = xFrac(p.t) * 100;
                      const cy = yFrac(p.v) * 100;
                      // A zero-length round-capped line, not a <circle>: the
                      // non-uniform scale would draw a circle as an ellipse,
                      // while a capped stroke is exempt from the transform
                      // like everything else here. The wider one underneath
                      // is the surface ring that keeps overlapping series
                      // legible.
                      return (
                        <g key={p.t}>
                          <line
                            x1={cx}
                            y1={cy}
                            x2={cx}
                            y2={cy}
                            className="stroke-card"
                            strokeWidth={last || p.t === activeT ? 9 : 7}
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                          <line
                            x1={cx}
                            y1={cy}
                            x2={cx}
                            y2={cy}
                            stroke="currentColor"
                            strokeWidth={last || p.t === activeT ? 6 : 4}
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>

            {empty ? (
              <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-ink-soft">
                {emptyMessage}
              </p>
            ) : null}

            {/* Pinned to the top rather than following the pointer. That one
                choice removes every vertical collision case and keeps the
                card out from under a thumb on a phone. */}
            {activeT != null && readings.length > 0 ? (
              <div
                className="pointer-events-none absolute top-0 z-10"
                style={{ left: `${xFrac(activeT) * 100}%` }}
              >
                <div
                  className={cn(
                    "w-max rounded-[var(--radius-sm)] border border-line bg-card px-2.5 py-2 shadow-[var(--shadow-card)]",
                    xFrac(activeT) > 0.5 ? "-ml-2 -translate-x-full" : "ml-2",
                  )}
                >
                  <p className="eyebrow text-ink-soft/70">
                    {activeRow?.label ?? ""}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {readings.map(({ s, p }) => (
                      <li
                        key={s.key}
                        className="flex items-center gap-1.5 text-xs leading-none"
                      >
                        <Swatch slot={s.slot} dashed={s.dashed} />
                        {/* Always the real reading, never the indexed one —
                            the chart answers "which moved more", this
                            answers "what was it". */}
                        <span className="metric text-ink">
                          {format(p.display, s.decimals, s.unit)}
                        </span>
                        <span className="text-ink-soft">{s.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>

          <div />
          <div aria-hidden className="relative mt-1.5 h-3">
            {empty
              ? null
              : xTicks.map((r) => (
              <span
                key={r.t}
                className={cn(
                  "metric absolute text-[0.625rem] leading-none text-ink-soft/70",
                  xFrac(r.t) === 0
                    ? "left-0"
                    : xFrac(r.t) === 1
                      ? "right-0"
                      : "-translate-x-1/2",
                )}
                style={
                  xFrac(r.t) === 0 || xFrac(r.t) === 1
                    ? undefined
                    : { left: `${xFrac(r.t) * 100}%` }
                }
              >
                {r.short}
              </span>
            ))}
          </div>
        </div>

        {/* The keyboard readout. Mirrors the tooltip so arrowing along the
            chart announces the same thing hovering shows. Omitted when the
            frame is empty: the placeholder inside the plot is ordinary visible
            text, so a second copy here would just read it twice. */}
        {empty ? null : (
          <p id={readoutId} className="sr-only" role="status">
            {activeT == null
              ? description
              : `${activeRow?.label ?? ""}: ${readings
                  .map((r) => `${r.s.label} ${format(r.p.display, r.s.decimals, r.s.unit)}`)
                  .join(", ")}`}
          </p>
        )}

        {dropped.length > 0 ? (
          <p className="mt-3 text-xs text-ink-soft">
            {dropped.map((d) => d.label).join(" and ")}{" "}
            {dropped.length === 1 ? "starts" : "start"} at zero, so{" "}
            {dropped.length === 1 ? "it has" : "they have"} no percent change
            to show.
          </p>
        ) : null}

        {series.length > 0 ? (
          <details className="mt-4">
            <summary className="metric inline-flex min-h-9 cursor-pointer items-center text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0">
              Show these as a table
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-max text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th className="eyebrow py-2 pr-4 font-medium text-ink-soft/70">
                      Date
                    </th>
                    {series.map((s) => (
                      <th
                        key={s.key}
                        className="eyebrow py-2 pr-4 font-medium text-ink-soft/70"
                      >
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...stops].reverse().map((t) => {
                    const row = sorted.find((r) => r.t === t);
                    return (
                      <tr key={t}>
                        <td className="metric whitespace-nowrap py-2 pr-4 text-xs text-ink-soft">
                          {row?.label ?? ""}
                        </td>
                        {series.map((s) => {
                          const p = s.points.find((q) => q.t === t);
                          return (
                            <td
                              key={s.key}
                              className="metric whitespace-nowrap py-2 pr-4 text-xs text-ink"
                            >
                              {p ? format(p.display, s.decimals, s.unit) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}
    </div>
  );
}
