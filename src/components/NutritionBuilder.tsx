"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { NutritionFormState } from "@/app/(trainer)/nutrition/actions";
import { FoodPicker } from "@/components/FoodPicker";
import { AmountControls, NutrientFields } from "@/components/FoodRowControls";
import { NutritionTotals } from "@/components/NutritionTotals";
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
import type { NutrientKey } from "@/lib/nutrients";

// How a row is edited — scaling, units, what breaks the preset link — lives in
// src/lib/food-rows.ts, shared with the athlete's day log.
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

type Dir = -1 | 1;

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

// The block the food at `i` belongs to — itself if loose, else its whole
// group — as [first, last] indexes.
function blockAt(foods: FoodRow[], i: number): [number, number] {
  const g = foods[i].groupId;
  if (!g) return [i, i];
  let first = i;
  let last = i;
  while (first > 0 && foods[first - 1].groupId === g) first--;
  while (last < foods.length - 1 && foods[last + 1].groupId === g) last++;
  return [first, last];
}

// One step for one food. Beside a food in the same group (or loose beside
// loose) it trades places. At its group's edge it steps out and stays put; a
// loose food beside a group steps in. So a food passes through a group one
// place at a time rather than jumping it, which is also how it gets into one.
function stepFood(foods: FoodRow[], i: number, dir: Dir): FoodRow[] {
  const food = foods[i];
  const next = foods[i + dir];
  const out = [...foods];
  if (next && next.groupId === food.groupId) {
    out[i] = next;
    out[i + dir] = food;
  } else if (food.groupId) {
    out[i] = { ...food, groupId: null };
  } else if (next) {
    out[i] = { ...food, groupId: next.groupId };
  }
  return out;
}

const canStepFood = (foods: FoodRow[], i: number, dir: Dir) =>
  foods[i + dir] != null || foods[i].groupId != null;

// A whole block past the block beside it: a group moves as one, over a loose
// food or over another whole group.
function stepBlock(foods: FoodRow[], i: number, dir: Dir): FoodRow[] {
  const [first, last] = blockAt(foods, i);
  const n = dir < 0 ? first - 1 : last + 1;
  if (n < 0 || n >= foods.length) return foods;
  const [nFirst, nLast] = blockAt(foods, n);
  const block = foods.slice(first, last + 1);
  const other = foods.slice(nFirst, nLast + 1);
  return dir < 0
    ? [...foods.slice(0, nFirst), ...block, ...other, ...foods.slice(last + 1)]
    : [...foods.slice(0, first), ...other, ...block, ...foods.slice(nLast + 1)];
}

function swap<T>(items: T[], i: number, dir: Dir): T[] {
  const j = i + dir;
  if (j < 0 || j >= items.length) return items;
  const out = [...items];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

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
    <div className={cn("flex shrink-0", stacked ? "flex-col gap-1" : "items-center")}>
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

  // Groups. Starting one wraps a single food; the foods around it join by
  // stepping in with their arrows.
  const groupFood = (mealId: string, foodId: string) => {
    const groupId = crypto.randomUUID();
    setNamingGroup(groupId);
    setMeal(mealId, (m) => ({
      ...m,
      groups: { ...m.groups, [groupId]: "" },
      foods: m.foods.map((f) => (f.id === foodId ? { ...f, groupId } : f)),
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

  const foodEditor = (meal: MealRow, food: FoodRow) => {
    const i = meal.foods.indexOf(food);
    const label = `Food ${i + 1}`;
    return (
      <div
        key={food.id}
        className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-1.5 rounded-[var(--radius-sm)] border border-line bg-paper/40 py-2.5 pl-1 pr-2.5"
      >
        {/* A gutter rather than two more buttons on the name line: on a
            phone that line is already the food's name, an × and maybe
            "Group", and the name is the part that has to stay readable. It
            runs beside the name and amount only — the macro boxes below take
            the full width back, or inside a group a phone clips "150". */}
        <div className="row-span-2">
          <MoveButtons
            moveKey={food.id}
            label={food.name.trim() || label.toLowerCase()}
            canUp={canStepFood(meal.foods, i, -1)}
            canDown={canStepFood(meal.foods, i, 1)}
            onMove={(dir) => moveFood(meal.id, food.id, dir)}
            stacked
            className="h-12 w-7 hover:bg-card sm:h-8"
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
          {food.groupId ? null : (
            <button
              type="button"
              onClick={() => groupFood(meal.id, food.id)}
              aria-label={`Start a group with ${food.name.trim() || label.toLowerCase()}`}
              className="metric h-8 shrink-0 rounded-[8px] px-2 text-xs text-ink-soft transition-colors hover:bg-card hover:text-ink"
            >
              Group
            </button>
          )}
          <button
            type="button"
            onClick={() => removeFood(meal.id, food.id)}
            aria-label={`Remove food ${i + 1}`}
            className={cn(iconButton, "h-8 w-8 hover:bg-card hover:text-flag")}
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
          <div className="mt-2 grid grid-cols-4 gap-2">
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
          <NutrientFields
            row={food}
            label={label}
            detail={detail}
            onChange={(key, value) => setNutrient(meal.id, food.id, key, value)}
            inputClassName="bg-card"
          />
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
          return (
            <Card key={meal.id} className="p-4">
              <div className="flex items-center gap-2 sm:gap-3">
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

              <div className="mt-3 flex flex-col gap-2.5">
                {blocks.map((block) => {
                  if (!block.group) return foodEditor(meal, block.foods[0]);

                  const groupId = block.group;
                  const name = meal.groups[groupId] ?? "";
                  const first = meal.foods.indexOf(block.foods[0]);
                  const last = first + block.foods.length - 1;
                  return (
                    // The same rule down the side as the plan view draws, so
                    // a group looks like the same thing while it's edited.
                    <section
                      key={groupId}
                      aria-label={name.trim() || "Unnamed group"}
                      className="flex flex-col gap-2.5 border-l-2 border-jade/45 pl-2.5 sm:pl-3"
                    >
                      <div className="flex items-center gap-2">
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
                          className="h-9 w-8 hover:bg-paper"
                        />
                        <button
                          type="button"
                          onClick={() => ungroup(meal.id, groupId)}
                          className="metric h-9 shrink-0 rounded-[8px] px-2 text-xs text-ink-soft transition-colors hover:bg-paper hover:text-ink"
                        >
                          Ungroup
                        </button>
                      </div>

                      {block.foods.map((food) => foodEditor(meal, food))}

                      {/* Said once, while it's still news: the group has its
                          first food and nothing yet explains the second. */}
                      {block.foods.length === 1 && meal.foods.length > 1 ? (
                        <p className="text-xs text-ink-soft">
                          Use the arrows on the foods next to it to move them in.
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
    </form>
  );
}
