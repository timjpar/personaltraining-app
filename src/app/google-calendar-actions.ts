"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requestOrigin } from "@/lib/request-origin";
import { accessTokenFor, revokeToken } from "@/lib/google-tokens";
import { deleteCalendar } from "@/lib/google-calendar";
import { syncGoogleCalendarSafely } from "@/lib/calendar-sync";
import { ROLES } from "@/lib/constants";

// Alongside theme-actions.ts and time-zone-actions.ts: both roles connect
// calendars, so this sits above the route groups.

function homeFor(role: string) {
  return role === ROLES.TRAINER ? "/calendar" : "/my/calendar";
}

// Both actions land back on the bare path rather than re-rendering wherever they
// were called from. The connect routes report themselves through `?google=<code>`
// in the URL, and revalidating alone leaves that query string in place — so a
// one-shot message about a connect attempt outlives the thing it described and
// sits above a state that has since changed. Pressing "Sync now" under a stale
// "Google couldn't complete that connection" is how that reads in practice.
export async function resyncGoogleCalendar() {
  const user = await requireUser();
  await syncGoogleCalendarSafely(user.id, { origin: await requestOrigin() });
  const home = homeFor(user.role);
  revalidatePath(home);
  redirect(home);
}

export async function disconnectGoogleCalendar() {
  const user = await requireUser();

  const home = homeFor(user.role);

  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId: user.id },
  });
  if (!connection) redirect(home);

  // Best effort, in this order, and the local row goes regardless of how the
  // two remote calls fare. A connection row that can't be reconnected is
  // strictly worse than an orphaned calendar sitting in someone's Google
  // account, which they can delete themselves in two clicks.
  try {
    if (connection.calendarId) {
      const token = await accessTokenFor(connection);
      // One call removes every synced event from their view — the payoff for
      // having written to a calendar of our own rather than their primary.
      if (token) await deleteCalendar(token, connection.calendarId);
    }
  } catch (err) {
    console.error("Failed to delete the Chalkline calendar", err);
  }

  try {
    await revokeToken(connection.refreshToken);
  } catch (err) {
    console.error("Failed to revoke the Google token", err);
  }

  // Cascades the mapping rows with it.
  await prisma.googleCalendarConnection.delete({ where: { id: connection.id } });

  revalidatePath(home);
  redirect(home);
}
