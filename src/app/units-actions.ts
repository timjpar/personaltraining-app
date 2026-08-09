"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toUnits } from "@/lib/constants";

// Which units this person reads. On the user record rather than in a cookie
// like saveThemePrefs above it — see the comment on User.units for why all
// three of that one's reasons fail here.
//
// Both roles call this: a coach setting the unit they read their whole roster
// in, and an athlete setting the one their scale shows. Nothing here is
// scoped to a client, because nothing here is *about* a client.
export async function saveUnits(value: string) {
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: { units: toUnits(value) },
  });

  // Weights render across the trainer's client pages and the athlete's own,
  // and a unit is exactly the kind of change you expect to see everywhere at
  // once, so this revalidates the tree rather than naming routes.
  revalidatePath("/", "layout");
}
