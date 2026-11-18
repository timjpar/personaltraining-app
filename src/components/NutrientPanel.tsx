// Micronutrients, drawn. Pure markup like MacroBar, so the server views and the
// client forms render the same thing from the same numbers.
import { cn } from "@/lib/cn";
import { NUTRIENT_DETAIL, type NutrientDetail } from "@/lib/constants";
import {
  energyOf,
  formatShare,
  macroGuide,
  nutrientGuide,
  type Guide,
  type GuidedKey,
  type MacroKey,
} from "@/lib/nutrient-guidance";
import {
  NUTRIENT_GROUP_LABELS,
  formatNutrient,
  formatNutrientValue,
  hasNutrients,
  nutrientsForTier,
  percentDV,
  roundNutrient,
  type NutrientDef,
  type NutrientGroup,
  type NutrientSource,
  type NutrientTotals,
  type NutrientUnit,
  type Nutrients,
} from "@/lib/nutrients";
import type { MacroTotals } from "@/lib/nutrition-form";

const GROUPS: NutrientGroup[] = ["carbs", "fats", "minerals", "vitamins"];

// Carbs and fats read against guidelines written as shares of calories, so
// they get the guided row; minerals and vitamins keep the Daily Value.
const GUIDED: NutrientGroup[] = ["carbs", "fats"];

// The order a fat breakdown reads in: the limits, the fat to fill with, then
// the polyunsaturated family from the whole down to its parts.
const FAT_ORDER: GuidedKey[] = [
  "satFat",
  "transFat",
  "monoFat",
  "polyFat",
  "omega6La",
  "omega3Ala",
  "omega3EpaDha",
  "cholesterol",
];

export function defsForDetail(detail: NutrientDetail): NutrientDef[] {
  if (detail === NUTRIENT_DETAIL.OFF) return [];
  return nutrientsForTier(detail === NUTRIENT_DETAIL.ALL ? "all" : "key");
}

// The FDA's own line for a food being a "high" source of something: 20% of
// the daily value in one serving. Used to say what a food is worth eating for.
const HIGH_SOURCE = 20;

// The day's nutrients in the families a label reads in: where the calories
// come from, carbs and fats against their guidelines, then minerals and
// vitamins against the daily value.
//
// The bar is the one thing here with a point of view. A target (iron, fibre)
// fills in the accent and reads as progress. A limit (sodium, saturated fat)
// is drawn as a track with a ceiling mark, fills in a neutral tone, and only
// turns the warning colour once it's past that mark — so a full bar never
// looks like an achievement when it's the opposite. A range (polyunsaturated
// fat) shades the stretch to land in between two marks.
export function NutrientPanel({
  totals,
  macros,
  detail,
  className,
}: {
  totals: NutrientTotals;
  // The day's macros, for the shares of calories carbs and fats are read in.
  macros: MacroTotals;
  detail: NutrientDetail;
  className?: string;
}) {
  const defs = defsForDetail(detail);
  if (!defs.length) return null;
  const { withData, foods } = totals;
  const kcal = energyOf(macros);
  const coverage = (d: NutrientDef) => nutrientCoverage(totals.counts[d.key] ?? 0, withData);
  const anySparse = defs.some((d) => coverage(d) === "sparse");
  const anyUnknown = defs.some((d) => coverage(d) === "none");

  return (
    <section
      aria-label="Micronutrients"
      className={cn(
        "@container rounded-[var(--radius-sm)] border border-line bg-card px-3.5 py-3",
        className,
      )}
    >
      <Coverage withData={withData} foods={foods} missing={totals.missing} />

      {withData > 0 ? (
        <div className="mt-3 flex flex-col gap-4">
          {kcal > 0 ? <CaloriesFrom macros={macros} kcal={kcal} /> : null}
          {GROUPS.map((group) => {
            const rows = defs.filter((d) => d.group === group);
            if (!rows.length) return null;
            return (
              <div key={group}>
                <p className="eyebrow mb-1.5 text-ink-soft/70">
                  {NUTRIENT_GROUP_LABELS[group]}
                </p>
                <ul className="grid gap-x-6 gap-y-2.5 @lg:grid-cols-2">
                  {GUIDED.includes(group)
                    ? guidedItems(group, rows, totals).map((item) => (
                        <GuidedRow key={item.key} item={item} kcal={kcal} withData={withData} />
                      ))
                    : rows.map((d) => (
                        <NutrientRow
                          key={d.key}
                          def={d}
                          value={totals.totals[d.key] ?? 0}
                          count={totals.counts[d.key] ?? 0}
                          withData={withData}
                          sources={totals.sources[d.key]}
                        />
                      ))}
                </ul>
                {group === "fats" ? <FatSplitNote totals={totals} fat={macros.fat} /> : null}
              </div>
            );
          })}
          <p className="flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] leading-snug text-ink-soft">
            <span>
              Calories, carbs and fats: share of the day&apos;s calories, with the
              guideline under each. Minerals and vitamins: % of the daily value. Tap a
              nutrient to see which foods it comes from.
            </span>
            <span className="inline-flex items-center gap-1">
              <CeilingMark /> marks a limit to stay under; a shaded stretch, a range to
              land in.
            </span>
            {anySparse ? <span>“3 of 20 foods” beside a name: only those report it, so it runs low.</span> : null}
            {anyUnknown ? <span>—: none of these foods reports it.</span> : null}
          </p>
        </div>
      ) : null}
    </section>
  );
}

