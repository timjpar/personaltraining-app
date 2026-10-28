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
// How a row is edited — scaling, units, what breaks the preset link — is
// src/lib/food-rows.ts, shared with the coach's builder. What's left here is
// what only a log has: the meal label, the plan group a row was ticked off as
// part of, where the numbers came from, and the bridge to the plan
// (togglePlanFood and isPlanned at the bottom).
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FOOD_SOURCE, type FoodSource } from "@/lib/constants";
import type { AmountUnit } from "@/lib/food-amounts";
import { foodBlocks, groupLabel } from "@/lib/food-groups";
import {
  foodDetail,
  foodForms,
  normalizeFoodName,
  type FoodMacros,
  type FoodPreset,
  type StoredFood,
} from "@/lib/food-presets";
import * as foodRows from "@/lib/food-rows";
import type { FoodRowFields, MacroKey } from "@/lib/food-rows";
import type { NutrientKey, NutrientTotals } from "@/lib/nutrients";

export type { MacroKey } from "@/lib/food-rows";

// The shared row, plus what a log carries that a plan doesn't: which meal it
// belongs to, and where its numbers came from. And the plan group it was
// ticked off as part of — groupName is the saved label, groupId the client-only
// id every row of that run shares, so the form can hold a group together while
// its meal is retyped or one of its foods is taken out.
export type Row = FoodRowFields & {
  id: string;
  meal: string;
  groupName: string | null;
  groupId: string | null;
  source: FoodSource;
};

export type InitialEntry = StoredFood & {
  meal: string;
  groupName?: string | null;
  source: string;
};

// One food as it appears on a plan — the subset of Food the log can absorb.
export type PlanFood = StoredFood & { groupName?: string | null };

const blankRow = (id: string, meal = ""): Row => ({
  ...foodRows.blankFoodFields(),
  id,
  meal,
  groupName: null,
  groupId: null,
  source: FOOD_SOURCE.MANUAL,
});

// What ties a row back to the plan food that produced it. Meal, group and name
// together, never name alone: a plan that puts blueberries in both breakfast
// and the pre-workout shake is ordinary, and so is one with blueberries in the
// smoothie and on the yogurt in the same breakfast. Keying on less would let
// one tick check both boxes and one untick delete the wrong row.
//
// Forms of one food key as the first of them, so frozen blueberries logged in
// place of the plan's fresh ones still tick it off, and unticking takes them
// out. The cost is a plan with fresh and frozen in the same group of the same
// meal, where one tick would answer for both.
export function planKey(
  meal: string,
  food: { name: string; groupName?: string | null },
): string {
  const name = foodForms(food.name)?.[0].name ?? food.name;
  return [meal, food.groupName ?? "", name].map(normalizeFoodName).join("|");
}

// Whether a log row answers for a plan food. A row with no group still counts
// for the food of that name in that meal, whatever group the plan puts it in:
// it was typed by hand, or ticked before the log kept groups. Read as unticked,
// a morning logged off the plan would invite a second tick that logs every
// food twice.
function answersFor(
  row: { meal: string; name: string; groupName: string | null },
  meal: string,
  food: PlanFood,
): boolean {
  const key = planKey(row.meal, row);
  return (
    key === planKey(meal, food) ||
    (!row.groupName && key === planKey(meal, { name: food.name }))
  );
}

// A saved day comes back as flat rows with labels, so its groups are found the
// way a plan's are — runs of adjacent rows, here in the same meal — and each
// run gets an id. Derived from the first row's id, which is deterministic for
// server-rendered rows, so hydration matches.
function withGroupIds(rows: Row[]): Row[] {
  return foodBlocks(rows, (r) =>
    r.groupName ? `${normalizeFoodName(r.meal)}|${r.groupName}` : null,
  ).flatMap((block) =>
    block.group
      ? block.foods.map((r) => ({ ...r, groupId: `g-${block.foods[0].id}` }))
      : block.foods,
  );
}

// A plan food, dressed as a catalog preset so the amount box scales it. The
// plan's own quantity is the serving — tick the oats, then type 0.5 on a
// morning you only got through half of them. Its weight and micronutrients
// come along, so the log can re-ask for it in grams and count what's in it.
function presetFromPlan(food: PlanFood): FoodPreset {
  const detail = foodDetail(food);
  return {
    name: food.name,
    serving: food.quantity?.trim() || "1 serving",
    calories: food.calories ?? 0,
    protein: food.protein ?? 0,
    carbs: food.carbs ?? 0,
    fat: food.fat ?? 0,
    grams: detail.grams,
    gramsPerCup: detail.gramsPerCup,
    nutrients: detail.nutrients,
  };
}

