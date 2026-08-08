// Barcode lookup against Open Food Facts — a free, community-maintained
// database of packaged food. Spoken to over plain fetch, the same position
// mail.ts takes with Resend and google.ts takes with OAuth.
//
// Unlike those two there is no config gate: OFF needs no key, so there is no
// "switched off" state to represent. The module is always available and every
// failure is a null, which the caller reads as "we couldn't find that barcode,
// add it by hand" — a complete path, not an error state.
//
// The data is community-entered and is wrong or missing often enough that no
// result may ever be written straight to the database. Everything here lands in
// an editable field the athlete can see, which is what the log form does with
// any preset.
import type { FoodPreset } from "@/lib/food-presets";

const ENDPOINT = "https://world.openfoodfacts.org/api/v2/product";

// OFF asks every client to identify itself, and rate-limits or blocks the ones
// that don't. A fork should change this rather than inherit ours.
const USER_AGENT = "Chalkline/1.0 (https://chalkline.click)";

const FIELDS = "product_name,brands,quantity,serving_size,nutriments";

// kcal per kJ. Some products carry only the kJ figure.
const KJ_PER_KCAL = 4.184;

// Barcodes are 8 (EAN-8), 12 (UPC-A), 13 (EAN-13) or 14 (ITF-14) digits. OFF
// stores UPC-A left-padded to 13, so a US barcode scanned as 12 has to be
// padded here or it simply won't be found.
export function normalizeBarcode(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12) return `0${digits}`;
  if ([8, 13, 14].includes(digits.length)) return digits;
  return null;
}

type Nutriments = Record<string, unknown>;

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Energy is the one macro with two possible units and three possible keys.
function kcal(n: Nutriments, suffix: string): number | null {
  const direct = numberOrNull(n[`energy-kcal${suffix}`]);
  if (direct != null) return direct;
  const kj =
    numberOrNull(n[`energy-kj${suffix}`]) ?? numberOrNull(n[`energy${suffix}`]);
  return kj == null ? null : kj / KJ_PER_KCAL;
}

export async function lookupBarcodeProduct(
  rawCode: string,
): Promise<FoodPreset | null> {
  const code = normalizeBarcode(rawCode);
  if (!code) return null;

  try {
    const res = await fetch(`${ENDPOINT}/${code}.json?fields=${FIELDS}`, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      // A barcode's macros don't change, and this is a free service run on
      // donations — re-asking on every keystroke would be rude as well as slow.
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      // 404 is the ordinary "no such product" and not worth logging; anything
      // else means the API is unhappy with us, which is.
      if (res.status !== 404) {
        console.error("Open Food Facts lookup failed", res.status);
      }
      return null;
    }

    const body = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
        quantity?: string;
        serving_size?: string;
        nutriments?: Nutriments;
      };
    };

    const product = body?.product;
    if (body?.status !== 1 || !product) return null;

    const name = String(product.product_name ?? "").trim();
    if (!name) return null;

    const nutriments = product.nutriments ?? {};

    // Per-serving when the product declares a serving size, per-100g
    // otherwise. A "1 serving" figure with no idea what a serving is would be
    // worse than the honest 100 g baseline.
    const servingSize = String(product.serving_size ?? "").trim();
    const useServing = servingSize !== "" && kcal(nutriments, "_serving") != null;
    const suffix = useServing ? "_serving" : "_100g";

    const calories = kcal(nutriments, suffix);
    // Without energy there is nothing to fill in, and a row of blanks is not a
    // scan result — it's the manual path with extra steps.
    if (calories == null) return null;

    // Rounded independently, the same rule scaleMacros follows: the columns are
    // Int, and scaling an already-rounded total compounds the error.
    return {
      name: withBrand(name, product.brands),
      serving: useServing ? servingSize : "100 g",
      calories: Math.round(calories),
      protein: Math.round(numberOrNull(nutriments[`proteins${suffix}`]) ?? 0),
      carbs: Math.round(
        numberOrNull(nutriments[`carbohydrates${suffix}`]) ?? 0,
      ),
      fat: Math.round(numberOrNull(nutriments[`fat${suffix}`]) ?? 0),
    };
  } catch (err) {
    console.error("Open Food Facts lookup failed", err);
    return null;
  }
}

// "Ben & Jerry's Cookie Dough" rather than "Cookie Dough", which is the
// difference between a useful row in a log and an ambiguous one. Skipped when
// the product name already carries the brand, which OFF entries often do.
function withBrand(name: string, brands: string | undefined): string {
  const brand = String(brands ?? "").split(",")[0]?.trim();
  if (!brand) return name;
  if (name.toLowerCase().includes(brand.toLowerCase())) return name;
  return `${brand} ${name}`;
}
