// What someone is actually eating, as one daily calorie figure — the input the
// weight projection needs. Server-only: it reads the database.
//
// What they logged wins over what they were prescribed, when there is enough of
// it to mean something: a plan is what the coach wrote, a log is what happened,
// and a projection off the plan would describe a person who eats exactly to
// plan every day. "Enough" is a week of logged days out of the last two — fewer
// than that and one big or one forgotten day swings the average more than the
// plan is likely to be off by.
//
// Otherwise the current plan, by the same rule every day view uses: the most
// recently assigned plan whose client is this person. Its calorie target if it
// has one, or what its foods add up to if it doesn't.
import { prisma } from "@/lib/db";

export const LOG_WINDOW_DAYS = 14;
export const MIN_LOGGED_DAYS = 7;

export type Intake = {
  kcal: number;
  source: "log" | "plan";
  // "14-day logged average (9 days)" or the plan's title — what the panel
  // names as the figure's origin.
  label: string;
};

export async function currentIntake(userId: string): Promise<Intake | null> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - LOG_WINDOW_DAYS);

  const [logs, plan] = await Promise.all([
    prisma.nutritionLog.findMany({
      where: { clientId: userId, date: { gte: since } },
      select: { foods: { select: { calories: true } } },
    }),
    prisma.nutritionPlan.findFirst({
      where: { clientId: userId },
      orderBy: { assignedAt: "desc" },
      select: {
        title: true,
        targetCalories: true,
        meals: { select: { foods: { select: { calories: true } } } },
      },
    }),
  ]);

  const days = logs
    .map((l) => l.foods.reduce((sum, f) => sum + (f.calories ?? 0), 0))
    .filter((kcal) => kcal > 0);
  if (days.length >= MIN_LOGGED_DAYS) {
    return {
      kcal: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
      source: "log",
      label: `${LOG_WINDOW_DAYS}-day logged average (${days.length} days)`,
    };
  }

  if (plan) {
    const fromFoods = plan.meals
      .flatMap((m) => m.foods)
      .reduce((sum, f) => sum + (f.calories ?? 0), 0);
    const kcal = plan.targetCalories ?? (fromFoods > 0 ? fromFoods : null);
    if (kcal) return { kcal, source: "plan", label: plan.title };
  }

  return null;
}