// Another form of the same food, with the catalog's numbers now. A food ticked
// off the plan still says so: frozen berries in place of the plan's fresh ones
// are still the plan's berries (see planKey).
function switchedForm(r: Row, name: string): Row {
  return {
    ...foodRows.setForm(r, name),
    source: r.source === FOOD_SOURCE.PLAN ? r.source : FOOD_SOURCE.PRESET,
  };
}

// An edit that drops the preset link also drops the claim about where the
// numbers came from: once the athlete has typed over a scan, it is theirs.
function keepSource(prev: Row, next: Row): Row {
  return prev.base && !next.base ? { ...next, source: FOOD_SOURCE.MANUAL } : next;
}

type LogRows = {
  rows: Row[];
  addRow: () => void;
  addScanned: (foods: FoodPreset[], source: FoodSource) => void;
  removeRow: (id: string) => void;
  removeGroup: (groupId: string) => void;
  setMeal: (id: string, meal: string) => void;
  setGroupMeal: (groupId: string, meal: string) => void;
  applyPreset: (id: string, preset: FoodPreset) => void;
  clearPreset: (id: string) => void;
  setAmount: (id: string, raw: string) => void;
  setUnit: (id: string, unit: AmountUnit) => void;
  setName: (id: string, name: string) => void;
  setForm: (id: string, name: string) => void;
  setQuantity: (id: string, quantity: string) => void;
  setMacro: (id: string, key: MacroKey, value: string) => void;
  setNutrient: (id: string, key: NutrientKey, value: string) => void;
  totals: FoodMacros;
  nutrientTotals: NutrientTotals;
  payload: ReturnType<typeof persisted>[];
  initialNotes: string | null;
  // The plan side of the bridge.
  togglePlanFood: (meal: string, food: PlanFood) => void;
  isPlanned: (meal: string, food: PlanFood) => boolean;
  switchPlanFood: (meal: string, food: PlanFood, name: string) => void;
};

