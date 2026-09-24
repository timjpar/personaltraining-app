// Builds src/lib/food-nutrients.generated.ts from USDA FoodData Central.
//
//   1. Download the SR Legacy CSV release (about 6 MB zipped) and unzip it
//      somewhere outside the repo:
//      https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
//   2. npx tsx scripts/build-food-nutrients.ts <path to the unzipped folder>
//
// Which USDA food each catalog entry is matched to lives in
// food-nutrients-map.ts; this script only reads the numbers. It also prints a
// check of each match against the calories the catalog already carries: a food
// whose serving weight and calories disagree with USDA by a wide margin has
// either been matched to the wrong entry or has a wrong serving weight, and
// both would make gram-based scaling quietly wrong.
//
// The CSVs stay out of the repo. They're public domain, but 40 MB of them to
// regenerate a 30 KB file is the wrong trade.
import fs from "node:fs";
import path from "node:path";
import { FOOD_PRESETS, normalizeFoodName } from "@/lib/food-presets";
import { NUTRIENTS } from "@/lib/nutrients";
import {
  ML_PER_CUP,
  gramsPerCupFromServing,
  parseGrams,
  parseMl,
} from "@/lib/food-amounts";
import { USDA_MATCHES } from "./food-nutrients-map";

const ENERGY_KCAL = 1008;
const OUT = path.join(__dirname, "..", "src", "lib", "food-nutrients.generated.ts");

