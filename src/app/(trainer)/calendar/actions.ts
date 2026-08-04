"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { parseEventForm } from "@/lib/calendar-form";
import { toDateInput } from "@/lib/format";

export type EventFormState = { error?: string };

// The parser can't reach the database, so the "is this really my client?" check
// belongs here. A forged id gets an error rather than an event attached to
// somebody else's athlete.
async function checkClient(
  trainerId: string,
  clientId: string | null,
): Promise<boolean> {
  if (!clientId) return true;
  const client = await prisma.user.findFirst({
    where: { id: clientId, trainerId, role: "CLIENT" },
    select: { id: true },
  });
  return Boolean(client);
}

export async function createCalendarEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const trainer = await requireTrainer();

  const { data, error } = parseEventForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  if (!(await checkClient(trainer.id, data.clientId))) {
    return { error: "That client wasn't found." };
  }

  await prisma.calendarEvent.create({
    data: {
      title: data.title,
      notes: data.notes,
      date: data.date,
      startMinute: data.startMinute,
      endMinute: data.endMinute,
      kind: data.kind,
      trainerId: trainer.id,
      clientId: data.clientId,
    },
  });

  const day = toDateInput(data.date);
  revalidatePath("/calendar");
  revalidatePath(`/calendar/${day}`);
  redirect(`/calendar/${day}`);
}

export async function updateCalendarEvent(
  eventId: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const trainer = await requireTrainer();

  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId, trainerId: trainer.id },
  });
  if (!event) return { error: "Event not found." };

  const { data, error } = parseEventForm(formData);
  if (error || !data) return { error: error ?? "Something went wrong." };

  if (!(await checkClient(trainer.id, data.clientId))) {
    return { error: "That client wasn't found." };
  }

  await prisma.calendarEvent.update({
    where: { id: event.id },
    data: {
      title: data.title,
      notes: data.notes,
      date: data.date,
      startMinute: data.startMinute,
      endMinute: data.endMinute,
      kind: data.kind,
      clientId: data.clientId,
    },
  });

  const day = toDateInput(data.date);
  revalidatePath("/calendar");
  // Both days, because moving an event to a new date leaves a ghost behind on
  // the old one otherwise.
  revalidatePath(`/calendar/${toDateInput(event.date)}`);
  revalidatePath(`/calendar/${day}`);
  redirect(`/calendar/${day}`);
}

export async function deleteCalendarEvent(eventId: string) {
  const trainer = await requireTrainer();

  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId, trainerId: trainer.id },
  });
  if (!event) redirect("/calendar");

  await prisma.calendarEvent.delete({ where: { id: event.id } });

  const day = toDateInput(event.date);
  revalidatePath("/calendar");
  revalidatePath(`/calendar/${day}`);
  redirect(`/calendar/${day}`);
}
