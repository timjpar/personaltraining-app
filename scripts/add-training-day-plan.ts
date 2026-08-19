// One-off: load Tim's training-day meal plan into an account.
//
// Writes exactly what the app writes. A coach gets both halves — the library
// template (clientId null) and the self-assigned copy (clientId === trainerId,
// assignedAt set), which is the pair src/lib/assignees.ts explains. An athlete
// gets only the assigned copy, filed under their own coach.
//
// "Current plan" everywhere in this app means the most recently assigned one,
// so setting assignedAt is what makes it live.
//
//   npx tsx --env-file=.env scripts/add-training-day-plan.ts <email> [--force]
//
// Disposable — delete it once the plan is in.
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { sumMacros } from "@/lib/nutrition-form";

const TITLE = "Training Day · 2,702 kcal";

// The source list gave calories per item and macros only as a daily target, so
// the per-item P/C/F here are derived — from src/lib/food-presets.ts wherever
// the catalog already carries the food, scaled to the calories given.
//
// The burrito is written once with both wraps folded in, using the "2 × …"
// quantity convention Food.quantity documents, because the plan's daily totals
// are a plain sum over foods: a single burrito's rows would report half the day.
const PLAN = {
  notes:
    "Two burritos, built the same — the burrito quantities below cover both " +
    "(640 kcal each).",
  targetCalories: 2702,
  targetProtein: 205,
  targetCarbs: 310,
  targetFat: 88,
  meals: [
    {
      name: "Breakfast",
      foods: [
        ["Rolled oats", "1 cup dry (80 g)", 300, 10, 54, 6],
        ["Avocado", "1 whole medium", 240, 3, 13, 22],
        ["Skotidakis yogurt", "⅔ cup (170 g)", 200, 16, 7, 12],
        ["Hemp hearts", "20 g", 120, 7, 2, 10],
        ["Walnuts", "15 g", 100, 2, 2, 10],
        ["Chia seeds", "20 g", 98, 3, 8, 7],
        ["Blueberries", "100 g", 57, 1, 14, 0],
        ["Broccoli, steamed", "150 g", 51, 5, 10, 0],
        ["Kiwi, skin on", "1 medium", 42, 1, 10, 0],
        ["Fish oil", "2 caps", 18, 0, 0, 2],
        ["Lion's mane", "2 g", 8, 0, 2, 0],
        ["Lemon water", "½ lemon", 8, 0, 3, 0],
        ["Matcha", "1 serving", 3, 0, 1, 0],
        ["Creatine, D3 + K2", "5 g creatine", 0, 0, 0, 0],
      ],
    },
    {
      name: "Pre-workout",
      foods: [
        ["Gold Standard whey", "1 scoop", 120, 24, 3, 2],
        ["Blueberries", "100 g", 57, 1, 14, 0],
      ],
    },
    {
      name: "Burrito ×2",
      foods: [
        ["Chicken breast, cooked", "2 × 150 g (300 g)", 496, 93, 0, 11],
        ["Jasmine rice, cooked", "2 × 168 g (336 g)", 404, 8, 88, 1],
        ["Black beans", "2 × 120 g (240 g)", 200, 13, 36, 1],
        ["Real Good tortilla", "2 × 1 tortilla", 180, 16, 10, 8],
      ],
    },
  ],
} as const;

function mealCreateData() {
  return PLAN.meals.map((m, i) => ({
    name: m.name,
    order: i + 1,
    foods: {
      create: m.foods.map(([name, quantity, calories, protein, carbs, fat], j) => ({
        name,
        quantity,
        calories,
        protein,
        carbs,
        fat,
        order: j + 1,
      })),
    },
  }));
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const force = process.argv.includes("--force");
  if (!email) {
    throw new Error(
      "Usage: npx tsx --env-file=.env scripts/add-training-day-plan.ts <email> [--force]",
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, trainerId: true },
  });
  if (!user) throw new Error(`No account found for ${email}.`);

  // Whose library the plan belongs to. A coach owns their own; an athlete's
  // plan is owned by the coach who would have written it.
  const trainerId = user.role === ROLES.TRAINER ? user.id : user.trainerId;
  if (!trainerId) {
    throw new Error(
      `${email} is an athlete with no coach attached, so there is no library to file the plan under.`,
    );
  }

  const existing = await prisma.nutritionPlan.findFirst({
    where: { title: TITLE, clientId: user.id },
    select: { id: true, assignedAt: true },
  });
  if (existing && !force) {
    console.log(
      `“${TITLE}” is already assigned to ${email} (${existing.id}, assigned ${existing.assignedAt?.toISOString()}). Nothing written. Re-run with --force to add a fresh copy.`,
    );
    return;
  }

  const base = {
    title: TITLE,
    notes: PLAN.notes,
    targetCalories: PLAN.targetCalories,
    targetProtein: PLAN.targetProtein,
    targetCarbs: PLAN.targetCarbs,
    targetFat: PLAN.targetFat,
    trainerId,
  };

  const assignedAt = new Date();
  const writes = [];

  // The library copy, so the plan can be re-assigned and edited later. Only a
  // coach has a library page to see it on, so an athlete doesn't get one.
  if (user.role === ROLES.TRAINER) {
    writes.push(
      prisma.nutritionPlan.create({
        data: { ...base, clientId: null, meals: { create: mealCreateData() } },
      }),
    );
  }

  writes.push(
    prisma.nutritionPlan.create({
      data: {
        ...base,
        clientId: user.id,
        assignedAt,
        meals: { create: mealCreateData() },
      },
    }),
  );

  const written = await prisma.$transaction(writes);
  const live = written[written.length - 1];

  const totals = sumMacros(
    PLAN.meals.map((m) => ({
      foods: m.foods.map(([, , calories, protein, carbs, fat]) => ({
        calories,
        protein,
        carbs,
        fat,
      })),
    })),
  );

  console.log(`Account:  ${user.name} <${user.email}> (${user.role})`);
  if (user.role === ROLES.TRAINER) {
    console.log(`Library:  ${written[0].id}`);
  }
  console.log(`Live:     ${live.id}  assigned ${assignedAt.toISOString()}`);
  console.log(
    `Totals:   ${totals.calories} kcal · ${totals.protein}P / ${totals.carbs}C / ${totals.fat}F`,
  );
  console.log(
    `Targets:  ${PLAN.targetCalories} kcal · ${PLAN.targetProtein}P / ${PLAN.targetCarbs}C / ${PLAN.targetFat}F`,
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
