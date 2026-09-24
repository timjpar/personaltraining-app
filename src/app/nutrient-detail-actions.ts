"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toNutrientDetail } from "@/lib/constants";

// How much micronutrient detail this person reads. On the user record for the
// reasons saveUnits gives beside it: it follows the person across devices, and
// every page that draws a food row already has the user in hand.
//
// Both roles call it — a coach reading plans and athletes' days, an athlete
// reading their own.
export async function saveNutrientDetail(value: string) {
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: { nutrientDetail: toNutrientDetail(value) },
  });

  // Nutrition renders on the plan pages, both day logs, the builder and the
  // coach's view of an athlete's day, and the toggle sits on all of them — so
  // the whole tree, as saveUnits does.
  revalidatePath("/", "layout");
}