// A total is only as complete as the foods it is built from. Said first, and
// plainly, so a day of typed-in foods never reads as a day with no iron in it.
function Coverage({
  withData,
  foods,
  missing,
}: {
  withData: number;
  foods: number;
  missing: string[];
}) {
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
  const without = foods - withData;
  // Named, so the gap can be found and filled in rather than only counted.
  const many = missing.length > 1 || (!missing.length && without > 1);
  return (
    <p className="text-xs leading-relaxed text-ink-soft">
      <span className="metric text-ink">
        {withData === foods ? `All ${foods}` : `${withData} of ${foods}`}
      </span>{" "}
      {foods === 1 ? "food" : "foods"} counted
      {without > 0 ? (
        <>
          {" — "}
          {missing.length ? <span className="text-ink">{nameList(missing)}</span> : without}
          {` ${many ? "have" : "has"} no micronutrient data, so these totals run low.`}
        </>
      ) : (
        "."
      )}
    </p>
  );
}

// "Matcha", "Matcha and Creatine", "A, B, C and 2 more".
function nameList(names: string[], max = 3): string {
  if (names.length === 1) return names[0];
  const shown = names.length > max + 1 ? names.slice(0, max) : names.slice(0, -1);
  const last = names.length > max + 1 ? `${names.length - max} more` : names[names.length - 1];
  return `${shown.join(", ")} and ${last}`;
}

// Whether a day's total for one nutrient can be read as a total. USDA reports
// nearly everything for nearly every food, so a nutrient a few foods lack is
// still a fair total; one most foods never report (iodine, chromium, biotin) is
// a sum of the few that do, and says so rather than reading as a shortfall.
type Coverage = "full" | "sparse" | "none";

function nutrientCoverage(count: number, withData: number): Coverage {
  if (count === 0) return "none";
  return count * 2 < withData ? "sparse" : "full";
}

