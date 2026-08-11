import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Container, EmptyState, PageHeading } from "@/components/ui";
import { NutritionTrend } from "@/components/NutritionTrend";
import { suggestTargets, targetInputsFrom } from "@/lib/body";
import { sumMacros } from "@/lib/nutrition-form";
import { toUnits } from "@/lib/constants";
import { formatDate, formatDateShort, toDateInput } from "@/lib/format";
import type { NutritionRow } from "@/lib/metrics";

// Every day the coach has logged, and the trend across them.
//
// The counterpart to /me/body, and the reason it exists: the food card on /me
// could only ever reach *today*, so a coach keeping their own log had no way to
// look back at it. The week strip on /me/nutrition answers "did I log
// Tuesday?"; this answers "what has the last two months looked like?", which is
// a different question and was previously unanswerable without editing the URL.
export default async function MyNutritionHistoryPage() {
  const trainer = await requireTrainer();

  const [logs, profile, latest] = await Promise.all([
    prisma.nutritionLog.findMany({
      where: { clientId: trainer.id },
      orderBy: { date: "desc" },
      take: 60,
      include: {
        foods: {
          select: { calories: true, protein: true, carbs: true, fat: true },
        },
      },
    }),
    prisma.clientProfile.findUnique({ where: { userId: trainer.id } }),
    prisma.measurement.findFirst({
      where: { clientId: trainer.id, weightKg: { not: null } },
      orderBy: { date: "desc" },
      select: { weightKg: true },
    }),
  ]);

  const units = toUnits(trainer.units);

  // Same derivation the day view measures against, recomputed here rather than
  // stored. Worth being plain about what that means for a chart: this is the
  // target as of *today*, drawn flat across days when it may well have been
  // something else. Nothing in the schema records what it was then, so the
  // caption below says "current" instead of implying otherwise.
  const { inputs } = targetInputsFrom(profile, latest);
  const t = inputs ? suggestTargets(inputs) : null;
  const targets = t
    ? { calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat }
    : null;

  // One call per day. sumMacros flattens whatever it is given into a single
  // total, so handing it every day at once would return a grand total rather
  // than a series.
  const days = logs.map((log) => ({
    log,
    totals: sumMacros([{ foods: log.foods }]),
  }));

  const rows: NutritionRow[] = days.map(({ log, totals }) => ({
    t: log.date.getTime(),
    label: formatDate(log.date),
    short: formatDateShort(log.date),
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
  }));

  return (
    <Container>
      <Link
        href="/me"
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ You
      </Link>

      <div className="mt-3">
        <PageHeading eyebrow="Your nutrition" title="Food log">
          Every day you have logged. Tap one to edit it.
        </PageHeading>
      </div>

      {/* Always here, empty or not — the blank frame and its chips say what a
          logged day would show. */}
      <Card className="mt-6 p-4 sm:p-5">
        <NutritionTrend rows={rows} targets={targets} units={units} />
        {targets && rows.length > 0 ? (
          <p className="mt-3 text-xs text-ink-soft">
            The dashed line is your{" "}
            <Link href="/me/profile" className="text-jade-strong hover:underline">
              current target
            </Link>
            , not what it was on each day — the app derives it and never stores
            it.
          </p>
        ) : null}
      </Card>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">
          Days
        </h2>

        {days.length === 0 ? (
          <EmptyState title="Nothing logged yet">
            Days you log show up here with their totals, and the trend starts
            from the first one.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {days.map(({ log, totals }) => {
              const over =
                targets?.calories != null && totals.calories > targets.calories;
              return (
                <Link
                  key={log.id}
                  href={`/me/nutrition/${toDateInput(log.date)}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {formatDate(log.date)}
                    </p>
                    <p className="metric mt-0.5 text-xs text-ink-soft">
                      P {totals.protein} · C {totals.carbs} · F {totals.fat}
                      {log.foods.length
                        ? ` · ${log.foods.length} item${log.foods.length === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  {/* Amber for over target, the same call the client file makes
                      — it's a number to look at, not a fault. */}
                  <span
                    className={
                      "metric shrink-0 text-xs " +
                      (over ? "text-amber" : "text-ink-soft")
                    }
                  >
                    {totals.calories}
                    {targets?.calories != null ? ` / ${targets.calories}` : ""}{" "}
                    kcal
                  </span>
                  <span className="text-ink-soft">›</span>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </Container>
  );
}
