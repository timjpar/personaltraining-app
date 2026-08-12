// Paid sessions: the block a client bought, and what's left of it.
//
// The store is the SessionCredit ledger (see schema.prisma) and a balance is
// the sum of its entries. Every read and every write of that table goes through
// this file, so "what's the balance" has exactly one implementation and the
// warning thresholds can't drift between the roster, the client's file and the
// coach's dashboard.
//
// The distinction this module exists to protect is tracked vs untracked. A
// client with no entries at all is not on a package: the app must say nothing
// about their sessions rather than warn that a number nobody ever set has run
// out. Only a balance that someone deliberately put there is worth counting
// down, which is why every function here reports the two states separately
// instead of returning a bare 0.
// The shape of a balance, and the two functions that turn one into words, live
// in constants.ts instead of here — this module imports Prisma and the cards
// that render a balance are client components. Re-exported so a server file
// reading balances has one import rather than two.
import { prisma, isUniqueViolation } from "./db";
import {
  SESSION_CREDIT_KIND,
  UNTRACKED,
  type SessionBalance,
  type SessionCreditKind,
} from "./constants";

export { UNTRACKED, type SessionBalance };

// Balances for a whole roster in one grouped query rather than one per client.
// Clients with no entries are absent from the result, which is exactly the
// tracked/untracked split — callers read a miss as UNTRACKED rather than zero.
export async function balancesFor(
  clientIds: string[],
): Promise<Map<string, number>> {
  if (clientIds.length === 0) return new Map();

  const rows = await prisma.sessionCredit.groupBy({
    by: ["clientId"],
    where: { clientId: { in: clientIds } },
    _sum: { delta: true },
  });

  // _sum is typed nullable because Prisma allows summing a column with no rows;
  // a group that came back has at least one, so the ?? 0 is for the type rather
  // than for a case that can happen.
  return new Map(rows.map((r) => [r.clientId, r._sum.delta ?? 0]));
}

// The same question for one client. Two aggregates in one call — the sum, and
// the count that tells tracked from untracked, which a sum of zero can't.
//
// `trainerId` scopes the read to one coach's roster, and it's optional for the
// same reason the client detail page gives about its own queries: a caller that
// has already proved ownership doesn't need it, and one that runs before the
// ownership check does. Pass it whenever this runs in parallel with the lookup
// that would have caught a foreign id.
export async function balanceFor(
  clientId: string,
  trainerId?: string,
): Promise<SessionBalance> {
  const result = await prisma.sessionCredit.aggregate({
    where: { clientId, ...(trainerId ? { client: { trainerId } } : {}) },
    _sum: { delta: true },
    _count: { _all: true },
  });
  if (result._count._all === 0) return UNTRACKED;
  return { balance: result._sum.delta ?? 0, tracked: true };
}

// Reads a balancesFor() result for one client, so list pages don't each rewrite
// the "a miss means untracked" rule.
export function balanceFrom(
  balances: Map<string, number>,
  clientId: string,
): SessionBalance {
  const balance = balances.get(clientId);
  return balance === undefined ? UNTRACKED : { balance, tracked: true };
}

// Credit on or off the account by hand: the coach selling a block, or fixing a
// number. `delta` is signed and validated by the caller — this writes what it
// is given.
export async function addSessionCredits(entry: {
  clientId: string;
  trainerId: string;
  delta: number;
  kind: SessionCreditKind;
  note?: string | null;
}) {
  await prisma.sessionCredit.create({
    data: {
      clientId: entry.clientId,
      trainerId: entry.trainerId,
      delta: entry.delta,
      kind: entry.kind,
      note: entry.note?.trim() || null,
    },
  });
}

// One session off the account, written when an in-person session is completed.
//
// Only for clients already on a package. A client with no entries isn't being
// counted down, and writing them a first entry of -1 here would invent a
// package nobody sold and start warning their coach about it — see this file's
// header.
//
// Best effort in the same sense recordLoginSafely is: an athlete finishing
// their workout must not see an error because the ledger was busy. The unique
// index on workoutId is what makes a retry safe, and a lost debit is visible
// and fixable on the client's file, where an athlete blocked from logging their
// session is neither.
export async function consumeSessionCredit(workout: {
  id: string;
  clientId: string;
  trainerId: string;
}) {
  // A coach's own session, assigned to themselves — clientId === trainerId, see
  // src/lib/assignees.ts. Nobody sells themselves a package, and the tracked
  // check below would refuse it anyway; naming it here keeps that an intention
  // rather than a coincidence.
  if (workout.clientId === workout.trainerId) return;

  try {
    const existing = await prisma.sessionCredit.count({
      where: { clientId: workout.clientId },
    });
    if (existing === 0) return;

    await prisma.sessionCredit.create({
      data: {
        clientId: workout.clientId,
        trainerId: workout.trainerId,
        delta: -1,
        kind: SESSION_CREDIT_KIND.SESSION,
        workoutId: workout.id,
      },
    });
  } catch (err) {
    // The workout was already debited — a resubmitted form, a retried action.
    // Exactly what the unique index is for, and not an error.
    if (isUniqueViolation(err)) return;
    console.error("session credit not recorded", err);
  }
}

// The statement on a client's file: their entries, newest first. Takes the same
// optional coach scope as balanceFor above, for the same reason.
export async function creditHistory(
  clientId: string,
  trainerId?: string,
  take = 12,
) {
  return prisma.sessionCredit.findMany({
    where: { clientId, ...(trainerId ? { client: { trainerId } } : {}) },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      // Named on the row so "Session used" says which one, and links to it.
      workout: { select: { id: true, title: true, scheduledDate: true } },
    },
  });
}
