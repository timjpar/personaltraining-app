"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbJson, prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { parseNutritionForm, type ParsedMeal } from "@/lib/nutrition-form";
import {
  assigneePhrase,
  resolveAssignees,
  revalidateAssignedPlans,
} from "@/lib/assignees";
import type { AssignState } from "@/components/AssignClients";

export type NutritionFormState = { error?: string };

// Nested create for a plan's meals + foods (used by create, update, and assign).
function mealCreateData(meals: ParsedMeal[]) {
  return meals.map((m) => ({
    name: m.name,
    order: m.order,
    foods: {
      create: m.foods.map((f) => ({
        name: f.name,
        quantity: f.quantity,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        grams: f.grams,
        gramsPerCup: f.gramsPerCup,
        nutrients: dbJson(f.nutrients),
        groupName: f.groupName,
        order: f.order,
      })),
    },
  }));
}

export async function createNutritionTemplate(
  _prev: NutritionFormState,
  formData: FormData,
): Promise<NutritionFormState> {
  const trainer = await requireTrainer();

  const { data, error } = parseNutritionForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  const plan = await prisma.nutritionPlan.create({
    data: {
      title: data.title,
      notes: data.notes,
      targetCalories: data.targetCalories,
      targetProtein: data.targetProtein,
      targetCarbs: data.targetCarbs,
      targetFat: data.targetFat,
      trainerId: trainer.id,
      clientId: null,
      meals: { create: mealCreateData(data.meals) },
    },
  });

  revalidatePath("/nutrition");
  redirect(`/nutrition/${plan.id}`);
}

export async function updateNutritionTemplate(
  planId: string,
  _prev: NutritionFormState,
  formData: FormData,
): Promise<NutritionFormState> {
  const trainer = await requireTrainer();

  // Only library templates (clientId null) are editable here.
  const plan = await prisma.nutritionPlan.findFirst({
    where: { id: planId, trainerId: trainer.id, clientId: null },
  });
  if (!plan) return { error: "Plan not found." };

  const { data, error } = parseNutritionForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  // The coach's own copies of this plan get the same save (see
  // NutritionPlan.sourceId). An athlete's copy stays the snapshot it was when
  // it was handed over.
  const ownCopies = await prisma.nutritionPlan.findMany({
    where: { sourceId: planId, trainerId: trainer.id, clientId: trainer.id },
    select: { id: true },
  });
  const planIds = [planId, ...ownCopies.map((c) => c.id)];

  // Replace the meals wholesale (foods cascade with their meal), in the plan
  // and its copies at once, so a copy can never be left half a save behind.
  await prisma.$transaction([
    prisma.meal.deleteMany({ where: { planId: { in: planIds } } }),
    ...planIds.map((id) =>
      prisma.nutritionPlan.update({
        where: { id },
        data: {
          title: data.title,
          notes: data.notes,
          targetCalories: data.targetCalories,
          targetProtein: data.targetProtein,
          targetCarbs: data.targetCarbs,
          targetFat: data.targetFat,
          meals: { create: mealCreateData(data.meals) },
        },
      }),
    ),
  ]);

  if (ownCopies.length > 0) {
    revalidateAssignedPlans(trainer.id, [{ id: trainer.id, name: trainer.name }]);
  }
  revalidatePath("/nutrition");
  revalidatePath(`/nutrition/${planId}`);
  redirect(`/nutrition/${planId}`);
}

export async function deleteNutritionTemplate(planId: string) {
  const trainer = await requireTrainer();

  const plan = await prisma.nutritionPlan.findFirst({
    where: { id: planId, trainerId: trainer.id, clientId: null },
  });
  if (!plan) redirect("/nutrition");

  await prisma.nutritionPlan.delete({ where: { id: plan.id } });

  revalidatePath("/nutrition");
  redirect("/nutrition");
}

// Deep-copy a library plan into a standing plan for each person selected — the
// coach included, see src/lib/assignees.ts. Anyone's current plan is simply
// their most recently assigned one, and that rule is what makes the coach's
// case work with no extra machinery: their own copy is a NutritionPlan whose
// clientId happens to equal its trainerId, and /me/nutrition reads it back with
// the same "newest assignedAt wins" query an athlete's day view uses. Every copy
// remembers its library plan; only the coach's own one follows it from then on.
export async function assignNutritionPlan(
  templateId: string,
  _prev: AssignState,
  formData: FormData,
): Promise<AssignState> {
  const trainer = await requireTrainer();

  const template = await prisma.nutritionPlan.findFirst({
    where: { id: templateId, trainerId: trainer.id, clientId: null },
    include: {
      meals: {
        orderBy: { order: "asc" },
        include: { foods: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!template) return { error: "Plan not found." };

  const { targets, error } = await resolveAssignees(trainer, formData);
  if (error || !targets) return { error: error ?? "Something went wrong." };

  const meals = template.meals.map((m) => ({
    name: m.name,
    notes: m.notes,
    order: m.order,
    foods: {
      create: m.foods.map((f) => ({
        name: f.name,
        quantity: f.quantity,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        grams: f.grams,
        gramsPerCup: f.gramsPerCup,
        nutrients: dbJson(f.nutrients),
        groupName: f.groupName,
        order: f.order,
      })),
    },
  }));

  const now = new Date();
  await prisma.$transaction(
    targets.map((t) =>
      prisma.nutritionPlan.create({
        data: {
          title: template.title,
          notes: template.notes,
          targetCalories: template.targetCalories,
          targetProtein: template.targetProtein,
          targetCarbs: template.targetCarbs,
          targetFat: template.targetFat,
          trainerId: trainer.id,
          clientId: t.id,
          sourceId: template.id,
          assignedAt: now,
          meals: { create: meals },
        },
      }),
    ),
  );

  revalidateAssignedPlans(trainer.id, targets);

  return {
    ok: `Assigned “${template.title}” to ${assigneePhrase(targets, trainer.id)}.`,
  };
}
