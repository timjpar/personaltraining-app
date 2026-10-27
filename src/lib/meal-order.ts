// Every way the plan builder rearranges a plan — the arrows, drag and drop,
// and a food's group picker — as pure functions over its meals. A meal's foods
// are one flat list and a group is a run of adjacent foods sharing a groupId
// (see food-groups.ts), so every move here has to leave each group in one
// piece. Nothing else keeps that true.

export type Dir = -1 | 1;

type Row = { id: string; groupId: string | null };
type MealOf<F extends Row> = {
  id: string;
  foods: F[];
  groups: Record<string, string>;
};

// The block the food at `i` belongs to — itself if loose, else its whole
// group — as [first, last] indexes.
export function blockAt(foods: Row[], i: number): [number, number] {
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
export function stepFood<F extends Row>(foods: F[], i: number, dir: Dir): F[] {
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

export const canStepFood = (foods: Row[], i: number, dir: Dir) =>
  foods[i + dir] != null || foods[i].groupId != null;

// A whole block past the block beside it: a group moves as one, over a loose
// food or over another whole group.
export function stepBlock<F extends Row>(foods: F[], i: number, dir: Dir): F[] {
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

export function swap<T>(items: T[], i: number, dir: Dir): T[] {
  const j = i + dir;
  if (j < 0 || j >= items.length) return items;
  const out = [...items];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// The group picker. Joining a group puts the food at the end of it; leaving
// one puts it just below the group it left; a group id nobody has yet is a new
// group, started wherever the food ends up. The food never lands inside a
// group it isn't in.
export function assignGroup<F extends Row>(
  foods: F[],
  foodId: string,
  groupId: string | null,
): F[] {
  const i = foods.findIndex((f) => f.id === foodId);
  const food = foods[i];
  if (!food || food.groupId === groupId) return foods;
  const rest = foods.filter((f) => f.id !== foodId);
  const after = (g: string | null) => {
    if (!g) return null;
    const end = rest.findLastIndex((f) => f.groupId === g);
    return end >= 0 ? end + 1 : null;
  };
  const at = after(groupId) ?? after(food.groupId) ?? i;
  return [...rest.slice(0, at), { ...food, groupId }, ...rest.slice(at)];
}

// Where a drag lands: before `index` in the target meal's foods with the
// dragged rows already taken out, inside `groupId` or loose.
export type Drop = { mealId: string; index: number; groupId: string | null };

// Takes rows out of one meal and puts `rows` into another (or the same) at
// `index`. A meal the move empties gets a blank row — the same floor the ×
// keeps, so a meal is never zero rows.
function place<F extends Row, M extends MealOf<F>>(
  meals: M[],
  fromMealId: string,
  ids: Set<string>,
  toMealId: string,
  index: number,
  rows: F[],
  blank: () => F,
): M[] {
  return meals.map((m) => {
    let foods = m.id === fromMealId ? m.foods.filter((f) => !ids.has(f.id)) : m.foods;
    if (m.id === toMealId) {
      foods = [...foods.slice(0, index), ...rows, ...foods.slice(index)];
    }
    if (foods === m.foods) return m;
    return { ...m, foods: foods.length ? foods : [blank()] };
  });
}

export function dropFood<F extends Row, M extends MealOf<F>>(
  meals: M[],
  fromMealId: string,
  foodId: string,
  drop: Drop,
  blank: () => F,
): M[] {
  const food = meals
    .find((m) => m.id === fromMealId)
    ?.foods.find((f) => f.id === foodId);
  if (!food) return meals;
  return place(meals, fromMealId, new Set([foodId]), drop.mealId, drop.index, [
    { ...food, groupId: drop.groupId },
  ], blank);
}

// A whole group, which takes its name along when it changes meal.
export function dropGroup<F extends Row, M extends MealOf<F>>(
  meals: M[],
  fromMealId: string,
  groupId: string,
  drop: Omit<Drop, "groupId">,
  blank: () => F,
): M[] {
  const from = meals.find((m) => m.id === fromMealId);
  if (!from) return meals;
  const rows = from.foods.filter((f) => f.groupId === groupId);
  const moved = place(
    meals,
    fromMealId,
    new Set(rows.map((f) => f.id)),
    drop.mealId,
    drop.index,
    rows,
    blank,
  );
  if (fromMealId === drop.mealId) return moved;
  const name = from.groups[groupId] ?? "";
  return moved.map((m) => {
    if (m.id === drop.mealId) return { ...m, groups: { ...m.groups, [groupId]: name } };
    if (m.id !== fromMealId) return m;
    const groups = { ...m.groups };
    delete groups[groupId];
    return { ...m, groups };
  });
}

export function dropMeal<M extends { id: string }>(
  meals: M[],
  mealId: string,
  index: number,
): M[] {
  const meal = meals.find((m) => m.id === mealId);
  if (!meal) return meals;
  const rest = meals.filter((m) => m !== meal);
  return [...rest.slice(0, index), meal, ...rest.slice(index)];
}
