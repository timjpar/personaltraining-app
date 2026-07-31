"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { parseNutritionForm, type ParsedMeal } from "@/lib/nutrition-form";
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

  // Replace the meals wholesale (foods cascade with their meal).
  await prisma.$transaction([
    prisma.meal.deleteMany({ where: { planId } }),
    prisma.nutritionPlan.update({
      where: { id: planId },
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
  ]);

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

// Deep-copy a library plan into a standing plan for each selected client. The
// client's current plan is simply their most recently assigned one.
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

  const clientIds = formData.getAll("clientId").map(String).filter(Boolean);
  if (clientIds.length === 0) return { error: "Pick at least one client." };

  const clients = await prisma.user.findMany({
    where: { id: { in: clientIds }, trainerId: trainer.id, role: "CLIENT" },
    select: { id: true },
  });
  if (clients.length === 0) return { error: "Those clients weren't found." };

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
        order: f.order,
      })),
    },
  }));

  const now = new Date();
  await prisma.$transaction(
    clients.map((c) =>
      prisma.nutritionPlan.create({
        data: {
          title: template.title,
          notes: template.notes,
          targetCalories: template.targetCalories,
          targetProtein: template.targetProtein,
          targetCarbs: template.targetCarbs,
          targetFat: template.targetFat,
          trainerId: trainer.id,
          clientId: c.id,
          assignedAt: now,
          meals: { create: meals },
        },
      }),
    ),
  );

  for (const c of clients) revalidatePath(`/clients/${c.id}`);

  const n = clients.length;
  return { ok: `Assigned “${template.title}” to ${n} client${n === 1 ? "" : "s"}.` };
}