// USDA's CSVs quote every field and escape quotes by doubling them.
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function readCsv(dir: string, name: string): Record<string, string>[] {
  const lines = fs
    .readFileSync(path.join(dir, name), "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  const head = parseLine(lines[0]);
  return lines.slice(1).map((l) => {
    const v = parseLine(l);
    return Object.fromEntries(head.map((h, i) => [h, v[i]]));
  });
}

// Three significant figures: more than any source measures to, and it keeps
// the generated file small enough not to matter in the client bundle.
const sig = (n: number) => (n === 0 ? 0 : Number(n.toPrecision(3)));

type Portion = { amount: number; unit: string; modifier: string; grams: number };

// USDA writes household measures as a unit plus a free-text modifier ("cup,
// chopped"), and most of SR Legacy files the whole thing under the modifier
// with the unit "undetermined". Plain cups first, then the cut people mean by
// "a cup of" something, then spoons scaled up. Mashed, puréed and in-the-hull
// cups are skipped: they weigh something else entirely.
function cupFromPortions(portions: Portion[]): { grams: number; from: string } | null {
  const describe = (p: Portion) =>
    `${p.unit === "undetermined" ? "" : `${p.unit} `}${p.modifier}`.trim().toLowerCase();
  const perCup = (p: Portion) => p.grams / p.amount;

  const cups = portions.filter((p) => /^cups?\b/.test(describe(p)));
  const usable = cups.filter(
    (p) => !/hull|pure|mash|pack|yield|crumb|melted|whipped/.test(describe(p)),
  );
  const rank = (p: Portion) => {
    const d = describe(p);
    if (/^cups?$/.test(d)) return 0;
    if (/chopped|diced/.test(d)) return 1;
    if (/slice/.test(d)) return 2;
    if (/whole/.test(d)) return 3;
    return 4;
  };
  const best = [...usable].sort((a, b) => rank(a) - rank(b))[0];
  if (best) return { grams: perCup(best), from: describe(best) };

  const spoon = portions.find((p) => /^(tbsp|tablespoon|tsp|teaspoon|fl oz)\b/.test(describe(p)));
  if (spoon) {
    const d = describe(spoon);
    const per = d.startsWith("t") && /tsp|teaspoon/.test(d) ? 48 : d.startsWith("fl") ? 8 : 16;
    return { grams: perCup(spoon) * per, from: d };
  }
  return null;
}

function main() {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(path.join(dir, "food.csv"))) {
    throw new Error(
      "Usage: npx tsx scripts/build-food-nutrients.ts <unzipped SR Legacy CSV folder>",
    );
  }

  const catalog = FOOD_PRESETS.flatMap((c) => c.foods);
  const catalogNames = new Set(catalog.map((f) => f.name));
  const missing = catalog.filter((f) => !(f.name in USDA_MATCHES));
  if (missing.length) {
    throw new Error(
      `Catalog foods with no entry in food-nutrients-map.ts (map them, or set null on purpose):\n  ${missing.map((f) => f.name).join("\n  ")}`,
    );
  }
  for (const name of Object.keys(USDA_MATCHES)) {
    if (!catalogNames.has(name)) console.warn(`! mapped but not in the catalog: ${name}`);
  }

  const wanted = new Set(
    Object.values(USDA_MATCHES).flatMap((m) => (m ? [m.fdc] : [])),
  );
  const nutrientIds = new Set([ENERGY_KCAL, ...NUTRIENTS.map((n) => n.usda)]);

  const descriptions = new Map<number, string>();
  for (const r of readCsv(dir, "food.csv")) {
    const id = Number(r.fdc_id);
    if (wanted.has(id)) descriptions.set(id, r.description);
  }
  for (const id of wanted) {
    if (!descriptions.has(id)) throw new Error(`fdc_id ${id} is not in this release.`);
  }

  const amounts = new Map<number, Map<number, number>>();
  for (const r of readCsv(dir, "food_nutrient.csv")) {
    const id = Number(r.fdc_id);
    const nid = Number(r.nutrient_id);
    if (!wanted.has(id) || !nutrientIds.has(nid)) continue;
    if (!amounts.has(id)) amounts.set(id, new Map());
    amounts.get(id)!.set(nid, Number(r.amount));
  }

  const units = new Map(readCsv(dir, "measure_unit.csv").map((u) => [u.id, u.name]));
  const portions = new Map<number, Portion[]>();
  for (const p of readCsv(dir, "food_portion.csv")) {
    const id = Number(p.fdc_id);
    if (!wanted.has(id)) continue;
    if (!portions.has(id)) portions.set(id, []);
    portions.get(id)!.push({
      amount: Number(p.amount) || 1,
      unit: units.get(p.measure_unit_id) ?? "undetermined",
      modifier: p.modifier ?? "",
      grams: Number(p.gram_weight),
    });
  }

  const rows: string[] = [];
  const flags: string[] = [];
  let matched = 0;

  for (const food of catalog) {
    const match = USDA_MATCHES[food.name];
    if (!match) continue;
    matched++;
    const n = amounts.get(match.fdc) ?? new Map<number, number>();

    // Density: the catalog's own cup or spoon serving, then the map's
    // override, then USDA's household measure.
    const fromServing = gramsPerCupFromServing(food.serving);
    const fromUsda = cupFromPortions(portions.get(match.fdc) ?? []);
    const cup =
      fromServing ??
      (match.cup !== undefined ? match.cup : (fromUsda?.grams ?? null));

    const ml = parseMl(food.serving);
    const grams =
      parseGrams(food.serving) ??
      (ml != null ? (ml / ML_PER_CUP) * (cup ?? ML_PER_CUP) : null);

    const kcal100 = n.get(ENERGY_KCAL);
    if (grams != null && kcal100 != null && food.calories > 20) {
      const usdaKcal = (kcal100 * grams) / 100;
      const off = (food.calories - usdaKcal) / usdaKcal;
      if (Math.abs(off) > 0.2) {
        flags.push(
          `  ${food.name.padEnd(26)} catalog ${food.calories} kcal for ${Math.round(grams)} g, USDA ${Math.round(usdaKcal)} (${off > 0 ? "+" : ""}${Math.round(off * 100)}%) — ${descriptions.get(match.fdc)}`,
        );
      }
    }
    if (grams == null) flags.push(`  ${food.name}: no weight in serving "${food.serving}"`);

    const values = NUTRIENTS.map((def) => {
      const v = n.get(def.usda);
      return v == null ? "null" : String(sig(v));
    });
    const cupOut = cup == null ? "null" : String(sig(cup));
    rows.push(
      `  ${JSON.stringify(normalizeFoodName(food.name))}: [${match.fdc}, ${cupOut}, [${values.join(", ")}]],`,
    );
  }

  const file = `// Generated by scripts/build-food-nutrients.ts — do not edit by hand. Change
// scripts/food-nutrients-map.ts and re-run it instead.
//
// Source: USDA FoodData Central, SR Legacy (April 2018). Public domain.
//
// Per catalog food, keyed by normalizeFoodName(): the fdc_id it was matched to,
// grams per US cup (null where cups aren't offered), and nutrients per 100 g in
// USDA_NUTRIENT_ORDER — null where USDA reports no value, which is not zero.
// Tuples rather than objects because this ships to the browser with the food
// picker.

export const USDA_NUTRIENT_ORDER = ${JSON.stringify(NUTRIENTS.map((n) => n.key))} as const;

export const USDA_FOODS: Record<
  string,
  readonly [fdcId: number, gramsPerCup: number | null, per100g: readonly (number | null)[]]
> = {
${rows.join("\n")}
};
`;

  fs.writeFileSync(OUT, file);
  console.log(`Wrote ${path.relative(process.cwd(), OUT)}: ${matched} of ${catalog.length} catalog foods matched.`);
  if (flags.length) {
    console.log(`\nCheck these — catalog calories disagree with USDA by more than 20%:`);
    console.log(flags.join("\n"));
  }
}

main();
