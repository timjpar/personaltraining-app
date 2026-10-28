"use server";

import { revalidatePath } from "next/cache";
import { dbJson, prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { switchSavedForm } from "@/lib/food-rows";

// Fresh blueberries to frozen, from the plan beside the day log: the plan's own
// row changes, so tomorrow's plan says frozen too, and the totals follow. Up
// here beside saveUnits because both roles call it — an athlete on the plan
// their coach assigned, and a coach on the one they assigned themselves.
//
// The only edit either can make to a plan from there, and a narrow one: the
// same food in another form, at the same amount of food (see FoodForm.per100),
// with the catalog's numbers. Anything wider is the builder's job, which only a
// coach opens. The plan has to be the caller's own — assigned to them — so a
// library template or someone else's plan is never reached from here.
//
// `formGrams` is what the last switch of this row returned, so switching back
// and forth lands where it started. switchSavedForm ignores one that no longer
// fits the row.
export async function switchPlanFoodForm(
  foodId: string,
  name: string,
  formGrams: number | null,
): Promise<{ error?: string }> {
  const user = await requireUser();

  const food = await prisma.food.findFirst({
    where: { id: String(foodId), meal: { plan: { clientId: user.id } } },
  });
  if (!food) return { error: "That food isn't on your plan any more." };

  const hint = typeof formGrams === "number" && Number.isFinite(formGrams) ? formGrams : null;
  const next = switchSavedForm(food, String(name), hint);
  if (!next) return { error: "That food doesn't come in that form." };

  const f = next.food;
  await prisma.food.update({
    where: { id: food.id },
    data: {
      name: f.name,
      quantity: f.quantity,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      grams: f.grams ?? null,
      gramsPerCup: f.gramsPerCup ?? null,
      nutrients: dbJson(f.nutrients),
    },
  });

  // The plan shows on the day log and the home page, and an athlete's on their
  // coach's view of them. Dynamic routes in the "page" form, as everywhere.
  if (user.role === ROLES.TRAINER) {
    revalidatePath("/me");
    revalidatePath("/me/nutrition");
    revalidatePath("/me/nutrition/[date]", "page");
  } else {
    revalidatePath("/my");
    revalidatePath("/my/nutrition");
    revalidatePath("/my/nutrition/[date]", "page");
    revalidatePath(`/clients/${user.id}`);
    revalidatePath("/clients/[id]/nutrition/[date]", "page");
  }
  return {};
}
