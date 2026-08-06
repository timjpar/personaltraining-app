// The sign-in audit trail. Every attempt against the app lands here, whether it
// succeeded or not, and only the owner admin area reads it back.
import { prisma } from "./db";
import { LOGIN_OUTCOME, type LoginMethod, type LoginOutcome } from "./constants";

type LoginAttempt = {
  // As typed at the prompt, lowercased by the caller the same way the lookup is.
  email: string;
  method: LoginMethod;
  outcome: LoginOutcome;
  // Null whenever the attempt never resolved to an account.
  userId?: string | null;
};

async function recordLogin({ email, method, outcome, userId }: LoginAttempt) {
  await prisma.loginEvent.create({
    data: { email, method, outcome, userId: userId ?? null },
  });

  // `lastLoginAt` only exists so the accounts list can sort and show "last
  // seen" in one query; the LoginEvent row above is the record of truth.
  if (outcome === LOGIN_OUTCOME.SUCCESS && userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}

// The variant the auth paths call. Same contract as recordExerciseNamesSafely:
// an audit write that fails must never be the reason someone can't sign in, so
// the error is logged and swallowed rather than surfaced.
export async function recordLoginSafely(attempt: LoginAttempt): Promise<void> {
  try {
    await recordLogin(attempt);
  } catch (err) {
    console.error("Failed to record login event", err);
  }
}
