// Reading a photo of a meal into food rows, via Google's Gemini API. Spoken to
// over plain fetch rather than through @google/genai, for the reason mail.ts
// gives about Resend: it's a single POST with a key, and a dependency for one
// request would be the odd one out in a nine-package tree.
//
// Two things to be plain about, because they're easy to assume otherwise:
//
//   - The image exists only as a local variable for the life of one request.
//     It is never written to disk, never stored in a bucket, never reaches the
//     database. There is no upload infrastructure in this app and this feature
//     does not add any.
//   - That is a statement about *us*, not about Google. On the free tier,
//     Google may retain submitted prompts and images and use them to improve
//     their products. An athlete photographing their dinner should be told
//     that, which is why the UI says so and .env.example says so.
//
// Every failure path is a null return, never a throw — the same contract
// sendMail has, and for the same reason: a model outage must not be why a
// form 500s, and the caller's fallback (type it in by hand) is a complete
// path rather than a degraded one.

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Gemini accepts up to 20MB inline, but this is a food photo taken on a phone
// and downscaled in the browser first, so anything past a megabyte means the
// client-side resize didn't run — or someone is talking to the action directly.
// The browser resize is a courtesy; this is the control.
const MAX_INLINE_BYTES = 1_000_000;

// A cap on what the model is allowed to claim, so a hallucinated 1e9 can't
// reach an Int column or a coach's digest.
const MAX_CALORIES = 5000;
const MAX_GRAMS = 1000;

export type GeminiConfig = { apiKey: string };

// Null when the app hasn't been given a key. Every caller treats that as
// "photo scanning is switched off" rather than an error, exactly like
// mailConfig() and googleConfig() — barcode lookup and typing a food in by
// hand are unaffected, and the UI says which one is missing.
export function geminiConfig(): GeminiConfig | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return { apiKey };
}

export type ScannedFood = {
  name: string;
  quantity: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  // 0-1, the model's own estimate. Drives a "check these" note in the UI
  // rather than any hard threshold — a low-confidence row the athlete can
  // correct beats no row at all.
  confidence: number;
};

const PROMPT = [
  "You are reading a photo for a food logging app.",
  "Identify each distinct food or drink you can see and estimate its macros for the portion shown.",
  "",
  "Rules:",
  "- If the image contains no food or drink, return an empty foods array. This is a valid and expected answer — never invent an item to avoid returning nothing.",
  "- quantity is a short human portion description, e.g. '1 medium (200 g)' or '150 g'.",
  "- calories is kcal. protein, carbs and fat are grams. All whole numbers.",
  "- confidence is your own 0-1 estimate for that item. Be honest: a blurry or partly hidden item should score low.",
  "- Prefer a few confident items over many speculative ones.",
].join("\n");

// Gemini's structured output takes an OpenAPI 3.0 subset: types are uppercase
// strings, and propertyOrdering is honoured, so the fields come back in the
// order a person would read them.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    foods: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "STRING" },
          calories: { type: "NUMBER" },
          protein: { type: "NUMBER" },
          carbs: { type: "NUMBER" },
          fat: { type: "NUMBER" },
          confidence: { type: "NUMBER" },
        },
        // Only the two that make a row worth having. The rest stay optional so
        // the model can decline a value instead of inventing one.
        required: ["name", "calories"],
        propertyOrdering: [
          "name",
          "quantity",
          "calories",
          "protein",
          "carbs",
          "fat",
          "confidence",
        ],
      },
    },
  },
  required: ["foods"],
} as const;

// Returns null when the call itself failed, and an empty array when the model
// looked and found no food. The caller must distinguish them: one is "try
// again or type it in", the other is "that isn't food".
export async function identifyFoods(
  image: Uint8Array,
  mimeType: string,
): Promise<ScannedFood[] | null> {
  const config = geminiConfig();
  if (!config) return null;

  if (image.byteLength > MAX_INLINE_BYTES) {
    console.error("Gemini scan rejected: image too large", image.byteLength);
    return null;
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        // In the header, never the query string: a key in a URL ends up in
        // access logs, proxy logs and referrers.
        "x-goog-api-key": config.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inlineData: { mimeType, data: toBase64(image) } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          // 2.5 Flash thinks by default. For a fixed-schema extraction it buys
          // nothing, and it costs free-tier quota plus seconds of latency while
          // an athlete watches a spinner mid-meal.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      // The body carries Google's reason — an unenabled API or an exhausted
      // free-tier quota are the common ones, and both are invisible without it.
      console.error("Gemini scan failed", res.status, await res.text());
      return null;
    }

    const body = (await res.json()) as {
      candidates?: {
        finishReason?: string;
        content?: { parts?: { text?: string }[] };
      }[];
    };

    const candidate = body?.candidates?.[0];
    // Checked before parsing: MAX_TOKENS means the JSON is truncated and SAFETY
    // means there isn't any. Naming which one turns a puzzling parse error into
    // a one-line diagnosis.
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      console.error("Gemini scan stopped early", candidate.finishReason);
      return null;
    }

    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) return null;

    // Structured output still arrives as a JSON string, so it still needs a
    // parse in a try/catch and a hand-rolled shape walk — the same discipline
    // parseNutritionForm applies to a form field, and for the same reason:
    // this is untrusted input that happens to be well-intentioned.
    const parsed = JSON.parse(text) as unknown;
    const raw = (parsed as { foods?: unknown })?.foods;
    if (!Array.isArray(raw)) return null;

    const foods: ScannedFood[] = [];
    for (const f of raw) {
      const item = f as Record<string, unknown>;
      const name = String(item?.name ?? "").trim();
      if (!name) continue;
      foods.push({
        name: name.slice(0, 80),
        quantity: String(item?.quantity ?? "").trim() || null,
        calories: intInRange(item?.calories, MAX_CALORIES),
        protein: intInRange(item?.protein, MAX_GRAMS),
        carbs: intInRange(item?.carbs, MAX_GRAMS),
        fat: intInRange(item?.fat, MAX_GRAMS),
        confidence: clamp01(item?.confidence),
      });
    }
    return foods;
  } catch (err) {
    console.error("Gemini scan failed", err);
    return null;
  }
}

// The same gate intOrNull applies to a form field, plus a ceiling. The model
// can return a float, a negative, or a number with more digits than a day has
// calories, and all three have to land as null rather than in the database.
function intInRange(value: unknown, max: number): number | null {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return n;
}

function clamp01(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// Standard base64, which is what inlineData wants. Deliberately not
// base64url() from random.ts: that one swaps +/ for -_ and strips the padding,
// which is right for a URL-safe token and wrong here.
function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}
