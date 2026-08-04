// Parses the event form. Lives here rather than beside the actions because a
// "use server" module may only export async functions.

import { toEventKind, type EventKind } from "@/lib/constants";
import { minutesFromTimeInput } from "@/lib/calendar";
import { parseDateInput } from "@/lib/format";

export type ParsedEvent = {
  title: string;
  notes: string | null;
  date: Date;
  startMinute: number | null;
  endMinute: number | null;
  kind: EventKind;
  clientId: string | null;
};

export function parseEventForm(
  formData: FormData,
): { data?: ParsedEvent; error?: string } {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Give the event a title." };

  const date = parseDateInput(formData.get("date"));
  if (!date) return { error: "Pick a date for the event." };

  const startMinute = minutesFromTimeInput(formData.get("start"));
  // An end with no start is meaningless, so it's dropped rather than rejected —
  // erroring on it would be an obstacle with nothing behind it.
  const endMinute =
    startMinute == null ? null : minutesFromTimeInput(formData.get("end"));

  if (startMinute != null && endMinute != null && endMinute <= startMinute) {
    return { error: "The end time is before the start time." };
  }

  return {
    data: {
      title,
      notes: String(formData.get("notes") ?? "").trim() || null,
      date,
      startMinute,
      endMinute,
      kind: toEventKind(formData.get("kind")),
      clientId: String(formData.get("clientId") ?? "").trim() || null,
    },
  };
}
