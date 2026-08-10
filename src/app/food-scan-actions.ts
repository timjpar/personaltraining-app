"use server";

import { requireUser } from "@/lib/auth";
import type { FoodPreset } from "@/lib/food-presets";
import { lookupBarcodeProduct, normalizeBarcode } from "@/lib/open-food-facts";
import { geminiConfig, identifyFoods } from "@/lib/gemini";

// Turning a barcode or a photo into foods. Up here beside saveUnits rather than
// inside (client) because both roles scan now — an athlete logging their day and
// a coach logging their own — and neither call is *about* a client. The same
// call units-actions.ts makes.
//
// Actions and not route handlers, for the reason the repo only has four of
// those, all OAuth: a handler earns its place when something outside the app
// must reach a URL. Nothing outside reaches these. requireUser() on the first
// line is also the abuse control — without it, an unauthenticated caller could
// use the endpoint as a free proxy onto someone else's rate limit. It was
// requireClient() while only athletes scanned; widening it to any signed-in
// account keeps the gate exactly as tight, because the gate was never the role.

// What a scan hands back to the form. `foods` empty with no error is a real
// answer — "we looked and that isn't food" — and reads differently from a
// failure, so the two are separate fields rather than one nullable one.
export type ScanResult = {
  foods?: FoodPreset[];
  error?: string;
  // Set when the model wasn't sure, so the form can say "check these" instead
  // of presenting an estimate as a reading.
  unsure?: boolean;
};

// Barcode → Open Food Facts. A plain-argument action rather than the
// (_prev, formData) form: this returns data into client state, not a form
// result, so it follows saveTimeZone/saveThemePrefs instead of useActionState.
export async function lookupBarcode(barcode: string): Promise<ScanResult> {
  await requireUser();

  const code = normalizeBarcode(barcode);
  if (!code) return { error: "That doesn't look like a barcode number." };

  const food = await lookupBarcodeProduct(code);
  if (!food) {
    return {
      error: "We couldn't find that barcode. Add the food by hand instead.",
    };
  }
  return { foods: [food] };
}

// Photo → Gemini. Same shape and the same reasoning as lookupBarcode.
export async function scanFoodPhoto(formData: FormData): Promise<ScanResult> {
  await requireUser();

  if (!geminiConfig()) {
    return { error: "Photo scanning isn't set up on this server." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "We didn't get a photo. Try again." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "That file isn't an image." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const found = await identifyFoods(bytes, file.type);

  if (found === null) {
    return { error: "We couldn't read that photo. Add the food by hand." };
  }
  if (found.length === 0) {
    // Not an error: the model looked and there was no food. Saying so is more
    // useful than a generic failure, and it's the answer the prompt asks for.
    return {
      error: "We couldn't spot any food in that. Add it by hand instead.",
    };
  }

  // Reshaped as presets so a scan result drops into the same slot a catalog
  // pick does — the servings box then scales it, and every downstream helper
  // (scaleMacros, servingLabel) works without knowing where it came from.
  return {
    foods: found.map((f) => ({
      name: f.name,
      serving: f.quantity ?? "1 serving",
      calories: f.calories ?? 0,
      protein: f.protein ?? 0,
      carbs: f.carbs ?? 0,
      fat: f.fat ?? 0,
    })),
    unsure: found.some((f) => f.confidence < 0.6),
  };
}
