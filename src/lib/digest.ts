// What the coach hears about, and when.
//
// Two paths, deliberately different: buildDigest gathers a day's activity for
// the once-daily email, and the two "safely" senders fire immediately for the
// trainers who opted into that. All of them end in sendMail, which never throws.
import { prisma } from "@/lib/db";
import {
  sendMail,
  digestEmail,
  workoutCompletedEmail,
  nutritionLoggedEmail,
  type DigestLog,
  type DigestWorkout,
} from "@/lib/mail";
import { formatDate, toDateInput } from "@/lib/format";
import { sumMacros } from "@/lib/nutrition-form";
import { rosterOnly } from "@/lib/assignees";

// How far back a first digest, or one after a gap, is allowed to reach. Without
// it, a trainer who set an hour after months of use gets a wall of text as
// their introduction to the feature.
const MAX_LOOKBACK_DAYS = 7;

export type DigestData = { workouts: DigestWorkout[]; logs: DigestLog[] };

// Null when there is nothing to report — not an empty object. A daily "nothing
// happened" email is how a digest gets filtered to trash, and this one return
// is what decides whether the feature is still on in month two.
export async function buildDigest(
  trainerId: string,
  since: Date,
): Promise<DigestData | null> {
  const floor = new Date(Date.now() - MAX_LOOKBACK_DAYS * 86_400_000);
  const from = since < floor ? floor : since;

  const [workouts, logs, plans] = await Promise.all([
    prisma.workout.findMany({
      // rosterOnly keeps the coach's own training out of their own digest. A
      // session they assigned themselves carries this same trainerId, and an
      // evening email reporting back what you did this morning — under a
      // heading about your athletes — is the app talking to itself.
      //
      // The logs query below needs no such guard and never did: it reaches
      // clients through `client: { trainerId }`, and a coach's own User row has
      // a null trainerId, so their food log has always fallen outside it.
      where: {
        trainerId,
        ...rosterOnly(trainerId),
        status: "COMPLETED",
        completedAt: { gte: from },
      },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        title: true,
        rpe: true,
        clientComment: true,
        client: { select: { name: true } },
      },
    }),
    // Read by when the log was *touched*, not the day it covers — otherwise
    // backfilling yesterday at 9am this morning would never reach the coach.
    prisma.nutritionLog.findMany({
      where: { client: { trainerId }, updatedAt: { gte: from } },
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        foods: {
          select: { calories: true, protein: true, carbs: true, fat: true },
        },
      },
    }),
    // Targets for the clients who logged, so a total arrives next to the
    // number it was aiming at. One query rather than one per log.
    prisma.nutritionPlan.findMany({
      where: { trainerId, clientId: { not: null }, assignedAt: { not: null } },
      orderBy: { assignedAt: "desc" },
      select: { clientId: true, targetCalories: true },
    }),
  ]);

  if (workouts.length === 0 && logs.length === 0) return null;

  // The most recently assigned plan per client wins, which is the same rule
  // every other "current plan" read in the app uses. The query is already
  // sorted, so the first one seen for a client is the current one.
  const targetByClient = new Map<string, number | null>();
  for (const p of plans) {
    if (p.clientId && !targetByClient.has(p.clientId)) {
      targetByClient.set(p.clientId, p.targetCalories);
    }
  }

  return {
    workouts: workouts.map((w) => ({
      id: w.id,
      title: w.title,
      clientName: w.client.name,
      rpe: w.rpe,
      clientComment: w.clientComment,
    })),
    logs: logs.map((l) => {
      const totals = sumMacros([{ foods: l.foods }]);
      return {
        clientId: l.client.id,
        clientName: l.client.name,
        day: formatDate(l.date),
        date: toDateInput(l.date),
        ...totals,
        targetCalories: targetByClient.get(l.client.id) ?? null,
        notes: l.notes,
      };
    }),
  };
}

export async function sendDigest(
  origin: string,
  trainer: { name: string; email: string },
  data: DigestData,
): Promise<boolean> {
  return sendMail({
    ...digestEmail(origin, trainer.name, data),
    to: trainer.email,
  });
}

// Best effort, the same contract recordLoginSafely and syncGoogleCalendarSafely
// have: this runs inside after(), where a throw has no caller to reach and
// would only surface as an unhandled rejection in the logs.
export async function sendWorkoutEmailSafely(
  origin: string,
  trainer: { name: string; email: string },
  clientName: string,
  workout: {
    id: string;
    title: string;
    rpe: number | null;
    clientComment: string | null;
  },
): Promise<void> {
  try {
    await sendMail({
      ...workoutCompletedEmail(origin, trainer.name, clientName, workout),
      to: trainer.email,
    });
  } catch (err) {
    console.error("Workout email failed", err);
  }
}

// The food-log twin of the above, with the same best-effort contract.
//
// It takes the totals already computed by the caller rather than re-reading the
// log: saveNutritionLog has just written those rows inside a transaction, and a
// read from after() could race the commit it is meant to be reporting on. The
// one thing it does fetch is the calorie target, which the caller has no reason
// to hold — same "most recently assigned plan wins" rule buildDigest uses.
export async function sendNutritionEmailSafely(
  origin: string,
  trainer: { id: string; name: string; email: string },
  client: { id: string; name: string },
  log: {
    date: string;
    day: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    notes: string | null;
  },
): Promise<void> {
  try {
    const plan = await prisma.nutritionPlan.findFirst({
      where: {
        trainerId: trainer.id,
        clientId: client.id,
        assignedAt: { not: null },
      },
      orderBy: { assignedAt: "desc" },
      select: { targetCalories: true },
    });

    await sendMail({
      ...nutritionLoggedEmail(origin, trainer.name, client.name, {
        ...log,
        clientId: client.id,
        targetCalories: plan?.targetCalories ?? null,
      }),
      to: trainer.email,
    });
  } catch (err) {
    console.error("Nutrition email failed", err);
  }
}
