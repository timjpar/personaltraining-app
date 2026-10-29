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
// coach opens. The plan has to be the caller's own — assigned to them — so
// someone else's plan is never reached from here, and a library template only
// as the source of the coach's own copy.
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
    include: {
      meal: { select: { name: true, plan: { select: { trainerId: true, sourceId: true } } } },
    },
  });
  if (!food) return { error: "That food isn't on your plan any more." };

  const hint = typeof formGrams === "number" && Number.isFinite(formGrams) ? formGrams : null;
  const next = switchSavedForm(food, String(name), hint);
  if (!next) return { error: "That food doesn't come in that form." };

  // A coach's own copy follows its library plan, and the next save of that
  // plan rewrites the copy (see NutritionPlan.sourceId) — so the switch is made
  // on the library plan's row too, or that save would quietly undo it. The row
  // is the one the copy was written from: same meal, same place, same food.
  const { plan } = food.meal;
  const source =
    plan.trainerId === user.id && plan.sourceId
      ? await prisma.food.findFirst({
          where: {
            meal: {
              planId: plan.sourceId,
              name: food.meal.name,
              plan: { trainerId: user.id, clientId: null },
            },
            order: food.order,
            name: food.name,
            quantity: food.quantity,
          },
          select: { id: true },
        })
      : null;

  const f = next.food;
  await prisma.food.updateMany({
    where: { id: { in: source ? [food.id, source.id] : [food.id] } },
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
  if (source && plan.sourceId) {
    revalidatePath("/nutrition");
    revalidatePath(`/nutrition/${plan.sourceId}`);
  }

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
