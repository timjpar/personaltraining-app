"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { parseWorkoutForm } from "@/lib/workout-form";

export type WorkoutFormState = { error?: string };

export async function createWorkout(
  clientId: string,
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const trainer = await requireTrainer();

  const client = await prisma.user.findFirst({
    where: { id: clientId, trainerId: trainer.id, role: "CLIENT" },
  });
  if (!client) return { error: "That client wasn't found." };

  const { data, error } = parseWorkoutForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  await prisma.workout.create({
    data: {
      title: data.title,
      notes: data.notes,
      scheduledDate: data.scheduledDate,
      status: "ASSIGNED",
      clientId,
      trainerId: trainer.id,
      exercises: { create: data.exercises },
    },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  redirect(`/clients/${clientId}`);
}

export async function updateWorkout(
  workoutId: string,
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const trainer = await requireTrainer();

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, trainerId: trainer.id },
  });
  if (!workout) return { error: "Workout not found." };

  const { data, error } = parseWorkoutForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  // Editing replaces the prescription. (Meant for not-yet-completed sessions.)
  await prisma.$transaction([
    prisma.exercise.deleteMany({ where: { workoutId } }),
    prisma.workout.update({
      where: { id: workoutId },
      data: {
        title: data.title,
        notes: data.notes,
        scheduledDate: data.scheduledDate,
        exercises: { create: data.exercises },
      },
    }),
  ]);

  revalidatePath(`/workouts/${workoutId}`);
  revalidatePath(`/clients/${workout.clientId}`);
  redirect(`/workouts/${workoutId}`);
}

export async function deleteWorkout(workoutId: string) {
  const trainer = await requireTrainer();

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, trainerId: trainer.id },
  });
  if (!workout) redirect("/dashboard");

  await prisma.workout.delete({ where: { id: workout.id } });

  revalidatePath(`/clients/${workout.clientId}`);
  revalidatePath("/dashboard");
  redirect(`/clients/${workout.clientId}`);
}
