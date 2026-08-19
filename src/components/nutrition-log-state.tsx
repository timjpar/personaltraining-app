"use client";

// The state behind one day's food log, lifted out of NutritionLogForm so the
// plan alongside it can write to the same rows.
//
// It moved here the moment the plan stopped being reference material. Ticking a
// food off the prescription has to land in the log, and the log's rows are the
// only place that can live — two copies synchronised by an effect would be two
// sources of truth for the same day, and the one that lost a race would be the
// one the athlete had typed into.
//
// Everything here was NutritionLogForm's local state and moved verbatim, apart
// from togglePlanFood and plannedKeys at the bottom, which are what the plan
// side needs.
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FOOD_SOURCE, type FoodSource } from "@/lib/constants";
import type { FoodMacros, FoodPreset } from "@/lib/food-presets";
import {
  normalizeFoodName,
  parseServings,
  scaleMacros,
  servingLabel,
} from "@/lib/food-presets";

export type MacroKey = "calories" | "protein" | "carbs" | "fat";

// The same row shape NutritionBuilder uses, plus the two things a log carries
// that a plan doesn't: which meal it belongs to, and where its numbers came
// from. `base` and `servings` stay client-only, exactly as they do there.
export type Row = {
  id: string;
  meal: string;
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  servings: string;
  base: FoodPreset | null;
  source: FoodSource;
};

export type InitialEntry = {
  meal: string;
  name: string;
  quantity: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  source: string;
};

