// One day of the coach's own food log. Shared by /me/nutrition (today) and
// /me/nutrition/[date] (any other day) so the two routes stay a difference of
// which date they resolve, and nothing else — the same split the athlete's day
// view uses next door.
//
// This file used to argue that it needed no plan panel, on the grounds that a
// meal plan is something a coach assigns to somebody and there is nobody above
// this account to assign one. The second half of that was the mistaken part:
// the coach can assign one to themselves (src/lib/assignees.ts), and a plan
// they wrote for themselves is exactly as much a prescription as one they
// received would be.
//
// So the panel is here, and the targets have an order of precedence rather than
// a single source: an assigned plan first, the figures derived from the coach's
// own profile and newest weigh-in second. dailyTargets owns that rule and
// explains it. The derived suggestion is still what a coach sees before they
// assign themselves anything, which is the case the old comment was really
// about — nobody has to invent a plan to get a number.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { NutritionLogForm } from "@/components/NutritionLogForm";
import { NutritionPlanView } from "@/components/NutritionPlanView";
import { NutritionWeekStrip } from "@/components/NutritionWeekStrip";
import { saveMyNutritionLog } from "../actions";
import { geminiConfig } from "@/lib/gemini";
import { dailyTargets, suggestTargets, targetInputsFrom } from "@/lib/body";
import { addDays, formatDate, toDateInput } from "@/lib/format";
import { startOfWeekSunday } from "@/lib/calendar";
import { recentFoods } from "@/lib/food-presets";

export async function MyNutritionDay({
  trainerId,
  day,
}: {
  trainerId: string;
  day: Date;
}) {
  const weekStart = startOfWeekSunday(day);
  const weekEnd = addDays(weekStart, 7);

  const [log, plan, profile, latest, recentRows, weekLogs] = await Promise.all([
    prisma.nutritionLog.findUnique({
      where: { clientId_date: { clientId: trainerId, date: day } },
      include: { foods: { orderBy: { order: "asc" } } },
    }),
    // The coach's own current plan, which is the most recently assigned one —
    // the identical query and the identical rule the athlete's day view uses,
    // against a row whose clientId happens to equal its trainerId.
    prisma.nutritionPlan.findFirst({
      where: { clientId: trainerId },
      orderBy: { assignedAt: "desc" },
      include: {
        meals: {
          orderBy: { order: "asc" },
          include: { foods: { orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.clientProfile.findUnique({ where: { userId: trainerId } }),
    prisma.measurement.findFirst({
      where: { clientId: trainerId, weightKg: { not: null } },
      orderBy: { date: "desc" },
      select: { weightKg: true },
    }),
    prisma.loggedFood.findMany({
      where: { log: { clientId: trainerId } },
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
      where: { clientId: trainerId, date: { gte: weekStart, lt: weekEnd } },
      select: { date: true },
    }),
  ]);

  // Recomputed at render rather than stored, exactly as SuggestedTargets does
  // it: the numbers are a pure function of the profile and the newest weigh-in,
  // so a stored copy would go stale the moment either changed.
  const { inputs } = targetInputsFrom(profile, latest);
  const t = inputs ? suggestTargets(inputs) : null;
  const planTargets = plan
    ? {
        calories: plan.targetCalories,
        protein: plan.targetProtein,
        carbs: plan.targetCarbs,
        fat: plan.targetFat,
      }
    : null;
  const targets = dailyTargets(
    planTargets,
    t ? { calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat } : null,
  );
  // Which one won, so the footnote names the right source. dailyTargets returns
  // whichever object it picked, so identity answers it.
  const fromPlan = targets !== null && targets === planTargets;

  const logged = new Set(weekLogs.map((l) => toDateInput(l.date)));
  const dayKey = toDateInput(day);
  const todayKey = toDateInput(new Date());
  // saveMyNutritionLog refuses a future date, so the form is replaced rather
  // than shown and left to fail on submit.
  const isFuture = dayKey > todayKey;

  return (
    <div className="flex flex-col gap-7">
      <NutritionWeekStrip
        basePath="/me/nutrition"
        weekStart={weekStart}
        logged={logged}
        current={dayKey}
        today={todayKey}
      />

      {/* Two columns once there's a plan to put in the second one, and a
          single column when there isn't — rather than the athlete's permanent
          grid, which would leave a coach with no plan reading a log squeezed
          into 1.4fr beside an empty explanation. */}
      <div
        className={
          plan
            ? "grid gap-7 lg:grid-cols-[1.4fr_1fr] lg:items-start"
            : "flex flex-col gap-7"
        }
      >
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
              This day hasn&rsquo;t happened yet, so there&rsquo;s nothing to log
              against it. Come back on the day to record what you actually ate.
            </p>
          </Card>
        ) : (
          <div className="mt-4">
            <NutritionLogForm
              action={saveMyNutritionLog.bind(null, dayKey)}
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
              targets={targets}
              recent={recentFoods(recentRows)}
              self
              // Read here rather than in the component: a client component
              // can't see process.env, and this is the server boundary.
              photoEnabled={geminiConfig() !== null}
            />
          </div>
        )}

        {/* Where the targets above the totals came from, and how to change
            them. Without this line a number appears over the macro strip with
            no way to trace it — and now that there are two possible sources,
            saying which one is doing the talking matters more, not less. */}
        <p className="mt-4 text-xs text-ink-soft">
          {fromPlan ? (
            <>
              Measured against{" "}
              <span className="text-ink">{plan?.title}</span>, the plan you
              assigned yourself.
            </>
          ) : targets ? (
            <>
              Measured against the targets derived from{" "}
              <Link href="/me/profile" className="text-jade-strong hover:underline">
                your file
              </Link>
              .
            </>
          ) : (
            <>
              <Link href="/me/profile" className="text-jade-strong hover:underline">
                Fill in your file
              </Link>{" "}
              and log a weigh-in to see these totals against a target — or
              assign yourself a{" "}
              <Link href="/nutrition" className="text-jade-strong hover:underline">
                meal plan
              </Link>
              .
            </>
          )}
        </p>
      </section>

      {plan ? (
        <section>
          <h2 className="font-display text-lg font-semibold text-ink lg:mb-4">
            Your plan
          </h2>
          {/* Open on a wide screen where there's room for both, collapsed on a
              phone where it would otherwise push the log off — the same call
              the athlete's day view makes, for the same reason. */}
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
        </section>
      ) : null}
      </div>
    </div>
  );
}
