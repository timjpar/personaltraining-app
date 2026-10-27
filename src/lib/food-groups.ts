// Groups inside a meal — "Oatmeal" for everything that goes in the bowl. A
// group is stored as nothing more than a label on each of its foods (see
// Food.groupName in schema.prisma), so reading one back means walking the
// foods in order and collecting runs of the same label.
//
// Shared by every surface that draws a plan, and by the builder, which runs it
// over its own client-side group ids instead of the saved names.

// One thing a meal lists: a loose food (group null, exactly one food), or a
// group and the foods in it, in the order they're eaten.
export type FoodBlock<F> = { group: string | null; foods: F[] };

// Runs of adjacent foods with the same group. A label that turns up again
// further down, after something else, starts a second group: order is what the
// person set, and this never reshuffles it to merge the two.
export function foodBlocks<F>(
  foods: F[],
  groupOf: (food: F) => string | null | undefined,
): FoodBlock<F>[] {
  const blocks: FoodBlock<F>[] = [];
  for (const food of foods) {
    const group = groupOf(food) || null;
    const last = blocks.at(-1);
    if (group && last?.group === group) last.foods.push(food);
    else blocks.push({ group, foods: [food] });
  }
  return blocks;
}

// What a saved group is called. Trimmed and capped like the day log's meal
// label, and blank means loose, never an unnamed group.
export function groupLabel(raw: unknown): string | null {
  return String(raw ?? "").trim().slice(0, 40) || null;
}