// One food as it appears on a plan — the subset of Food the log can absorb.
export type PlanFood = {
  name: string;
  quantity: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

const numStr = (n: number | null | undefined) => (n == null ? "" : String(n));
const num = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const macroStrings = (m: FoodMacros) => ({
  calories: String(m.calories),
  protein: String(m.protein),
  carbs: String(m.carbs),
  fat: String(m.fat),
});

const blankRow = (id: string, meal = ""): Row => ({
  id,
  meal,
  name: "",
  quantity: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  servings: "",
  base: null,
  source: FOOD_SOURCE.MANUAL,
});

// What ties a row back to the plan food that produced it. Meal and name
// together, never name alone: a plan that puts blueberries in both breakfast
// and the pre-workout shake is ordinary, and keying on the name would let one
// tick check both boxes and one untick delete the wrong row.
export function planKey(meal: string, name: string): string {
  return `${normalizeFoodName(meal)}|${normalizeFoodName(name)}`;
}

// A plan food, dressed as a catalog preset so the servings box scales it. The
// plan's own quantity is the serving — tick the oats, then type 0.5 on a
// morning you only got through half of them.
function presetFromPlan(food: PlanFood): FoodPreset {
  return {
    name: food.name,
    serving: food.quantity?.trim() || "1 serving",
    calories: food.calories ?? 0,
    protein: food.protein ?? 0,
    carbs: food.carbs ?? 0,
    fat: food.fat ?? 0,
  };
}

type LogRows = {
  rows: Row[];
  addRow: () => void;
  addScanned: (foods: FoodPreset[], source: FoodSource) => void;
  removeRow: (id: string) => void;
  update: (id: string, fn: (row: Row) => Row) => void;
  applyPreset: (id: string, preset: FoodPreset) => void;
  clearPreset: (id: string) => void;
  setServings: (id: string, raw: string) => void;
  setName: (id: string, name: string) => void;
  setMacro: (id: string, key: MacroKey, value: string) => void;
  totals: FoodMacros;
  payload: Omit<Row, "id" | "base" | "servings">[];
  initialNotes: string | null;
  // The plan side of the bridge.
  togglePlanFood: (meal: string, food: PlanFood) => void;
  plannedKeys: Set<string>;
};

const LogRowsContext = createContext<LogRows | null>(null);

export function useLogRows(): LogRows {
  const ctx = useContext(LogRowsContext);
  if (!ctx) {
    throw new Error("useLogRows must be used inside <LogRowsProvider>.");
  }
  return ctx;
}

export function LogRowsProvider({
  initial,
  children,
}: {
  initial?: { notes: string | null; entries: InitialEntry[] };
  children: ReactNode;
}) {
  // Deterministic ids for server-rendered rows so hydration matches; rows added
  // later come from crypto.randomUUID(). Same contract as NutritionBuilder.
  //
  // No rehydrate() here, unlike the builder: a log row's preset link only
  // matters while you're editing the row you just added, and reattaching it on
  // load would let a later nudge of the servings box overwrite numbers the
  // athlete typed. Reopening a saved day gives you the numbers, not the formula.
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.entries.length
      ? initial.entries.map((e, i) => ({
          ...blankRow(`e${i}`, e.meal),
          name: e.name,
          quantity: e.quantity ?? "",
          calories: numStr(e.calories),
          protein: numStr(e.protein),
          carbs: numStr(e.carbs),
          fat: numStr(e.fat),
          source: e.source as FoodSource,
        }))
      : [blankRow("e0", "Breakfast")],
  );

  const addRow = () =>
    setRows((rs) => [
      ...rs,
      // Inherits the last row's meal label: foods arrive in clumps, so the
      // common case is another item in the meal you're already logging.
      blankRow(crypto.randomUUID(), rs[rs.length - 1]?.meal ?? ""),
    ]);

  // A scan lands as one or more filled rows, already linked to their preset so
  // the servings box scales them — the same state a catalog pick produces, so
  // nothing downstream has to know a camera was involved.
  const addScanned = (foods: FoodPreset[], source: FoodSource) =>
    setRows((rs) => {
      const meal = rs[rs.length - 1]?.meal ?? "";
      const scanned = foods.map((preset) => ({
        ...blankRow(crypto.randomUUID(), meal),
        name: preset.name,
        base: preset,
        servings: "1",
        quantity: servingLabel(preset, 1),
        source,
        ...macroStrings(scaleMacros(preset, 1)),
      }));
      // An untouched blank starter row is replaced rather than left above the
      // result — it's scaffolding, not something the athlete typed.
      const keep = rs.filter((r) => r.name.trim() !== "");
      return [...keep, ...scanned];
    });

  const removeRow = (id: string) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : [blankRow(crypto.randomUUID())]));

  const update = (id: string, fn: (row: Row) => Row) =>
    setRows((rs) => rs.map((r) => (r.id === id ? fn(r) : r)));

  // Picking from the catalog fills the row with one serving's macros.
  const applyPreset = (id: string, preset: FoodPreset) =>
    update(id, (r) => ({
      ...r,
      name: preset.name,
      base: preset,
      servings: "1",
      quantity: servingLabel(preset, 1),
      source: FOOD_SOURCE.PRESET,
      ...macroStrings(scaleMacros(preset, 1)),
    }));

  const clearPreset = (id: string) =>
    update(id, (r) => ({
      ...r,
      base: null,
      servings: "",
      source: FOOD_SOURCE.MANUAL,
    }));

  // Always scaled from the base, never from what's on screen, so 1 → 2 → 1
  // lands back on the exact original figures.
  const setServings = (id: string, raw: string) =>
    update(id, (r) => {
      const n = parseServings(raw);
      // Mid-keystroke ("1." or an empty box) must not rewrite the macros.
      if (!r.base || n == null) return { ...r, servings: raw };
      return {
        ...r,
        servings: raw,
        quantity: servingLabel(r.base, n),
        ...macroStrings(scaleMacros(r.base, n)),
      };
    });

  // Renaming past the preset drops the link but keeps the numbers — the
  // athlete's figures are never destroyed as a side effect of an edit.
  const setName = (id: string, name: string) =>
    update(id, (r) => {
      const stillPreset =
        r.base && normalizeFoodName(name) === normalizeFoodName(r.base.name);
      return stillPreset
        ? { ...r, name }
        : { ...r, name, base: null, servings: "", source: FOOD_SOURCE.MANUAL };
    });

  // Same rule for a hand-edited macro: once a number stops matching the scaled
  // serving, the row belongs to the athlete and the servings box goes inert.
  const setMacro = (id: string, key: MacroKey, value: string) =>
    update(id, (r) => {
      const next = { ...r, [key]: value };
      const n = parseServings(r.servings);
      if (!r.base || n == null) return next;
      const expected = String(scaleMacros(r.base, n)[key]);
      return value === expected
        ? next
        : { ...next, base: null, servings: "", source: FOOD_SOURCE.MANUAL };
    });

  // Tick: the plan food arrives as a filled row. Untick: that row goes away.
  //
  // Untick only ever removes a row still matching the plan — edit the name or
  // the macros and setName/setMacro have already broken the link, so the box
  // reads unticked and the row you changed is left alone. Nothing an athlete
  // typed is removed by a checkbox.
  const togglePlanFood = (meal: string, food: PlanFood) =>
    setRows((rs) => {
      const key = planKey(meal, food.name);
      const existing = rs.filter((r) => planKey(r.meal, r.name) === key);
      if (existing.length > 0) {
        const left = rs.filter((r) => planKey(r.meal, r.name) !== key);
        return left.length > 0 ? left : [blankRow(crypto.randomUUID(), meal)];
      }

      const preset = presetFromPlan(food);
      const added: Row = {
        ...blankRow(crypto.randomUUID(), meal),
        name: food.name,
        base: preset,
        servings: "1",
        quantity: servingLabel(preset, 1),
        source: FOOD_SOURCE.PLAN,
        ...macroStrings(scaleMacros(preset, 1)),
      };
      // Only a pristine form is replaced. addScanned drops every empty row, but
      // a tick is a smaller gesture than a scan: if the athlete has a row open
      // and half-typed, it is not scaffolding and it stays.
      const pristine = rs.every((r) => r.name.trim() === "");
      return pristine ? [added] : [...rs, added];
    });

  // Which plan foods are already in the log, for the checkboxes to read.
  const plannedKeys = useMemo(
    () =>
      new Set(
        rows
          .filter((r) => r.name.trim() !== "")
          .map((r) => planKey(r.meal, r.name)),
      ),
    [rows],
  );

  const totals = rows.reduce(
    (acc, r) => {
      acc.calories += num(r.calories);
      acc.protein += num(r.protein);
      acc.carbs += num(r.carbs);
      acc.fat += num(r.fat);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  // Only the persisted fields travel. `base` is a whole preset object per row,
  // and `servings`/`id` mean nothing to the server.
  const payload = useMemo(
    () =>
      rows.map(({ meal, name, quantity, calories, protein, carbs, fat, source }) => ({
        meal,
        name,
        quantity,
        calories,
        protein,
        carbs,
        fat,
        source,
      })),
    [rows],
  );

  const value: LogRows = {
    rows,
    addRow,
    addScanned,
    removeRow,
    update,
    applyPreset,
    clearPreset,
    setServings,
    setName,
    setMacro,
    totals,
    payload,
    initialNotes: initial?.notes ?? null,
    togglePlanFood,
    plannedKeys,
  };

  return (
    <LogRowsContext.Provider value={value}>{children}</LogRowsContext.Provider>
  );
}
