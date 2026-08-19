// How much room a coach has left, in clients and in prospects.
//
// The app is invite-only and a coach's roster is capped (CLIENT_LIMIT and
// PROSPECT_LIMIT in constants.ts), so two questions get asked in several
// places: "how many of each do they have" for the counts on screen, and "may
// they add one more of this kind" at every write that could exceed a cap. Both
// live here so the roster page and the actions that fill it can never disagree
// about what full means.
import { prisma } from "./db";
import {
  CLIENT_STAGE,
  CLIENT_STAGE_LABELS,
  CLIENT_STAGE_ORDER,
  ROLES,
  STAGE_LIMITS,
  toClientStage,
  type ClientStage,
} from "./constants";

export type RosterCounts = Record<ClientStage, number>;

// One grouped count rather than a query per stage. Stages with nobody in them
// don't come back at all, so the zeroes are seeded first — a missing key here
// would read as NaN in every subtraction downstream.
export async function rosterCounts(trainerId: string): Promise<RosterCounts> {
  const rows = await prisma.user.groupBy({
    by: ["stage"],
    where: { trainerId, role: ROLES.CLIENT },
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    CLIENT_STAGE_ORDER.map((stage) => [stage, 0]),
  ) as RosterCounts;

  for (const row of rows) {
    // Coerced rather than indexed directly: `stage` is a plain String column,
    // so an unrecognised value is possible and must land somewhere real rather
    // than write a key nothing reads.
    counts[toClientStage(row.stage)] += row._count._all;
  }
  return counts;
}

export type StageAllowance = {
  stage: ClientStage;
  used: number;
  limit: number;
  remaining: number;
  full: boolean;
};

export function allowanceFor(
  counts: RosterCounts,
  stage: ClientStage,
): StageAllowance {
  const used = counts[stage];
  const limit = STAGE_LIMITS[stage];
  // Clamped at zero. A roster that somehow sits over its cap — a limit lowered
  // under an existing coach — should read as "no room", never as a negative
  // number of remaining slots.
  const remaining = Math.max(0, limit - used);
  return { stage, used, limit, remaining, full: remaining === 0 };
}

export function allowances(counts: RosterCounts): StageAllowance[] {
  return CLIENT_STAGE_ORDER.map((stage) => allowanceFor(counts, stage));
}

// The one sentence every caller that refuses a write says. Written here rather
// than at each call site so the coach reads the same words whether they were
// adding someone or moving someone across, and so the number in it can't drift
// from the number that was actually checked.
export function fullMessage(allowance: StageAllowance): string {
  const noun = CLIENT_STAGE_LABELS[allowance.stage].toLowerCase();
  // Each one names the way out that actually applies. The archive's is the odd
  // one — there is nowhere left to move people to, so the only way to make room
  // is to delete someone, and saying so is kinder than "you're full".
  const NEXT_STEP: Record<ClientStage, string> = {
    [CLIENT_STAGE.ACTIVE]:
      "Move someone to a prospect or an old client, or ask an admin to raise your limit.",
    [CLIENT_STAGE.PROSPECT]:
      "Move a prospect to a client or an old client, or ask an admin to raise your limit.",
    [CLIENT_STAGE.ARCHIVED]:
      "Delete an old client you no longer need to keep, or ask an admin to raise your limit.",
  };
  const other = NEXT_STEP[allowance.stage];
  return `You're at your limit of ${allowance.limit} ${noun}${allowance.limit === 1 ? "" : "s"}. ${other}`;
}

// The gate itself: null when there's room, the sentence to show when there
// isn't. Returning the message rather than throwing keeps it in the same shape
// every action in this app already uses for a refusal.
export async function checkRoom(
  trainerId: string,
  stage: ClientStage,
): Promise<string | null> {
  const allowance = allowanceFor(await rosterCounts(trainerId), stage);
  return allowance.full ? fullMessage(allowance) : null;
}
