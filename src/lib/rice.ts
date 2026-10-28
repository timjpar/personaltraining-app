// Rice, cooked and dry. A row of rice is written at one weight or the other,
// and the person cooking wants both: the dry weight to measure out of the bag,
// the cooked weight to portion off the pot. Pure, like food-amounts.ts.
//
// Cooked rice is mostly water, and how much it drinks depends on the pot, so
// its weight is the unreliable side. What doesn't change is the rice: dry,
// it's 3.65 kcal a gram whatever happens to it after. So the dry weight comes
// from the row's own calories, which keeps it the same rice the row counts —
// 152 kcal of jasmine is 42 g dry, whether the pot made 117 g of it or 126 g.
// The cooked weight from a dry row is USDA's pot, so it's only "about".
//
// USDA SR Legacy, kcal per gram: long-grain white rice raw (169756) 3.65 and
// cooked (169757) 1.30, about 2.8 times its weight once cooked; long-grain
// brown rice raw (169703) 3.67 and cooked (169704) 1.23. Jasmine and basmati
// are long-grain white.
import { formatAmount } from "@/lib/food-amounts";

const KCAL_PER_G = {
  white: { dry: 3.65, cooked: 1.3 },
  brown: { dry: 3.67, cooked: 1.23 },
};

// Named for rice but not a pot of it.
const NOT_GRAINS = /\b(cakes?|crackers?|milk|noodles?|flour|vinegar|paper|krispies|syrup|wine|bran)\b/i;

// The weight a rice row isn't written in — "42 g dry" beside 126 g cooked,
// "about 117 g cooked" beside 42 g dry — or null for anything else, and for a
// row that doesn't say which it is.
export function riceOtherWeight(food: {
  name: string;
  quantity: string | null;
  calories: number | null;
}): string | null {
  if (!/\brice\b/i.test(food.name) || NOT_GRAINS.test(food.name)) return null;
  if (!food.calories || food.calories <= 0) return null;
  const kcal = /\bbrown\b/i.test(food.name) ? KCAL_PER_G.brown : KCAL_PER_G.white;
  const said = `${food.name} ${food.quantity ?? ""}`;
  if (/\bcooked\b/i.test(said)) {
    return `${formatAmount(food.calories / kcal.dry, "g")} dry`;
  }
  if (/\b(dry|uncooked|raw)\b/i.test(said)) {
    return `about ${formatAmount(food.calories / kcal.cooked, "g")} cooked`;
  }
  return null;
}
