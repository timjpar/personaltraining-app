// Micronutrients, drawn. Pure markup like MacroBar, so the server views and the
// client forms render the same thing from the same numbers.
import { cn } from "@/lib/cn";
import { NUTRIENT_DETAIL, type NutrientDetail } from "@/lib/constants";
import {
  NUTRIENT_GROUP_LABELS,
  formatNutrient,
  hasNutrients,
  nutrientsForTier,
  percentDV,
  type NutrientDef,
  type NutrientGroup,
  type NutrientTotals,
  type Nutrients,
} from "@/lib/nutrients";

const GROUPS: NutrientGroup[] = ["fats", "minerals", "vitamins"];

export function defsForDetail(detail: NutrientDetail): NutrientDef[] {
  if (detail === NUTRIENT_DETAIL.OFF) return [];
  return nutrientsForTier(detail === NUTRIENT_DETAIL.ALL ? "all" : "key");
}

// The FDA's own line for a food being a "high" source of something: 20% of
// the daily value in one serving. Used to say what a food is worth eating for.
const HIGH_SOURCE = 20;

// The day's micronutrients against the daily value, in the three families a
// label reads in.
//
// The bar is the one thing here with a point of view. A target (iron, fibre)
// fills in the accent and reads as progress. A limit (sodium, saturated fat)
// is drawn as a track with a ceiling mark at its end, fills in a neutral tone,
// and only turns the warning colour once it's past that mark — so a full bar
// never looks like an achievement when it's the opposite.
export function NutrientPanel({
  totals,
  detail,
  className,
}: {
  totals: NutrientTotals;
  detail: NutrientDetail;
  className?: string;
}) {
  const defs = defsForDetail(detail);
  if (!defs.length) return null;
  const { withData, foods } = totals;

  return (
    <section
      aria-label="Micronutrients"
      className={cn(
        "@container rounded-[var(--radius-sm)] border border-line bg-card px-3.5 py-3",
        className,
      )}
    >
      <Coverage withData={withData} foods={foods} />

      {withData > 0 ? (
        <div className="mt-3 flex flex-col gap-4">
          {GROUPS.map((group) => {
            const rows = defs.filter((d) => d.group === group);
            if (!rows.length) return null;
            return (
              <div key={group}>
                <p className="eyebrow mb-1.5 text-ink-soft/70">
                  {NUTRIENT_GROUP_LABELS[group]}
                </p>
                <ul className="grid gap-x-6 gap-y-2.5 @lg:grid-cols-2">
                  {rows.map((d) => (
                    <NutrientRow
                      key={d.key}
                      def={d}
                      value={totals.totals[d.key] ?? 0}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] leading-snug text-ink-soft">
            <span>% of the daily value.</span>
            <span className="inline-flex items-center gap-1">
              <CeilingMark /> marks a limit to stay under.
            </span>
          </p>
        </div>
      ) : null}
    </section>
  );
}

// A total is only as complete as the foods it is built from. Said first, and
// plainly, so a day of typed-in foods never reads as a day with no iron in it.
function Coverage({ withData, foods }: { withData: number; foods: number }) {
  if (foods === 0) {
    return <p className="text-sm text-ink-soft">Add a food to see its micronutrients.</p>;
  }
  if (withData === 0) {
    return (
      <p className="text-sm leading-relaxed text-ink-soft">
        None of these foods has micronutrient data. Foods picked from the list or
        scanned from a barcode bring theirs with them; anything else can have
        values typed in under its Nutrients.
      </p>
    );
  }
  const missing = foods - withData;
  return (
    <p className="text-xs leading-relaxed text-ink-soft">
      <span className="metric text-ink">
        {withData === foods ? `All ${foods}` : `${withData} of ${foods}`}
      </span>{" "}
      {foods === 1 ? "food" : "foods"} counted
      {missing > 0
        ? ` — ${missing} ${missing === 1 ? "has" : "have"} no micronutrient data, so these totals run low.`
        : "."}
    </p>
  );
}

function NutrientRow({ def, value }: { def: NutrientDef; value: number }) {
  const pct = percentDV(def.key, value);
  const over = def.limit && pct != null && pct > 100;

  return (
    <li>
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{def.label}</span>
        <span className="metric shrink-0 text-xs text-ink">
          {formatNutrient(def.key, value)}
        </span>
        <span
          className={cn(
            "metric w-10 shrink-0 text-right text-xs",
            over ? "text-flag" : "text-ink-soft",
          )}
        >
          {pct == null ? "" : `${pct}%`}
        </span>
      </div>
      {pct != null ? (
        <div
          aria-hidden
          className={cn(
            "relative mt-1 h-1 rounded-full bg-line",
            // The ceiling mark: a limit's track ends in a post.
            def.limit &&
              "after:absolute after:-top-1 after:right-0 after:h-3 after:w-px after:bg-ink-soft",
          )}
        >
          <div
            className={cn(
              "h-full rounded-full",
              def.limit ? (over ? "bg-flag" : "bg-ink-soft/60") : "bg-jade",
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      ) : null}
    </li>
  );
}

// "Vitamin B12" reads as "vitamin B12" mid-sentence, not "vitamin b12", and
// "Thiamin (B1)" loses its bracket.
function proseName(label: string): string {
  const l = label.replace(/ \(.+\)$/, "");
  return l[0].toLowerCase() + l.slice(1);
}

function CeilingMark() {
  return <span aria-hidden className="inline-block h-2.5 w-px bg-ink-soft" />;
}

// One food's micronutrients, folded away under the row until asked for. The
// summary says what the food is worth eating for — the nutrients it is a high
// source of — so the answer is there without opening it.
export function FoodNutrients({
  nutrients,
  detail,
  className,
}: {
  nutrients: Nutrients | null;
  detail: NutrientDetail;
  className?: string;
}) {
  const defs = defsForDetail(detail);
  if (!defs.length || !hasNutrients(nutrients)) return null;

  const present = defs.filter((d) => (nutrients[d.key] ?? 0) > 0);
  if (!present.length) return null;

  const high = present
    .filter((d) => !d.limit)
    .map((d) => ({ d, pct: percentDV(d.key, nutrients[d.key]!) ?? 0 }))
    .filter((x) => x.pct >= HIGH_SOURCE)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
    .map((x) => proseName(x.d.label));

  return (
    <details className={cn("group", className)}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm text-[0.6875rem] text-ink-soft transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          aria-hidden
          className="transition-transform group-open:rotate-90"
        >
          <path d="M2.5 1.5 5.5 4l-3 2.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {high.length ? (
          <span>
            High in <span className="text-jade-strong">{high.join(", ")}</span>
          </span>
        ) : (
          <span>Nutrients</span>
        )}
      </summary>
      <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 pb-0.5 text-xs">
        {present.map((d) => {
          const v = nutrients[d.key]!;
          const pct = percentDV(d.key, v);
          return (
            <div key={d.key} className="flex items-baseline gap-1">
              <dt className="text-ink-soft">{d.label}</dt>
              <dd
                className={cn(
                  "metric",
                  pct != null && pct >= HIGH_SOURCE
                    ? d.limit
                      ? "text-flag"
                      : "text-jade-strong"
                    : "text-ink",
                )}
              >
                {formatNutrient(d.key, v)}
              </dd>
            </div>
          );
        })}
      </dl>
    </details>
  );
}