const persisted = (r: Row) => ({
  meal: r.meal,
  groupName: r.groupName,
  source: r.source,
  ...foodRows.persistedFood(r),
});

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
  // No rehydration here, unlike the builder: a log row's preset link only
  // matters while you're editing the row you just added, and reattaching it on
  // load would let a later nudge of the amount overwrite numbers the athlete
  // typed. Reopening a saved day gives you the numbers, not the formula.
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.entries.length
      ? withGroupIds(
          initial.entries.map((e, i) => ({
            ...foodRows.storedFoodFields(e),
            id: `e${i}`,
            meal: e.meal,
            groupName: groupLabel(e.groupName),
            groupId: null,
            source: e.source as FoodSource,
          })),
        )
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
  // the amount box scales them — the same state a catalog pick produces, so
  // nothing downstream has to know a camera was involved.
  const addScanned = (foods: FoodPreset[], source: FoodSource) =>
    setRows((rs) => {
      const meal = rs[rs.length - 1]?.meal ?? "";
      const scanned = foods.map((preset) => ({
        ...foodRows.applyPreset(blankRow(crypto.randomUUID(), meal), preset),
        source,
      }));
      // An untouched blank starter row is replaced rather than left above the
      // result — it's scaffolding, not something the athlete typed.
      const keep = rs.filter((r) => r.name.trim() !== "");
      return [...keep, ...scanned];
    });

  const removeRow = (id: string) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : [blankRow(crypto.randomUUID())]));

  // A group is one dish, so it leaves the log in one move — the log's
  // counterpart to the plan's group checkbox.
  const removeGroup = (groupId: string) =>
    setRows((rs) => {
      const left = rs.filter((r) => r.groupId !== groupId);
      return left.length > 0 ? left : [blankRow(crypto.randomUUID())];
    });

  const update = (id: string, fn: (row: Row) => Row) =>
    setRows((rs) => rs.map((r) => (r.id === id ? fn(r) : r)));

  // Every edit that can drop the preset link goes through here, so the
  // source follows it without each one having to remember.
  const edit = (id: string, fn: (row: Row) => Row) =>
    update(id, (r) => keepSource(r, fn(r)));

  const totals = useMemo(() => foodRows.rowTotals(rows), [rows]);
  const payload = useMemo(() => rows.map(persisted), [rows]);

  // Which plan foods are already in the log, for the checkboxes to read — the
  // set behind isPlanned, which applies answersFor's rule to it. A loose row's
  // key carries no group, so only a loose row can match the fallback.
  const plannedKeys = useMemo(
    () =>
      new Set(
        rows
          .filter((r) => r.name.trim() !== "")
          .map((r) => planKey(r.meal, r)),
      ),
    [rows],
  );

  // Tick: the plan food arrives as a filled row. Untick: that row goes away.
  //
  // Untick only ever removes a row still matching the plan — edit the name or
  // the macros and the link is already broken, so the box reads unticked and
  // the row you changed is left alone. Nothing an athlete typed is removed by a
  // checkbox.
  const togglePlanFood = (meal: string, food: PlanFood) =>
    setRows((rs) => {
      const existing = rs.filter((r) => answersFor(r, meal, food));
      if (existing.length > 0) {
        const left = rs.filter((r) => !answersFor(r, meal, food));
        return left.length > 0 ? left : [blankRow(crypto.randomUUID(), meal)];
      }

      const groupName = groupLabel(food.groupName);
      const added: Row = {
        ...foodRows.applyPreset(
          blankRow(crypto.randomUUID(), meal),
          presetFromPlan(food),
        ),
        groupName,
        groupId: groupName ? crypto.randomUUID() : null,
        source: FOOD_SOURCE.PLAN,
      };
      // Only a pristine form is replaced. addScanned drops every empty row, but
      // a tick is a smaller gesture than a scan: if the athlete has a row open
      // and half-typed, it is not scaffolding and it stays.
      const pristine = rs.every((r) => r.name.trim() === "");
      if (pristine) return [added];

      // A food whose group is already partly logged joins it — tick the oats,
      // then the berries, and that's one smoothie rather than two halves. It
      // goes in after the group's last row, because a group is a run.
      const last = groupName
        ? rs.findLastIndex(
            (r) =>
              r.groupId != null &&
              r.groupName === groupName &&
              normalizeFoodName(r.meal) === normalizeFoodName(meal),
          )
        : -1;
      if (last < 0) return [...rs, added];
      return [
        ...rs.slice(0, last + 1),
        { ...added, groupId: rs[last].groupId },
        ...rs.slice(last + 1),
      ];
    });

  // The plan's food switched to another form — frozen for fresh — while it's
  // ticked: the row it ticked into switches with it, since a tick says "I ate
  // the plan's food" and the plan now says frozen. The rows still answer for
  // it after (see planKey), so the box stays ticked.
  const switchPlanFood = (meal: string, food: PlanFood, name: string) =>
    setRows((rs) =>
      rs.map((r) => (answersFor(r, meal, food) ? switchedForm(r, name) : r)),
    );

  const value: LogRows = {
    rows,
    addRow,
    addScanned,
    removeRow,
    removeGroup,
    setMeal: (id, meal) => update(id, (r) => ({ ...r, meal })),
    setGroupMeal: (groupId, meal) =>
      setRows((rs) => rs.map((r) => (r.groupId === groupId ? { ...r, meal } : r))),
    applyPreset: (id, preset) =>
      update(id, (r) => ({
        ...foodRows.applyPreset(r, preset),
        source: FOOD_SOURCE.PRESET,
      })),
    clearPreset: (id) => edit(id, (r) => foodRows.detachPreset(r)),
    setAmount: (id, raw) => update(id, (r) => foodRows.setAmount(r, raw)),
    setUnit: (id, unit) => update(id, (r) => foodRows.setUnit(r, unit)),
    setName: (id, name) => edit(id, (r) => foodRows.setName(r, name)),
    setForm: (id, name) => update(id, (r) => switchedForm(r, name)),
    setQuantity: (id, quantity) =>
      update(id, (r) => foodRows.setQuantity(r, quantity)),
    setMacro: (id, key, v) => edit(id, (r) => foodRows.setMacro(r, key, v)),
    setNutrient: (id, key, v) =>
      edit(id, (r) => foodRows.setNutrient(r, key, v)),
    totals: totals.macros,
    nutrientTotals: totals.nutrients,
    payload,
    initialNotes: initial?.notes ?? null,
    togglePlanFood,
    isPlanned: (meal, food) =>
      plannedKeys.has(planKey(meal, food)) ||
      plannedKeys.has(planKey(meal, { name: food.name })),
    switchPlanFood,
  };

  return (
    <LogRowsContext.Provider value={value}>{children}</LogRowsContext.Provider>
  );
}
