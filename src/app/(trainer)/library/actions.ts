"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { parsePrescription } from "@/lib/workout-form";
import { parseDateInput } from "@/lib/format";
import type { AssignState } from "@/components/AssignClients";

export type TemplateFormState = { error?: string };

// Copy a template's prescription rows into the shape Workout.exercises wants.
function exerciseRowsFrom(
  exercises: {
    name: string;
    sets: string | null;
    reps: string | null;
    load: string | null;
    tempo: string | null;
    rest: string | null;
    notes: string | null;
    order: number;
  }[],
) {
  return exercises.map((e) => ({
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    load: e.load,
    tempo: e.tempo,
    rest: e.rest,
    notes: e.notes,
    order: e.order,
  }));
}

export async function createTemplate(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const trainer = await requireTrainer();

  const { data, error } = parsePrescription(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  const template = await prisma.workoutTemplate.create({
    data: {
      title: data.title,
      notes: data.notes,
      trainerId: trainer.id,
      exercises: { create: data.exercises },
    },
  });

  revalidatePath("/library");
  redirect(`/library/${template.id}`);
}

export async function updateTemplate(
  templateId: string,
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const trainer = await requireTrainer();

  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, trainerId: trainer.id },
  });
  if (!template) return { error: "Workout not found." };

  const { data, error } = parsePrescription(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  // Editing replaces the prescription, mirroring updateWorkout.
  await prisma.$transaction([
    prisma.templateExercise.deleteMany({ where: { templateId } }),
    prisma.workoutTemplate.update({
      where: { id: templateId },
      data: {
        title: data.title,
        notes: data.notes,
        exercises: { create: data.exercises },
      },
    }),
  ]);

  revalidatePath("/library");
  revalidatePath(`/library/${templateId}`);
  redirect(`/library/${templateId}`);
}

export async function deleteTemplate(templateId: string) {
  const trainer = await requireTrainer();

  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, trainerId: trainer.id },
  });
  if (!template) redirect("/library");

  // Program slots referencing this template cascade away with it.
  await prisma.workoutTemplate.delete({ where: { id: template.id } });

  revalidatePath("/library");
  revalidatePath("/programs");
  redirect("/library");
}

// Bulk: assign one saved workout to several clients on a date. Each becomes an
// independent, editable Workout (a snapshot) — later template edits don't touch
// already-assigned sessions.
export async function assignTemplate(
  templateId: string,
  _prev: AssignState,
  formData: FormData,
): Promise<AssignState> {
  const trainer = await requireTrainer();

  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, trainerId: trainer.id },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!template) return { error: "Workout not found." };

  const clientIds = formData.getAll("clientId").map(String).filter(Boolean);
  if (clientIds.length === 0) return { error: "Pick at least one client." };

  const scheduledDate = parseDateInput(formData.get("date"));
  if (!scheduledDate) return { error: "Pick a valid date." };

  // Trust only clients that actually belong to this trainer.
  const clients = await prisma.user.findMany({
    where: { id: { in: clientIds }, trainerId: trainer.id, role: "CLIENT" },
    select: { id: true },
  });
  if (clients.length === 0) return { error: "Those clients weren't found." };

  const rows = exerciseRowsFrom(template.exercises);

  await prisma.$transaction(
    clients.map((c) =>
      prisma.workout.create({
        data: {
          title: template.title,
          notes: template.notes,
          scheduledDate,
          status: "ASSIGNED",
          clientId: c.id,
          trainerId: trainer.id,
          exercises: { create: rows },
        },
      }),
    ),
  );

  revalidatePath("/dashboard");
  for (const c of clients) revalidatePath(`/clients/${c.id}`);

  const n = clients.length;
  return { ok: `Assigned “${template.title}” to ${n} client${n === 1 ? "" : "s"}.` };
}

// The client-detail direction: client is fixed, trainer picks a saved workout.
export async function assignTemplateToClient(
  clientId: string,
  _prev: AssignState,
  formData: FormData,
): Promise<AssignState> {
  const trainer = await requireTrainer();

  const client = await prisma.user.findFirst({
    where: { id: clientId, trainerId: trainer.id, role: "CLIENT" },
    select: { id: true, name: true },
  });
  if (!client) return { error: "Client not found." };

  const templateId = String(formData.get("templateId") ?? "");
  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, trainerId: trainer.id },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!template) return { error: "Pick a saved workout." };

  const scheduledDate = parseDateInput(formData.get("date"));
  if (!scheduledDate) return { error: "Pick a valid date." };

  await prisma.workout.create({
    data: {
      title: template.title,
      notes: template.notes,
      scheduledDate,
      status: "ASSIGNED",
      clientId: client.id,
      trainerId: trainer.id,
      exercises: { create: exerciseRowsFrom(template.exercises) },
    },
  });

  revalidatePath(`/clients/${client.id}`);
  revalidatePath("/dashboard");

  return { ok: `Assigned “${template.title}” to ${client.name}.` };
}
