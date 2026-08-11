"use client";

// The body registry, bound to the chart.
//
// This file exists because a registry holds functions and functions don't cross
// the server/client boundary — a page can't pass BODY_METRICS to TrendChart as
// a prop. Something on the client has to import it, and that something is the
// natural home for the storage key and the opening selection too.

import { useMemo } from "react";
import { TrendChart } from "@/components/TrendChart";
import { BODY_METRICS, type BodyCtx, type BodyRow } from "@/lib/metrics";
import { toRangeKey } from "@/lib/trend-scale";
import { useStoredSet, useStoredValue } from "@/lib/use-stored-set";
import type { Units } from "@/lib/constants";

// Versioned: the parser drops keys it doesn't recognise, but a change to what a
// key *means* needs a new namespace rather than a silent reinterpretation.
const KEY = "chalkline.trend.body.v1";
const RANGE_KEY = "chalkline.trend.body.range.v1";

// Weight alone, which is exactly what this card showed before the chart existed
// — opening on six lines would make the page feel like someone else's dashboard.
// Module constants, not literals in the call: a fresh array every render would
// re-run the parse in useStoredSet on every keystroke elsewhere on the page.
const DEFAULT: readonly string[] = ["weight"];
const VALID: ReadonlySet<string> = new Set(BODY_METRICS.map((m) => m.key));

export function BodyTrend({
  rows,
  heightCm,
  goalWeightKg,
  possessive,
  units,
}: {
  rows: BodyRow[];
  heightCm: number | null;
  goalWeightKg: number | null;
  possessive: string;
  units: Units;
}) {
  const [selected, setSelected] = useStoredSet(KEY, DEFAULT, VALID);
  const [range, setRange] = useStoredValue(RANGE_KEY, toRangeKey);

  const ctx = useMemo<BodyCtx>(
    () => ({ heightCm, goalWeightKg, possessive }),
    [heightCm, goalWeightKg, possessive],
  );

  return (
    <TrendChart
      rows={rows}
      metrics={BODY_METRICS}
      ctx={ctx}
      units={units}
      selected={selected}
      onSelect={setSelected}
      range={range}
      onRange={setRange}
      label="weigh-ins"
    />
  );
}
