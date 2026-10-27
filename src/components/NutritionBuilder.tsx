"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { NutritionFormState } from "@/app/(trainer)/nutrition/actions";
import { FoodPicker } from "@/components/FoodPicker";
import { AmountControls, NutrientFields } from "@/components/FoodRowControls";
import { NutritionTotals } from "@/components/NutritionTotals";
import { useMealDrag } from "@/components/useMealDrag";
import {
  Card,
  Field,
  Input,
  Textarea,
  FormError,
  buttonClass,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { NutrientDetail } from "@/lib/constants";
import type { AmountUnit } from "@/lib/food-amounts";
import { foodBlocks } from "@/lib/food-groups";
import type { FoodPreset, StoredFood } from "@/lib/food-presets";
import * as foodRows from "@/lib/food-rows";
import type { FoodRowFields, MacroKey } from "@/lib/food-rows";
import {
  assignGroup,
  canStepFood,
  dropFood,
  dropGroup,
  dropMeal,
  stepBlock,
  stepFood,
  swap,
  type Dir,
} from "@/lib/meal-order";
import type { NutrientKey } from "@/lib/nutrients";

// How a row is edited — scaling, units, what breaks the preset link — lives in
// src/lib/food-rows.ts, shared with the athlete's day log. How rows are
// rearranged lives in src/lib/meal-order.ts.
type FoodRow = FoodRowFields & { id: string; groupId: string | null };
// Groups are keyed by a client-side id, not by what they're called, so
// clearing the name box to retype it doesn't dissolve the group between
// keystrokes. The name only becomes the saved label on the way out.
type MealRow = {
  id: string;
  name: string;
  foods: FoodRow[];
  groups: Record<string, string>;
};

type Initial = {
  title?: string;
  notes?: string | null;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
  meals?: {
    name: string;
    foods: (StoredFood & { groupName?: string | null })[];
  }[];
};

const blankFood = (id: string, groupId: string | null = null): FoodRow => ({
  ...foodRows.blankFoodFields(),
  id,
  groupId,
});
const newFood = (groupId: string | null = null): FoodRow =>
  blankFood(crypto.randomUUID(), groupId);
const newMeal = (name = ""): MealRow => ({
  id: crypto.randomUUID(),
  name,
  foods: [newFood()],
  groups: {},
});

// A saved meal as builder state. Each run of same-labelled foods becomes one
// group, under an id derived from its position so hydration matches.
function initialMeal(
  m: NonNullable<Initial["meals"]>[number],
  mi: number,
): MealRow {
  const groups: Record<string, string> = {};
  const foods: FoodRow[] = [];
  foodBlocks(m.foods, (f) => f.groupName).forEach((block, bi) => {
    const groupId = block.group ? `m${mi}-g${bi}` : null;
    if (groupId) groups[groupId] = block.group!;
    for (const f of block.foods) {
      foods.push({
        ...foodRows.rehydrateFoodFields(f),
        id: `m${mi}-f${foods.length}`,
        groupId,
      });
    }
  });
  return {
    id: `m${mi}`,
    name: m.name,
    foods: foods.length ? foods : [blankFood(`m${mi}-f0`)],
    groups,
  };
}

// The group picker's value for "start a new group with this food". Not a
// possible group id: those are uuids, or m0-g1 for saved ones.
const NEW_GROUP = "new";

const MACROS: { key: MacroKey; label: string; placeholder: string }[] = [
  { key: "calories", label: "Cal", placeholder: "320" },
  { key: "protein", label: "Protein", placeholder: "30" },
  { key: "carbs", label: "Carbs", placeholder: "40" },
  { key: "fat", label: "Fat", placeholder: "10" },
];

// No hover colour here: cn() is a plain join, so the × adding its own red
// would race this one in the stylesheet instead of replacing it.
const iconButton =
  "grid shrink-0 place-items-center rounded-[8px] text-ink-soft transition-colors disabled:pointer-events-none disabled:opacity-30";

// Up and down for one meal, group or food. `moveKey` names the pair so focus
// can find its way back after the move — see the refocus effect.
function MoveButtons({
  moveKey,
  label,
  canUp,
  canDown,
  onMove,
  stacked,
  className,
}: {
  moveKey: string;
  label: string;
  canUp: boolean;
  canDown: boolean;
  onMove: (dir: Dir) => void;
  stacked?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0", stacked ? "flex-col" : "items-center")}>
      {([-1, 1] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          data-move={`${moveKey}:${dir}`}
          disabled={dir < 0 ? !canUp : !canDown}
          onClick={() => onMove(dir)}
          aria-label={`Move ${label} ${dir < 0 ? "up" : "down"}`}
          className={cn(iconButton, "hover:text-ink", className)}
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d={dir < 0 ? "M5 12.5 10 7.5l5 5" : "M5 7.5 10 12.5l5-5"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

// What drag and drop picks a meal, group or food up by. Out of the tab order
// and hidden from screen readers: the arrows beside it make the same moves by
// keyboard. touch-none so a finger on it drags instead of scrolling the page.
function Grip({
  label,
  className,
  onPointerDown,
}: {
  label: string;
  className?: string;
  onPointerDown: (e: PointerEvent) => void;
}) {
  return (
    <span
      aria-hidden
      title={`Drag to move ${label}`}
      onPointerDown={onPointerDown}
      className={cn(
        "grid shrink-0 cursor-grab touch-none place-items-center rounded-[8px] text-ink-soft/70 transition-colors hover:text-ink active:cursor-grabbing",
        className,
      )}
    >
      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
        {[3, 8, 13].map((y) =>
          [2.5, 7.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />),
        )}
      </svg>
    </span>
  );
}

// Which group a food is in. A native select, so a phone opens its own picker;
// it sits invisible over a label that says what it means — "Add to group", or
// the group it's in — since a select on its own can only show an option.
function GroupPicker({
  food,
  groups,
  label,
  onPick,
}: {
  food: FoodRow;
  groups: { id: string; name: string }[];
  label: string;
  onPick: (value: string) => void;
}) {
  const current = groups.find((g) => g.id === food.groupId);
  return (
    <label className="relative mt-2 inline-flex h-8 min-w-0 max-w-[12rem] shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] px-2 text-ink-soft transition-colors hover:bg-paper hover:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-jade">
      <span
        className={cn(
          "metric truncate text-xs",
          current ? "text-jade-strong" : undefined,
        )}
      >
        {current ? `In ${current.name.trim() || "unnamed group"}` : "Add to group"}
      </span>
      <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden className="shrink-0">
        <path d="M.75.75 4 4 7.25.75" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        value={food.groupId ?? ""}
        onChange={(e) => onPick(e.target.value)}
        aria-label={`Group for ${label}`}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="">No group</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name.trim() || "Unnamed group"}
          </option>
        ))}
        <option value={NEW_GROUP}>New group</option>
      </select>
    </label>
  );
}

export function NutritionBuilder({
  action,
  submitLabel,
  cancelHref,
  initial,
  detail,
}: {
  action: (
    state: NutritionFormState,
    formData: FormData,
  ) => Promise<NutritionFormState>;
  submitLabel: string;
  cancelHref: string;
  initial?: Initial;
  // The coach's micronutrient preference — see NutritionTotals.
  detail: NutrientDetail;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // Deterministic ids for the server-rendered rows so hydration matches; rows
  // added later via the client-only handlers use random ids.
  const [meals, setMeals] = useState<MealRow[]>(() =>
    initial?.meals?.length
      ? initial.meals.map(initialMeal)
      : [
          {
            id: "m0",
            name: "Breakfast",
            foods: [blankFood("m0-f0")],
            groups: {},
          },
        ],
  );
  // The group whose name box should take focus as it appears.
  const [namingGroup, setNamingGroup] = useState<string | null>(null);

  // A moved row loses focus: React moves its DOM node, and a food stepping in
  // or out of a group changes parent and remounts. Put focus back on the arrow
  // that was pressed — or its partner, once that one hits the end — so a
  // keyboard can keep pressing.
  const refocus = useRef<{ key: string; dir: Dir } | null>(null);
  useEffect(() => {
    const target = refocus.current;
    refocus.current = null;
    if (!target) return;
    for (const dir of [target.dir, -target.dir]) {
      const el = document.querySelector<HTMLButtonElement>(
        `[data-move="${target.key}:${dir}"]`,
      );
      if (el && !el.disabled) {
        el.focus();
        return;
      }
    }
  }, [meals]);

  const drag = useMealDrag(meals, (subject, target) => {
    const blank = () => newFood();
    if (subject.kind === "meal" && target.kind === "meal") {
      setMeals((ms) => dropMeal(ms, subject.id, target.index));
    } else if (subject.kind === "food" && target.kind === "rows") {
      setMeals((ms) => dropFood(ms, subject.mealId, subject.id, target.drop, blank));
    } else if (subject.kind === "group" && target.kind === "rows") {
      setMeals((ms) => dropGroup(ms, subject.mealId, subject.id, target.drop, blank));
    }
  });
  const isDragging = (kind: "meal" | "group" | "food", id: string) =>
    drag.dragging?.kind === kind && drag.dragging.id === id;

  const setMeal = (mealId: string, fn: (meal: MealRow) => MealRow) =>
    setMeals((ms) => ms.map((m) => (m.id === mealId ? fn(m) : m)));
  const setFoods = (mealId: string, fn: (foods: FoodRow[]) => FoodRow[]) =>
    setMeal(mealId, (m) => ({ ...m, foods: fn(m.foods) }));

  const addMeal = () =>
    setMeals((ms) => [...ms, newMeal(`Meal ${ms.length + 1}`)]);
  const removeMeal = (mealId: string) =>
    setMeals((ms) => (ms.length > 1 ? ms.filter((m) => m.id !== mealId) : ms));
  const setMealName = (mealId: string, name: string) =>
    setMeal(mealId, (m) => ({ ...m, name }));
  const moveMeal = (mealId: string, dir: Dir) => {
    refocus.current = { key: mealId, dir };
    setMeals((ms) => swap(ms, ms.findIndex((m) => m.id === mealId), dir));
  };

  // Loose at the end of the meal, or at the end of a group when one is named.
  const addFood = (mealId: string, groupId: string | null = null) =>
    setFoods(mealId, (foods) => {
      const at = groupId
        ? foods.findLastIndex((f) => f.groupId === groupId) + 1
        : foods.length;
      return [...foods.slice(0, at), newFood(groupId), ...foods.slice(at)];
    });
  const removeFood = (mealId: string, foodId: string) =>
    setFoods(mealId, (foods) =>
      foods.length > 1 ? foods.filter((f) => f.id !== foodId) : foods,
    );
  const moveFood = (mealId: string, foodId: string, dir: Dir) => {
    refocus.current = { key: foodId, dir };
    setFoods(mealId, (foods) =>
      stepFood(foods, foods.findIndex((f) => f.id === foodId), dir),
    );
  };

  // Groups. A food joins one from its picker, by dragging, or by stepping in
  // with its arrows; "New group" on the picker starts one around it.
  const pickGroup = (mealId: string, foodId: string, value: string) => {
    if (value !== NEW_GROUP) {
      setFoods(mealId, (foods) => assignGroup(foods, foodId, value || null));
      return;
    }
    const groupId = crypto.randomUUID();
    setNamingGroup(groupId);
    setMeal(mealId, (m) => ({
      ...m,
      groups: { ...m.groups, [groupId]: "" },
      foods: assignGroup(m.foods, foodId, groupId),
    }));
  };
  const addGroup = (mealId: string) => {
    const groupId = crypto.randomUUID();
    setNamingGroup(groupId);
    setMeal(mealId, (m) => ({
      ...m,
      groups: { ...m.groups, [groupId]: "" },
      foods: [...m.foods, newFood(groupId)],
    }));
  };
  const setGroupName = (mealId: string, groupId: string, name: string) =>
    setMeal(mealId, (m) => ({ ...m, groups: { ...m.groups, [groupId]: name } }));
  const moveGroup = (mealId: string, groupId: string, dir: Dir) => {
    refocus.current = { key: groupId, dir };
    setFoods(mealId, (foods) =>
      stepBlock(foods, foods.findIndex((f) => f.groupId === groupId), dir),
    );
  };
  // The foods stay exactly where they are, loose.
  const ungroup = (mealId: string, groupId: string) =>
    setMeal(mealId, (m) => {
      const groups = { ...m.groups };
      delete groups[groupId];
      return {
        ...m,
        groups,
        foods: m.foods.map((f) =>
          f.groupId === groupId ? { ...f, groupId: null } : f,
        ),
      };
    });

  const update = (
    mealId: string,
    foodId: string,
    fn: (food: FoodRow) => FoodRow,
  ) =>
    setFoods(mealId, (foods) =>
      foods.map((f) => (f.id === foodId ? fn(f) : f)),
    );

  const applyPreset = (mealId: string, foodId: string, preset: FoodPreset) =>
    update(mealId, foodId, (f) => foodRows.applyPreset(f, preset));
  const clearPreset = (mealId: string, foodId: string) =>
    update(mealId, foodId, (f) => foodRows.detachPreset(f));
  const setAmount = (mealId: string, foodId: string, raw: string) =>
    update(mealId, foodId, (f) => foodRows.setAmount(f, raw));
  const setUnit = (mealId: string, foodId: string, unit: AmountUnit) =>
    update(mealId, foodId, (f) => foodRows.setUnit(f, unit));
  const setFoodName = (mealId: string, foodId: string, name: string) =>
    update(mealId, foodId, (f) => foodRows.setName(f, name));
  const setQuantity = (mealId: string, foodId: string, quantity: string) =>
    update(mealId, foodId, (f) => foodRows.setQuantity(f, quantity));
  const setMacro = (mealId: string, foodId: string, key: MacroKey, value: string) =>
    update(mealId, foodId, (f) => foodRows.setMacro(f, key, value));
  const setNutrient = (
    mealId: string,
    foodId: string,
    key: NutrientKey,
    value: string,
  ) => update(mealId, foodId, (f) => foodRows.setNutrient(f, key, value));

  const totals = useMemo(
    () => foodRows.rowTotals(meals.flatMap((m) => m.foods)),
    [meals],
  );

  // Only the persisted fields travel. `base` is a whole preset object per row
  // and `amount`/`unit`/`id` mean nothing to the server. A group goes out as
  // its name on each of its foods; one left unnamed still saves as a group,
  // under a stand-in, the way a blank meal name becomes "Meal 2".
  const payload = useMemo(
    () =>
      meals.map((m) => {
        const labels = new Map<string, string>();
        for (const block of foodBlocks(m.foods, (f) => f.groupId)) {
          if (!block.group) continue;
          labels.set(
            block.group,
            m.groups[block.group]?.trim() || `Group ${labels.size + 1}`,
          );
        }
        return {
          name: m.name,
          foods: m.foods.map((f) => ({
            ...foodRows.persistedFood(f),
            groupName: f.groupId ? (labels.get(f.groupId) ?? null) : null,
          })),
        };
      }),
    [meals],
  );

  const foodEditor = (
    meal: MealRow,
    food: FoodRow,
    groups: { id: string; name: string }[],
  ) => {
    const i = meal.foods.indexOf(food);
    const label = `Food ${i + 1}`;
    const named = food.name.trim() || label.toLowerCase();
    // White inside a group's tinted box, so each food still reads as its own
    // card; grey loose, as it always was.
    const hover = food.groupId ? "hover:bg-paper" : "hover:bg-card";
    return (
      <div
        key={food.id}
        data-drag-food={food.id}
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)] gap-x-1.5 rounded-[var(--radius-sm)] border border-line py-2.5 pl-1 pr-2.5 transition-opacity",
          food.groupId ? "bg-card" : "bg-paper/40",
          isDragging("food", food.id) && "opacity-40",
        )}
      >
        {/* A gutter rather than more buttons on the name line: on a phone
            that line is already the food's name and an ×, and the name is the
            part that has to stay readable. It runs beside the name and amount
            only — the macro boxes below take the full width back, or inside a
            group a phone clips "150". */}
        <div className="row-span-2 flex flex-col items-center">
          <Grip
            label={named}
            className={cn("h-9 w-7 sm:h-8", hover)}
            {...drag.grip({ kind: "food", id: food.id, mealId: meal.id, label: food.name.trim() || label })}
          />
          <MoveButtons
            moveKey={food.id}
            label={named}
            canUp={canStepFood(meal.foods, i, -1)}
            canDown={canStepFood(meal.foods, i, 1)}
            onMove={(dir) => moveFood(meal.id, food.id, dir)}
            stacked
            className={cn("h-8 w-7 sm:h-7", hover)}
          />
        </div>
        {/* Two lines: the food, then how much of it. See the matching
            note in NutritionLogForm. */}
        <div className="flex items-center gap-2">
          <FoodPicker
            value={food.name}
            onChange={(v) => setFoodName(meal.id, food.id, v)}
            onPick={(p) => applyPreset(meal.id, food.id, p)}
            onPickCustom={() => clearPreset(meal.id, food.id)}
            aria-label={`${label} name`}
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={() => removeFood(meal.id, food.id)}
            aria-label={`Remove food ${i + 1}`}
            className={cn(iconButton, "h-8 w-8 hover:text-flag", hover)}
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <AmountControls
            row={food}
            label={label}
            onAmount={(raw) => setAmount(meal.id, food.id, raw)}
            onUnit={(unit) => setUnit(meal.id, food.id, unit)}
            inputClassName="bg-card"
          />
          <div className="min-w-0 flex-1">
            <Input
              value={food.quantity}
              onChange={(e) => setQuantity(meal.id, food.id, e.target.value)}
              placeholder="1 cup"
              className="bg-card px-2.5 py-2 text-sm"
              aria-label={`${label} quantity`}
            />
          </div>
        </div>
        <div className="col-span-2 pl-1.5">
          <div className="mt-2 grid grid-cols-4 gap-1.5 sm:gap-2">
            {MACROS.map((mac) => (
              <label key={mac.key} className="flex flex-col gap-1">
                <span className="eyebrow text-ink-soft/70">{mac.label}</span>
                <Input
                  type="number"
                  min={0}
                  value={food[mac.key]}
                  onChange={(e) => setMacro(meal.id, food.id, mac.key, e.target.value)}
                  placeholder={mac.placeholder}
                  className={cn("metric bg-card px-2 py-1.5 text-sm")}
                />
              </label>
            ))}
          </div>
          {/* The row's two folded-away extras on one line: its
              micronutrients, and which group it belongs to. */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <NutrientFields
                row={food}
                label={label}
                detail={detail}
                onChange={(key, value) => setNutrient(meal.id, food.id, key, value)}
                inputClassName="bg-card"
              />
            </div>
            <GroupPicker
              food={food}
              groups={groups}
              label={named}
              onPick={(value) => pickGroup(meal.id, food.id, value)}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormError>{state.error}</FormError>

      {/* All meals + foods travel as one JSON field. */}
      <input type="hidden" name="meals" value={JSON.stringify(payload)} />

      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Plan title" htmlFor="title">
            <Input
              id="title"
              name="title"
              placeholder="Cut · 2,000 kcal"
              defaultValue={initial?.title ?? ""}
              required
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes for the athlete" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              placeholder="Hit protein first. Water 3L/day. Veg with every meal."
              defaultValue={initial?.notes ?? ""}
            />
          </Field>
        </div>
      </Card>

      <div>
        <p className="eyebrow mb-2 text-ink-soft">Daily targets (optional)</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {(
            [
              { name: "targetCalories", label: "Calories", value: initial?.targetCalories, placeholder: "2000" },
              { name: "targetProtein", label: "Protein (g)", value: initial?.targetProtein, placeholder: "160" },
              { name: "targetCarbs", label: "Carbs (g)", value: initial?.targetCarbs, placeholder: "200" },
              { name: "targetFat", label: "Fat (g)", value: initial?.targetFat, placeholder: "60" },
            ] as const
          ).map((t) => (
            <label key={t.name} className="flex flex-col gap-1">
              <span className="eyebrow text-ink-soft/70">{t.label}</span>
              <Input
                name={t.name}
                type="number"
                min={0}
                defaultValue={t.value ?? ""}
                placeholder={t.placeholder}
                className="metric"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {meals.map((meal, mi) => {
          const blocks = foodBlocks(meal.foods, (f) => f.groupId);
          const groups = blocks
            .filter((b) => b.group)
            .map((b) => ({ id: b.group!, name: meal.groups[b.group!] ?? "" }));
          return (
            <Card
              key={meal.id}
              data-drag-meal={meal.id}
              className={cn("p-4 transition-opacity", isDragging("meal", meal.id) && "opacity-40")}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <Grip
                  label={meal.name.trim() || `meal ${mi + 1}`}
                  className="-ml-1.5 h-9 w-6 hover:bg-paper"
                  {...drag.grip({ kind: "meal", id: meal.id, label: meal.name.trim() || `Meal ${mi + 1}` })}
                />
                <span className="metric grid h-7 min-w-7 place-items-center rounded-[6px] border border-line bg-paper px-1.5 text-xs font-medium text-ink-soft">
                  {String(mi + 1).padStart(2, "0")}
                </span>
                <Input
                  value={meal.name}
                  onChange={(e) => setMealName(meal.id, e.target.value)}
                  placeholder="Meal name (e.g. Breakfast)"
                  className="flex-1 font-medium"
                  aria-label={`Meal ${mi + 1} name`}
                />
                <MoveButtons
                  moveKey={meal.id}
                  label={meal.name.trim() || `meal ${mi + 1}`}
                  canUp={mi > 0}
                  canDown={mi < meals.length - 1}
                  onMove={(dir) => moveMeal(meal.id, dir)}
                  className="h-9 w-8 hover:bg-paper"
                />
                <button
                  type="button"
                  onClick={() => removeMeal(meal.id)}
                  aria-label={`Remove meal ${mi + 1}`}
                  className={cn(iconButton, "h-9 w-9 hover:bg-paper hover:text-flag")}
                >
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div data-drop-list={meal.id} className="mt-3 flex flex-col gap-2.5">
                {blocks.map((block) => {
                  if (!block.group) return foodEditor(meal, block.foods[0], groups);

                  const groupId = block.group;
                  const name = meal.groups[groupId] ?? "";
                  const first = meal.foods.indexOf(block.foods[0]);
                  const last = first + block.foods.length - 1;
                  const count = block.foods.length;
                  const kcal = foodRows.rowTotals(block.foods).macros.calories;
                  return (
                    // A box of its own, tinted and edged in the accent, the
                    // same as the plan view draws it — so nobody has to work
                    // out from indentation alone what's in the bowl.
                    <section
                      key={groupId}
                      data-drag-group={groupId}
                      aria-label={name.trim() || "Unnamed group"}
                      className={cn(
                        "flex flex-col gap-2.5 rounded-[var(--radius-card)] border border-jade/40 bg-jade-wash/50 p-2 transition-opacity sm:p-3",
                        isDragging("group", groupId) && "opacity-40",
                      )}
                    >
                      <div>
                        {/* Ungroup up here with the label, not on the name
                            line: on a phone that line is a grip, the name and
                            two arrows already, and the name needs the room. */}
                        <div className="mb-1 flex items-center justify-between gap-2 pl-1 sm:pl-9">
                          <p className="eyebrow min-w-0 truncate text-jade-strong">
                            Group · {count} {count === 1 ? "food" : "foods"}
                            {/* Off on a phone, where it would wrap the label
                                onto a second line beside Ungroup. */}
                            {kcal ? <span className="hidden sm:inline"> · {kcal} kcal</span> : null}
                          </p>
                          <button
                            type="button"
                            onClick={() => ungroup(meal.id, groupId)}
                            className="metric h-8 shrink-0 rounded-[8px] px-2 text-xs text-ink-soft transition-colors hover:bg-card hover:text-ink"
                          >
                            Ungroup
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Grip
                            label={name.trim() || "group"}
                            className="h-9 w-7 hover:bg-card"
                            {...drag.grip({
                              kind: "group",
                              id: groupId,
                              mealId: meal.id,
                              label: `${name.trim() || "Group"} · ${count} ${count === 1 ? "food" : "foods"}`,
                            })}
                          />
                          <Input
                            value={name}
                            onChange={(e) => setGroupName(meal.id, groupId, e.target.value)}
                            placeholder="Name it, e.g. Oatmeal"
                            autoFocus={groupId === namingGroup}
                            aria-label="Group name"
                            className="flex-1 py-2 text-sm font-medium"
                          />
                          <MoveButtons
                            moveKey={groupId}
                            label={name.trim() || "group"}
                            canUp={first > 0}
                            canDown={last < meal.foods.length - 1}
                            onMove={(dir) => moveGroup(meal.id, groupId, dir)}
                            className="h-9 w-8 hover:bg-card"
                          />
                        </div>
                      </div>

                      {block.foods.map((food) => foodEditor(meal, food, groups))}

                      {/* Said once, while it's still news: the group has its
                          first food and nothing yet explains the second. */}
                      {count === 1 && meal.foods.length > 1 ? (
                        <p className="px-1 text-xs text-ink-soft">
                          Drag more foods in by their handle, or choose this
                          group under a food&rsquo;s &ldquo;Add to group&rdquo;.
                        </p>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => addFood(meal.id, groupId)}
                        className={cn(buttonClass("ghost", "sm"), "self-start")}
                      >
                        + Add to {name.trim() || "this group"}
                      </button>
                    </section>
                  );
                })}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => addFood(meal.id)}
                  className={buttonClass("ghost", "sm")}
                >
                  + Add food
                </button>
                <button
                  type="button"
                  onClick={() => addGroup(meal.id)}
                  className={buttonClass("ghost", "sm")}
                >
                  + Add group
                </button>
              </div>
            </Card>
          );
        })}

        <button
          type="button"
          onClick={addMeal}
          className={cn(buttonClass("outline"), "w-full")}
        >
          + Add meal
        </button>
      </div>

      <Card className="p-4">
        <NutritionTotals
          label="Daily total (from foods)"
          totals={totals.macros}
          nutrients={totals.nutrients}
          detail={detail}
        />
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>

      {/* Where a drag would land, and what's in hand. Fixed to the viewport
          because that's what the hit-test measures in. */}
      {drag.line ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 h-0.5 rounded-full bg-jade"
          style={{ top: drag.line.top - 1, left: drag.line.left, width: drag.line.width }}
        >
          <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full border-2 border-jade bg-card" />
        </div>
      ) : null}
      {drag.dragging && drag.pointer ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 max-w-[14rem] truncate rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper shadow-[var(--shadow-card)]"
          style={{
            top: drag.pointer.y - 44,
            left: Math.max(8, Math.min(drag.pointer.x + 14, window.innerWidth - 232)),
          }}
        >
          {drag.dragging.label}
        </div>
      ) : null}
    </form>
  );
}
