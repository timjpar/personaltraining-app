"use client";

// The nutrition registry, bound to the chart. BodyTrend's twin — see the note
// at the top of that file for why the wrapper is the mechanism rather than
// ceremony.

import { useMemo } from "react";
import { TrendChart } from "@/components/TrendChart";
import {
  NUTRITION_METRICS,
  type NutritionCtx,
  type NutritionRow,
} from "@/lib/metrics";
import { useStoredSet } from "@/lib/use-stored-set";
import type { Units } from "@/lib/constants";

const KEY = "chalkline.trend.nutrition.v1";

// Calories alone. Picking the three macros as well would open on a percent-change
// axis, because grams and kilocalories are different families — correct, but a
// strange first thing to show someone.
const DEFAULT: readonly string[] = ["calories"];
const VALID: ReadonlySet<string> = new Set(NUTRITION_METRICS.map((m) => m.key));

export function NutritionTrend({
  rows,
  targets,
  units,
}: {
  rows: NutritionRow[];
  targets: NutritionCtx["targets"];
  units: Units;
}) {
  const [selected, setSelected] = useStoredSet(KEY, DEFAULT, VALID);

  const ctx = useMemo<NutritionCtx>(() => ({ targets }), [targets]);

  return (
    <TrendChart
      rows={rows}
      metrics={NUTRITION_METRICS}
      ctx={ctx}
      units={units}
      selected={selected}
      onSelect={setSelected}
      label="food log"
    />
  );
}
