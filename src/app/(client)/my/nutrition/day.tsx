// One day of the athlete's food log, with the coach's plan alongside. Shared by
// /my/nutrition (today) and /my/nutrition/[date] (any other day) so the two
// routes stay a difference of which date they resolve, and nothing else.
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { NutritionLogForm } from "@/components/NutritionLogForm";
import { NutritionPlanView } from "@/components/NutritionPlanView";
import { NutritionWeekStrip } from "@/components/NutritionWeekStrip";
import { saveNutritionLog } from "./actions";
import { geminiConfig } from "@/lib/gemini";
import { addDays, formatDate, toDateInput } from "@/lib/format";
import { startOfWeekSunday } from "@/lib/calendar";
import { recentFoods } from "@/lib/food-presets";

export async function NutritionDay({
  clientId,
  day,
}: {
  clientId: string;
  day: Date;
}) {
  const weekStart = startOfWeekSunday(day);
  const weekEnd = addDays(weekStart, 7);

  const [log, plan, recentRows, weekLogs] = await Promise.all([
    prisma.nutritionLog.findUnique({
      where: { clientId_date: { clientId, date: day } },
      include: { foods: { orderBy: { order: "asc" } } },
    }),
    // The current plan is the most recently assigned one — the same rule the
    // read-only nutrition page has always used.
    prisma.nutritionPlan.findFirst({
      where: { clientId },
      orderBy: { assignedAt: "desc" },
      include: {
        meals: {
          orderBy: { order: "asc" },
          include: { foods: { orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.loggedFood.findMany({
      where: { log: { clientId } },
      orderBy: { log: { date: "desc" } },
      take: 60,
      select: {
        name: true,
        quantity: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
      },
    }),
    prisma.nutritionLog.findMany({
      where: { clientId, date: { gte: weekStart, lt: weekEnd } },
      select: { date: true },
    }),
  ]);

  const targets = plan
    ? {
        calories: plan.targetCalories,
        protein: plan.targetProtein,
        carbs: plan.targetCarbs,
        fat: plan.targetFat,
      }
    : null;
  const hasTargets = targets
    ? Object.values(targets).some((v) => v != null)
    : false;

  const logged = new Set(weekLogs.map((l) => toDateInput(l.date)));
  const dayKey = toDateInput(day);
  const todayKey = toDateInput(new Date());
  // Every day in the week is reachable, including the ones that haven't
  // happened — looking ahead at the plan is a reason to open Thursday. Logging
  // still isn't: saveNutritionLog refuses a future date, so the form is
  // replaced rather than shown and left to fail on submit.
  const isFuture = dayKey > todayKey;

  return (
    <div className="flex flex-col gap-7">
      <NutritionWeekStrip
        basePath="/my/nutrition"
        weekStart={weekStart}
        logged={logged}
        current={dayKey}
        today={todayKey}
      />

      {/* Log first, plan second. The verb you opened the page for goes above
          the reference material — and on a phone the plan is a <details>, so
          it costs one line until you want it. */}
      <div className="grid gap-7 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">
            {isFuture ? "Not yet" : "What you ate"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {formatDate(day)}
            {dayKey === todayKey ? " · today" : ""}
          </p>
          {isFuture ? (
            <Card className="mt-4 p-5">
              <p className="text-sm text-ink-soft">
                This day hasn&rsquo;t happened yet, so there&rsquo;s nothing to
                log against it. Your plan for it is right here whenever you want
                to look ahead — come back on the day to record what you actually
                ate.
              </p>
            </Card>
          ) : (
          <div className="mt-4">
            <NutritionLogForm
              action={saveNutritionLog.bind(null, dayKey)}
              initial={
                log
                  ? {
                      notes: log.notes,
                      entries: log.foods.map((f) => ({
                        meal: f.meal,
                        name: f.name,
                        quantity: f.quantity,
                        calories: f.calories,
                        protein: f.protein,
                        carbs: f.carbs,
                        fat: f.fat,
                        source: f.source,
                      })),
                    }
                  : undefined
              }
              targets={hasTargets ? targets : null}
              recent={recentFoods(recentRows)}
              // Read here rather than in the component: a client component
              // can't see process.env, and this is the server boundary.
              photoEnabled={geminiConfig() !== null}
            />
          </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink lg:mb-4">
            Your plan
          </h2>
          {plan ? (
            <>
              {/* Open on a wide screen where there's room for both, collapsed
                  on a phone where it would otherwise push the log off. */}
              <details className="group mt-2 lg:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm text-jade-strong">
                  <span>{plan.title}</span>
                  <span aria-hidden className="text-ink-soft group-open:hidden">
                    show ›
                  </span>
                  <span aria-hidden className="hidden text-ink-soft group-open:inline">
                    hide ›
                  </span>
                </summary>
                <div className="mt-4">
                  <NutritionPlanView plan={plan} />
                </div>
              </details>
              <div className="hidden lg:block">
                <p className="mb-4 text-sm text-ink-soft">{plan.title}</p>
                <NutritionPlanView plan={plan} />
              </div>
            </>
          ) : (
            <Card className="mt-2 p-5">
              <p className="text-sm text-ink-soft">
                Your coach hasn&rsquo;t assigned a meal plan yet. You can still log
                what you eat — they&rsquo;ll see it either way.
              </p>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
