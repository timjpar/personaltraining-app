// One day of the coach's own food log. Shared by /me/nutrition (today) and
// /me/nutrition/[date] (any other day) so the two routes stay a difference of
// which date they resolve, and nothing else — the same split the athlete's day
// view uses next door.
//
// The one structural difference from that view: no plan panel. A meal plan is
// something a coach assigns to somebody, and there is nobody above this account
// to assign one. The targets the day is measured against are derived instead,
// from the coach's own profile and newest weigh-in — the same suggestion
// /me/profile shows the working for. That keeps one source of truth for "what am
// I aiming at" rather than asking a coach to assign themselves a plan to get a
// number they can already see.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { NutritionLogForm } from "@/components/NutritionLogForm";
import { NutritionWeekStrip } from "@/components/NutritionWeekStrip";
import { saveMyNutritionLog } from "../actions";
import { geminiConfig } from "@/lib/gemini";
import { suggestTargets, targetInputsFrom } from "@/lib/body";
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

  const [log, profile, latest, recentRows, weekLogs] = await Promise.all([
    prisma.nutritionLog.findUnique({
      where: { clientId_date: { clientId: trainerId, date: day } },
      include: { foods: { orderBy: { order: "asc" } } },
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
  const targets = t
    ? {
        calories: t.calories,
        protein: t.protein,
        carbs: t.carbs,
        fat: t.fat,
      }
    : null;

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
            no way to trace it — the plan title does that job on an athlete's
            version of this page, and a derived figure needs it more, not
            less. */}
        <p className="mt-4 text-xs text-ink-soft">
          {targets ? (
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
              and log a weigh-in to see these totals against a target.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
