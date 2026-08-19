// Who a coach can hand a session, a block or a meal plan to — which is their
// roster, plus themselves.
//
// A coach assigning to themselves writes exactly the rows assigning to an
// athlete writes. Workout.clientId and NutritionPlan.clientId are plain foreign
// keys to User with no role attached, so "assigned to me" is trainerId ===
// clientId and nothing else: no flag, no second table, no migration. That is the
// same observation (trainer)/me/actions.ts already makes about Measurement,
// NutritionLog and ClientProfile, and this is the point where it extends to the
// two things a coach previously could only write for somebody else.
//
// What it must not do is put the coach on their own roster. Every read that
// means "my athletes" — the dashboard's counter, the digest — has to filter
// these rows back out, which is what rosterOnly below is for. Nothing here
// touches the roster queries themselves: a coach's User row has role TRAINER and
// a null trainerId, so `where { trainerId, role: CLIENT }` already excludes them
// and always did.

// SELF_LABEL, the text on the coach's own checkbox, lives in constants.ts
// instead of here: the form that draws it is a client component, and this
// module imports Prisma.

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { CLIENT_STAGE, ROLES } from "./constants";

export type Assignee = { id: string; name: string };

// The roster half of the pick list. Its own function only because three pages
// were running this identical query inline.
export async function assignableClients(trainerId: string): Promise<Assignee[]> {
  return prisma.user.findMany({
    // Archived clients are excluded: they can't sign in, so a session or a meal
    // plan assigned to one is written to nobody.
    where: { trainerId, role: ROLES.CLIENT, stage: { not: CLIENT_STAGE.ARCHIVED } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

// Turn the posted `clientId` checkboxes into the rows to write against, keeping
// only ids the coach is actually allowed to reach.
//
// The coach's own id is allowed through without a lookup, and that is safe for
// the reason every action in (trainer)/me/actions.ts gives: the id comes from
// requireTrainer(), not from the form, so a posted id can only match it by
// already being the caller's. Everything else goes through the same ownership
// query the actions used to run inline.
export async function resolveAssignees(
  trainer: { id: string; name: string },
  formData: FormData,
): Promise<{ targets?: Assignee[]; error?: string }> {
  const ids = formData.getAll("clientId").map(String).filter(Boolean);
  if (ids.length === 0) return { error: "Pick at least one person." };

  const wantsSelf = ids.includes(trainer.id);
  const others = ids.filter((id) => id !== trainer.id);

  const clients = others.length
    ? await prisma.user.findMany({
        where: { id: { in: others }, trainerId: trainer.id, role: ROLES.CLIENT },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  // Only reachable when every id posted was a forgery, since the self case
  // can't fail. Worth keeping distinct from the "picked nobody" message above:
  // one is a form left blank and the other is a client who no longer exists.
  if (!wantsSelf && clients.length === 0) {
    return { error: "Those clients weren't found." };
  }

  // Self first, matching the order the form draws them in.
  return {
    targets: wantsSelf
      ? [{ id: trainer.id, name: trainer.name }, ...clients]
      : clients,
  };
}

// The tail of an action's success sentence: "Assigned “Upper A” to <this>."
// Names the coach rather than counting them, because "2 clients" when one of
// them is you is the kind of small lie that makes people re-check the form.
export function assigneePhrase(targets: Assignee[], selfId: string): string {
  const others = targets.filter((t) => t.id !== selfId).length;
  const plural = `${others} client${others === 1 ? "" : "s"}`;
  if (others === targets.length) return plural;
  return others === 0 ? "yourself" : `yourself and ${plural}`;
}

// The filter for a query that means "my athletes did this", applied on top of a
// trainerId scope. Without it a coach's own finished session lands in their
// activity counter and their evening digest, which is the app reporting a
// coach's training back to them as news about somebody else.
export function rosterOnly(trainerId: string) {
  return { clientId: { not: trainerId } };
}

// Where a batch of freshly written sessions has to be reflected. Split from the
// nutrition version below rather than merged, because the two land in different
// places entirely — a session reaches a calendar and a plan doesn't.
//
// The self branch is the reason these are functions at all: a coach's own copy
// lives under /me, which none of the assign actions had any reason to know
// about before.
export function revalidateAssignedWorkouts(
  trainerId: string,
  targets: Assignee[],
): void {
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  for (const t of targets) {
    if (t.id === trainerId) {
      revalidatePath("/me");
      revalidatePath("/me/workouts");
    } else {
      revalidatePath(`/clients/${t.id}`);
    }
  }
}

export function revalidateAssignedPlans(
  trainerId: string,
  targets: Assignee[],
): void {
  for (const t of targets) {
    if (t.id === trainerId) {
      revalidatePath("/me");
      revalidatePath("/me/nutrition");
      // The dynamic route needs the "page" form — a literal path wouldn't match
      // the cache entry it's stored under. Same call (trainer)/me/actions.ts
      // makes for the day view.
      revalidatePath("/me/nutrition/[date]", "page");
    } else {
      revalidatePath(`/clients/${t.id}`);
    }
  }
}