function NutrientRow({
  def,
  value,
  count,
  withData,
  sources,
}: {
  def: NutrientDef;
  value: number;
  count: number;
  withData: number;
  sources?: NutrientSource[];
}) {
  const coverage = nutrientCoverage(count, withData);
  if (coverage === "none") {
    return (
      <li>
        <div className="flex items-baseline gap-2">
          <Chevron hidden />
          <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{def.label}</span>
          <span className="metric shrink-0 text-xs text-ink-soft" title="None of these foods reports it">
            —
          </span>
          <span className="w-10 shrink-0" />
        </div>
      </li>
    );
  }

  const pct = percentDV(def.key, value);
  const over = def.limit && pct != null && pct > 100;
  const expandable = !!sources?.length && value > 0;

  const row = (
    <>
      <div className="flex items-baseline gap-2">
        <Chevron hidden={!expandable} />
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          {def.label}
          {coverage === "sparse" ? (
            <span className="ml-1.5 text-[0.6875rem] text-ink-soft">
              {count} of {withData} foods
            </span>
          ) : null}
        </span>
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
    </>
  );

  if (!expandable) return <li>{row}</li>;
  return (
    <li>
      <details className="group/row">
        <summary className="cursor-pointer list-none rounded-sm [&::-webkit-details-marker]:hidden">
          {row}
        </summary>
        <Sources unit={def.unit} sources={sources!} total={value} />
      </details>
    </li>
  );
}

// Which foods a total is made of, largest first, each as a share of it. The
// long tail — a pinch of something from a dozen foods — folds into one line,
// so the list answers "where is my fibre from" rather than reciting the plan.
const TAIL_SHARE = 2;

