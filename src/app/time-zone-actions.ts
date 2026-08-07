"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toTimeZone } from "@/lib/time-zone";

// Sibling of theme-actions.ts, and for the same reason: both roles need it, so
// it sits above the route groups rather than being duplicated into each.
//
// Unlike the theme this *is* tied to the user record. A time zone isn't a
// device preference — it's the answer to "when the coach writes 9am, which 9am
// is that", and it has to be readable on the server when we push to Google,
// long after whichever browser reported it has gone.
export async function saveTimeZone(zone: string) {
  const user = await getCurrentUser();
  // Called from a probe that fires on mount, so a signed-out or stale-session
  // render reaching here is ordinary, not an error.
  if (!user) return;

  const next = toTimeZone(zone);
  if (!next || next === user.timeZone) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { timeZone: next },
  });

  // Deliberately no revalidatePath. Nothing on the current page displays the
  // zone, and revalidating from something that fires on the first render of
  // every session would re-render the whole tree to change nothing visible.
}
