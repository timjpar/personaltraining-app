// Password reset tokens: issuing them, spending them, and the rules that keep
// them from being useful to anyone but the person who asked.
//
// Three properties matter and each is enforced here rather than at a call site:
//   short-lived  — an hour, so a link sitting in an old mailbox stops working
//   single-use   — spending one is a conditional UPDATE, not a read-then-write
//   never stored — the database holds SHA-256(token), so a dump of it is a list
//                  of hashes rather than a set of live account-takeover links
//
// No bcrypt here, deliberately. Hashing a password slowly is what makes a
// guessable secret survive a leak; a 256-bit random token has nothing to guess,
// and running bcrypt over one on every page load of /reset/<token> would buy
// nothing for real cost.
import { prisma } from "./db";
import { randomToken, sha256Hex } from "./random";

const TTL_MINUTES = 60;

// A reset is a mail-sending primitive pointed at someone else's inbox, so the
// form is a spam cannon without a limit. Three in a quarter of an hour is far
// past what a real person retrying needs and far below what an abuser wants.
const MAX_PER_WINDOW = 3;
const WINDOW_MINUTES = 15;

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

// Returns the raw token to email, or null when this account has asked too often
// — the caller shows the same neutral message either way, so a rate limit is
// invisible to whoever tripped it.
export async function createResetToken(userId: string): Promise<string | null> {
  const recent = await prisma.passwordResetToken.count({
    where: { userId, createdAt: { gt: minutesFromNow(-WINDOW_MINUTES) } },
  });
  if (recent >= MAX_PER_WINDOW) return null;

  const token = randomToken();
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: await sha256Hex(token),
      userId,
      expiresAt: minutesFromNow(TTL_MINUTES),
    },
  });
  return token;
}

export type ResetTarget = { id: string; name: string; email: string };

// Look without spending, for rendering /reset/<token>. Showing a form that only
// fails on submit is a worse way to say "this link expired" than not showing
// one at all.
export async function findResetTarget(
  token: string,
): Promise<ResetTarget | null> {
  if (!token) return null;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: await sha256Hex(token) },
    select: {
      expiresAt: true,
      usedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!row || row.usedAt || row.expiresAt <= new Date()) return null;
  return row.user;
}

// Spend it. Returns the account it belonged to, or null if it was already spent,
// expired, or never existed.
export async function consumeResetToken(
  token: string,
): Promise<ResetTarget | null> {
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const now = new Date();

  // One conditional UPDATE rather than a read followed by a write: two requests
  // racing on the same link (a double submit, a mail client prefetching) would
  // both pass a read-then-check and both reset the password. Postgres settles
  // it here, and the loser sees a count of 0.
  const spent = await prisma.passwordResetToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (spent.count !== 1) return null;

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!row) return null;

  // Everything else they had outstanding dies with it. Someone who asked three
  // times and used the newest link should not leave two live keys behind in an
  // inbox that may be the reason they were resetting in the first place.
  await prisma.passwordResetToken.updateMany({
    where: { userId: row.user.id, usedAt: null },
    data: { usedAt: now },
  });

  return row.user;
}