function Sources({
  unit,
  sources,
  total,
}: {
  unit: NutrientUnit;
  sources: NutrientSource[];
  total: number;
}) {
  const fmt = (v: number) => `${formatNutrientValue(v)} ${unit}`;
  const share = (v: number) => Math.round((v / total) * 100);
  const cut = sources.findIndex((s) => share(s.value) < TAIL_SHARE);
  // A tail of one is just a food; it may as well be named.
  const shown = cut < 0 || cut >= sources.length - 1 ? sources : sources.slice(0, cut);
  const tail = sources.slice(shown.length);
  const tailValue = tail.reduce((sum, s) => sum + s.value, 0);

  return (
    <ul className="mb-1 ml-1 mt-1.5 flex flex-col gap-0.5 border-l border-line pl-3 text-xs">
      <li className="flex justify-end text-[0.625rem] text-ink-soft/70">share of total</li>
      {shown.map((s) => (
        <li key={s.name} className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-ink-soft">
            {s.name}
            {s.rows > 1 ? <span className="text-ink-soft/70"> ×{s.rows}</span> : null}
          </span>
          <span className="metric shrink-0 text-ink">{fmt(s.value)}</span>
          <span className="metric w-10 shrink-0 text-right text-ink-soft">{share(s.value)}%</span>
        </li>
      ))}
      {tail.length ? (
        <li className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-ink-soft/70">
            {tail.length} more foods
          </span>
          <span className="metric shrink-0 text-ink-soft">{fmt(tailValue)}</span>
          <span className="metric w-10 shrink-0 text-right text-ink-soft/70">{share(tailValue)}%</span>
        </li>
      ) : null}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Rows read against a guideline: the macros, carbs and fats.
// ---------------------------------------------------------------------------

const MACROS: { key: MacroKey; label: string }[] = [
  { key: "protein", label: "Protein" },
  { key: "carbs", label: "Carbs" },
  { key: "fat", label: "Fat" },
];

// Protein, carbs and fat as shares of the day's calories, each against the
// range the National Academies set. First, because it is the breakdown every
// row below it is a part of.
function CaloriesFrom({ macros, kcal }: { macros: MacroTotals; kcal: number }) {
  return (
    <div>
      <p className="eyebrow mb-1.5 text-ink-soft/70">Calories from</p>
      <ul className="grid gap-x-6 gap-y-2.5 @lg:grid-cols-2">
        {MACROS.map(({ key, label }) => {
          const grams = macros[key];
          const guide = macroGuide(key, grams, kcal);
          return (
            <li key={key}>
              <RowHead label={label} value={`${grams} g`} guide={guide} />
              <GuideBar value={grams} guide={guide} />
              <GuideNote guide={guide} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type GuidedItem = {
  key: GuidedKey;
  label: string;
  unit: NutrientUnit;
  value: number;
  count: number;
  sources?: NutrientSource[];
};

// The rows a guided group shows. Fats come in FAT_ORDER, with EPA and DHA as
// one row: every guideline for them is for the two together.
function guidedItems(group: NutrientGroup, defs: NutrientDef[], totals: NutrientTotals): GuidedItem[] {
  const item = (d: NutrientDef): GuidedItem => ({
    key: d.key,
    label: d.label,
    unit: d.unit,
    value: totals.totals[d.key] ?? 0,
    count: totals.counts[d.key] ?? 0,
    sources: totals.sources[d.key],
  });
  if (group !== "fats") return defs.map(item);

  const byKey = new Map(defs.map((d) => [d.key as GuidedKey, d]));
  const out: GuidedItem[] = [];
  for (const key of FAT_ORDER) {
    if (key === "omega3EpaDha") {
      if (byKey.has("omega3Epa") || byKey.has("omega3Dha")) out.push(epaDha(totals));
      continue;
    }
    const d = byKey.get(key);
    if (d) out.push(item(d));
  }
  return out;
}

function epaDha(totals: NutrientTotals): GuidedItem {
  const t = totals.totals;
  const merged = new Map<string, NutrientSource>();
  for (const s of [...(totals.sources.omega3Epa ?? []), ...(totals.sources.omega3Dha ?? [])]) {
    const prev = merged.get(s.name);
    merged.set(s.name, {
      name: s.name,
      value: roundNutrient((prev?.value ?? 0) + s.value),
      rows: Math.max(prev?.rows ?? 0, s.rows),
    });
  }
  const sources = [...merged.values()].sort((a, b) => b.value - a.value);
  return {
    key: "omega3EpaDha",
    label: "Omega-3 EPA + DHA",
    unit: "g",
    value: roundNutrient((t.omega3Epa ?? 0) + (t.omega3Dha ?? 0)),
    count: Math.max(totals.counts.omega3Epa ?? 0, totals.counts.omega3Dha ?? 0),
    sources: sources.length ? sources : undefined,
  };
}

function GuidedRow({ item, kcal, withData }: { item: GuidedItem; kcal: number; withData: number }) {
  const coverage = nutrientCoverage(item.count, withData);
  const guide = nutrientGuide(item.key, item.value, kcal);

  // Nothing reports it: no total to draw, but the guideline still says what
  // to aim for.
  if (coverage === "none") {
    return (
      <li>
        <div className="flex items-baseline gap-2">
          <Chevron hidden />
          <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{item.label}</span>
          <span className="metric shrink-0 text-xs text-ink-soft" title="None of these foods reports it">
            —
          </span>
          <span className="w-10 shrink-0" />
        </div>
        {guide ? <GuideNote guide={guide} /> : null}
      </li>
    );
  }

  const expandable = !!item.sources?.length && item.value > 0;
  const row = (
    <>
      <RowHead
        label={item.label}
        value={`${formatNutrientValue(item.value)} ${item.unit}`}
        guide={guide}
        expandable={expandable}
        sparse={coverage === "sparse" ? `${item.count} of ${withData} foods` : undefined}
      />
      {guide ? <GuideBar value={item.value} guide={guide} /> : null}
      {guide ? <GuideNote guide={guide} /> : null}
    </>
  );

  if (!expandable) return <li>{row}</li>;
  return (
    <li>
      <details className="group/row">
        <summary className="cursor-pointer list-none rounded-sm [&::-webkit-details-marker]:hidden">
          {row}
        </summary>
        <Sources unit={item.unit} sources={item.sources!} total={item.value} />
      </details>
    </li>
  );
}

// Name, amount, and the share of calories it is where the guideline is one.
function RowHead({
  label,
  value,
  guide,
  expandable,
  sparse,
}: {
  label: string;
  value: string;
  guide: Guide | null;
  expandable?: boolean;
  sparse?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <Chevron hidden={!expandable} />
      <span className="min-w-0 flex-1 truncate text-sm text-ink">
        {label}
        {sparse ? <span className="ml-1.5 text-[0.6875rem] text-ink-soft">{sparse}</span> : null}
      </span>
      <span className="metric shrink-0 text-xs text-ink">{value}</span>
      <span
        className={cn(
          "metric w-10 shrink-0 text-right text-xs",
          guide?.status === "above" ? "text-flag" : "text-ink-soft",
        )}
        title={guide?.share != null ? "Share of the day's calories" : undefined}
      >
        {guide?.share != null ? formatShare(guide.share) : ""}
      </span>
    </div>
  );
}

// The track runs a quarter past whichever is furthest out — the amount or the
// guideline's far end — so the marks sit inside it and an amount well over a
// limit still shows how far over. A range is a shaded stretch between two
// marks; a limit is one mark; a minimum is one mark and a fill that turns the
// accent once it's reached.
function GuideBar({ value, guide }: { value: number; guide: Guide }) {
  if (guide.status === "unset") return null;
  const { low, high } = guide;
  const top = Math.max(value, high ?? 0, low ?? 0) * 1.25 || 1;
  const at = (v: number) => Math.min(v / top, 1) * 100;
  const fill =
    guide.status === "above"
      ? "bg-flag"
      : guide.status === "below" || guide.limit
        ? "bg-ink-soft/60"
        : "bg-jade";
  return (
    <div aria-hidden className="relative mt-1 h-1 rounded-full bg-line">
      {low != null && high != null ? (
        <div
          className="absolute inset-y-0 bg-jade/30"
          style={{ left: `${at(low)}%`, width: `${at(high) - at(low)}%` }}
        />
      ) : null}
      <div className={cn("relative h-full rounded-full", fill)} style={{ width: `${at(value)}%` }} />
      {low != null ? <Mark at={at(low)} /> : null}
      {high != null ? <Mark at={at(high)} /> : null}
    </div>
  );
}

function Mark({ at }: { at: number }) {
  return <span className="absolute -top-1 h-3 w-px bg-ink-soft" style={{ left: `${at}%` }} />;
}

// What to aim for, worked out for this day, and who says so.
function GuideNote({ guide }: { guide: Guide }) {
  return (
    <p className="mt-1 pl-4 text-[0.6875rem] leading-snug text-ink-soft">
      {guide.text}
      <span className="text-ink-soft/70"> · {guide.source}</span>
    </p>
  );
}

// Saturated, mono and polyunsaturated fat rarely add up to the fat total: a
// food can report its fat without splitting it by type (most labels do), and
// part of every fat is glycerol rather than fatty acid. Said once a gap is big
// enough to notice, so a short polyunsaturated total isn't read as the whole.
function FatSplitNote({ totals, fat }: { totals: NutrientTotals; fat: number }) {
  const t = totals.totals;
  const split = (t.satFat ?? 0) + (t.monoFat ?? 0) + (t.polyFat ?? 0) + (t.transFat ?? 0);
  if (fat <= 0 || split <= 0 || fat - split < Math.max(2, fat * 0.05)) return null;
  return (
    <p className="mt-2 text-[0.6875rem] leading-snug text-ink-soft">
      Saturated, mono and polyunsaturated fat add up to{" "}
      <span className="metric text-ink">{Math.round(split)}</span> of{" "}
      <span className="metric text-ink">{fat} g</span>. The rest is in foods that
      don&apos;t split their fat by type, plus the glycerol every fat carries.
    </p>
  );
}

// The disclosure mark on a nutrient row, or the room for one, so the names
// line up whether or not a row opens.
function Chevron({ hidden }: { hidden?: boolean }) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      aria-hidden
      className={cn(
        "shrink-0 self-center text-ink-soft transition-transform group-open/row:rotate-90",
        hidden && "invisible",
      )}
    >
      <path d="M2.5 1.5 5.5 4l-3 2.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
