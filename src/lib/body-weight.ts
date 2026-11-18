// The body weight a nutrition page reads per-kilo figures against. Server
// only: it reads the database.
import { prisma } from "@/lib/db";
import { toUnits } from "@/lib/constants";
import type { BodyBasis } from "@/lib/nutrient-guidance";

// The newest weigh-in, the same rule the body pages use for current weight.
export async function latestWeightKg(userId: string): Promise<number | null> {
  const m = await prisma.measurement.findFirst({
    where: { clientId: userId, weightKg: { not: null } },
    orderBy: { date: "desc" },
    select: { weightKg: true },
  });
  return m?.weightKg ?? null;
}

// `personId` is whoever eats the plan or the log: an athlete, or the coach on
// their own library plan. The units are always the viewer's (User.units).
export async function bodyBasis(
  personId: string | null,
  viewer: { units: string },
): Promise<BodyBasis> {
  return {
    weightKg: personId ? await latestWeightKg(personId) : null,
    units: toUnits(viewer.units),
  };
}
