"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { DAYS_PER_WEEK } from "@/lib/constants";
import { parseDateInput, addDays } from "@/lib/format";
import { exerciseRowsFrom, parseAssignedSlot } from "@/lib/workout-form";
import {
  assigneePhrase,
  resolveAssignees,
  revalidateAssignedWorkouts,
} from "@/lib/assignees";
import type { AssignState } from "@/components/AssignClients";

export type ProgramFormState = { error?: string };

type ParsedSlot = { week: number; day: number; templateId: string };
type ParsedProgram = {
  title: string;
  notes: string | null;
  weeks: number;
  slots: ParsedSlot[];
};

function parseProgramForm(formData: FormData): {
  data?: ParsedProgram;
  error?: string;
} {
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  let weeks = Math.trunc(Number(formData.get("weeks")));
  if (!Number.isFinite(weeks) || weeks < 1) weeks = 1;
  weeks = Math.min(weeks, 16);

  if (!title) return { error: "Give the program a title." };

  const slots: ParsedSlot[] = [];
  for (let w = 1; w <= weeks; w++) {
    for (let d = 1; d <= DAYS_PER_WEEK; d++) {
      const templateId = String(formData.get(`slot_w${w}_d${d}`) ?? "").trim();
      if (templateId) slots.push({ week: w, day: d, templateId });
    }
  }
  if (slots.length === 0) {
    return { error: "Add at least one workout to a day." };
  }

  return { data: { title, notes, weeks, slots } };
}

// Keep only slots whose template actually belongs to this trainer.
async function keepOwnedSlots(trainerId: string, slots: ParsedSlot[]) {
  const ids = [...new Set(slots.map((s) => s.templateId))];
  const rows = await prisma.workoutTemplate.findMany({
    where: { id: { in: ids }, trainerId },
    select: { id: true },
  });
  const owned = new Set(rows.map((r) => r.id));
  return slots.filter((s) => owned.has(s.templateId));
}

export async function createProgram(
  _prev: ProgramFormState,
  formData: FormData,
): Promise<ProgramFormState> {
  const trainer = await requireTrainer();

  const { data, error } = parseProgramForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  const slots = await keepOwnedSlots(trainer.id, data.slots);
  if (slots.length === 0) return { error: "Those workouts weren't found." };

  const program = await prisma.program.create({
    data: {
      title: data.title,
      notes: data.notes,
      weeks: data.weeks,
      trainerId: trainer.id,
      slots: { create: slots },
    },
  });

  revalidatePath("/programs");
  redirect(`/programs/${program.id}`);
}

export async function updateProgram(
  programId: string,
  _prev: ProgramFormState,
  formData: FormData,
): Promise<ProgramFormState> {
  const trainer = await requireTrainer();

  const program = await prisma.program.findFirst({
    where: { id: programId, trainerId: trainer.id },
  });
  if (!program) return { error: "Program not found." };

  const { data, error } = parseProgramForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  const slots = await keepOwnedSlots(trainer.id, data.slots);
  if (slots.length === 0) return { error: "Those workouts weren't found." };

  await prisma.$transaction([
    prisma.programSlot.deleteMany({ where: { programId } }),
    prisma.program.update({
      where: { id: programId },
      data: {
        title: data.title,
        notes: data.notes,
        weeks: data.weeks,
        slots: { create: slots },
      },
    }),
  ]);

  revalidatePath("/programs");
  revalidatePath(`/programs/${programId}`);
  redirect(`/programs/${programId}`);
}

export async function deleteProgram(programId: string) {
  const trainer = await requireTrainer();

  const program = await prisma.program.findFirst({
    where: { id: programId, trainerId: trainer.id },
  });
  if (!program) redirect("/programs");

  await prisma.program.delete({ where: { id: program.id } });

  revalidatePath("/programs");
  redirect("/programs");
}

// Roll the whole block out: for each person selected — the coach included, see
// src/lib/assignees.ts — materialize every slot into a dated Workout
// (date = start date + (week-1)*7 + (day-1)).
export async function assignProgram(
  programId: string,
  _prev: AssignState,
  formData: FormData,
): Promise<AssignState> {
  const trainer = await requireTrainer();

  const program = await prisma.program.findFirst({
    where: { id: programId, trainerId: trainer.id },
    include: {
      slots: {
        include: {
          template: { include: { exercises: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  if (!program) return { error: "Program not found." };
  if (program.slots.length === 0) {
    return { error: "This program has no workouts yet." };
  }

  const { targets, error } = await resolveAssignees(trainer, formData);
  if (error || !targets) return { error: error ?? "Something went wrong." };

  const startDate = parseDateInput(formData.get("date"));
  if (!startDate) return { error: "Pick a valid start date." };

  // One time of day, one length and one answer to "am I there" across the whole
  // block. A program is a training week repeated, so the session that lands on
  // week 1 Tuesday and the one on week 4 Tuesday are the same appointment a
  // month apart — and a coach who trains someone at 6am trains them at 6am.
  // Per-slot times would be a scheduling grid, which is a different feature and
  // belongs on the program builder rather than on the assign form.
  const slotDefaults = parseAssignedSlot(formData);

  const creates = [];
  for (const t of targets) {
    for (const slot of program.slots) {
      const offset = (slot.week - 1) * DAYS_PER_WEEK + (slot.day - 1);
      creates.push(
        prisma.workout.create({
          data: {
            title: slot.template.title,
            notes: slot.template.notes,
            // Per slot, not per program: a block can mix a climbing day with
            // a strength day, and each session should say which it is.
            discipline: slot.template.discipline,
            scheduledDate: addDays(startDate, offset),
            ...slotDefaults,
            status: "ASSIGNED",
            clientId: t.id,
            trainerId: trainer.id,
            exercises: { create: exerciseRowsFrom(slot.template.exercises) },
          },
        }),
      );
    }
  }

  await prisma.$transaction(creates);

  revalidateAssignedWorkouts(trainer.id, targets);

  const sessions = program.slots.length;
  return {
    ok: `Assigned “${program.title}” — ${sessions} session${
      sessions === 1 ? "" : "s"
    } to ${assigneePhrase(targets, trainer.id)}.`,
  };
}
