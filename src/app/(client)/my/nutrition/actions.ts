"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { parseNutritionLogForm, sumMacros } from "@/lib/nutrition-form";
import { parseDayParam } from "@/lib/calendar";
import { formatDate, toDateInput } from "@/lib/format";
import { FEED_TYPE } from "@/lib/constants";
import { sendNutritionEmailSafely } from "@/lib/digest";
import { requestOrigin } from "@/lib/request-origin";
import type { FoodPreset } from "@/lib/food-presets";
import { lookupBarcodeProduct, normalizeBarcode } from "@/lib/open-food-facts";
import { geminiConfig, identifyFoods } from "@/lib/gemini";

export type LogState = { error?: string; ok?: string };

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
//
// An action and not a route handler for the reason the repo only has four of
// those, all OAuth: a handler earns its place when something *outside* the app
// must reach a URL. Nothing outside reaches this. requireClient() on the first
// line is also the abuse control — without it, an unauthenticated caller could
// use the endpoint as a free proxy onto someone else's rate limit.
export async function lookupBarcode(barcode: string): Promise<ScanResult> {
  await requireClient();

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
  await requireClient();

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

// Saving a day's food log. The day is curried and bound at the call site, the
// same shape completeWorkout uses for its workout id.
export async function saveNutritionLog(
  day: string,
  _prev: LogState,
  formData: FormData,
): Promise<LogState> {
  const client = await requireClient();

  const date = parseDayParam(day);
  if (!date) return { error: "That's not a day we can log against." };

  // Tomorrow's dinner is a typo, not a feature. Compared against the end of
  // today so the athlete's own "today" always passes, whatever the hour.
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (date > endOfToday) {
    return { error: "You can't log a day that hasn't happened yet." };
  }

  const { data, error } = parseNutritionLogForm(formData);
  if (error || !data) return { error: error ?? "We couldn't read that log." };

  // Clearing the last food off a day removes the day, rather than leaving an
  // empty row that would keep showing in the coach's feed and history as if
  // something had been logged. The feed item goes with it via the cascade.
  if (data.entries.length === 0 && !data.notes) {
    await prisma.nutritionLog.deleteMany({
      where: { clientId: client.id, date },
    });
    revalidateAfterLog(client.id, client.trainerId);
    return { ok: "Log cleared." };
  }

  // An interactive transaction, and the only one in the app — everything else
  // uses the array form. It has to be: the feed item is keyed on the log's id,
  // and that id doesn't exist until the upsert above it has run.
  //
  // Ownership needs no separate check. clientId comes from requireClient(), so
  // the unique key below *is* the check — a forged day param can only ever
  // address this athlete's own row.
  await prisma.$transaction(async (tx) => {
    const log = await tx.nutritionLog.upsert({
      where: { clientId_date: { clientId: client.id, date } },
      create: { clientId: client.id, date, notes: data.notes },
      update: { notes: data.notes },
    });

    // Wholesale replace, the same pattern updateNutritionTemplate uses: the
    // rows carry no identity worth preserving across an edit.
    await tx.loggedFood.deleteMany({ where: { logId: log.id } });
    await tx.loggedFood.createMany({
      data: data.entries.map((e) => ({ ...e, logId: log.id })),
    });

    // An unattached client has nobody to tell. FeedItem.trainerId is NOT NULL,
    // so this is a real state to handle rather than a defensive check.
    if (client.trainerId) {
      // Upsert, not create: an athlete saves their day four or five times, and
      // each save has to find the same row. Keyed on the unique nutritionLogId
      // so two saves racing can't both insert. Re-marking it unread is
      // deliberate — a coach who already read the log should see that it moved.
      await tx.feedItem.upsert({
        where: { nutritionLogId: log.id },
        create: {
          type: FEED_TYPE.NUTRITION_LOGGED,
          trainerId: client.trainerId,
          clientId: client.id,
          nutritionLogId: log.id,
        },
        update: { read: false, createdAt: new Date() },
      });
    }
  });

  // Coaches who opted out of this still get the day in that evening's digest,
  // exactly as completeWorkout puts it: latency, not whether they hear at all.
  //
  // A primary-key lookup for one boolean, rather than loading the trainer up
  // front with the client: requireClient() returns the athlete's own row and
  // nothing hangs off it, and this way the query only happens on a save that
  // could actually send. The clear-the-day path above deliberately doesn't
  // reach here — there is no log left to report.
  if (client.trainerId) {
    const trainer = await prisma.user.findUnique({
      where: { id: client.trainerId },
      select: {
        id: true,
        name: true,
        email: true,
        instantNutritionEmail: true,
      },
    });
    if (trainer?.instantNutritionEmail) {
      // Awaited out here, not inside the callback, for the reason
      // completeWorkout gives: headers() belongs to the request, and after()
      // runs once the response is on its way.
      const origin = await requestOrigin();
      const totals = sumMacros([{ foods: data.entries }]);
      after(() =>
        sendNutritionEmailSafely(
          origin,
          trainer,
          { id: client.id, name: client.name },
          {
            date: toDateInput(date),
            day: formatDate(date),
            ...totals,
            notes: data.notes,
          },
        ),
      );
    }
  }

  revalidateAfterLog(client.id, client.trainerId);
  return { ok: "Saved." };
}

// Both exits revalidate the same set, so it lives in one place. The dynamic
// routes use the "page" form: a literal path wouldn't match the cache entry
// those pages are stored under.
function revalidateAfterLog(clientId: string, trainerId: string | null) {
  revalidatePath("/my/nutrition");
  revalidatePath("/my/nutrition/[date]", "page");
  if (trainerId) {
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients/[id]/nutrition/[date]", "page");
  }
}
