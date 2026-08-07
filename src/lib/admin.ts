// The owner's view of the whole app. There are two tiers, and the split exists
// so the root of the permission tree can't be moved from inside the app:
//
//   Owner  — named in the ADMIN_EMAILS environment variable. Nobody can grant
//            or revoke it by editing a row, so a compromised admin account
//            can't escalate; revoking is a config change, not a migration.
//   Admin  — the User.isAdmin column, set by an owner from /admin. Manages
//            ordinary accounts, but can't promote anyone (that's owner-only,
//            see setAdminAccess) and can't touch an owner.
//
// Neither is a third value of `role`. Admin is an overlay on an ordinary
// trainer account, so promoting someone leaves their coaching untouched.
import { notFound } from "next/navigation";
import { requireUser } from "./auth";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Unset or blank means there are no owners and nobody can be promoted into
// existence — the safe direction for a variable someone forgot to set.
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

// Takes the fields rather than a User so the callers that only selected a
// couple of columns can still ask.
export function isAdminUser(user: {
  email: string;
  isAdmin: boolean;
}): boolean {
  return isOwnerEmail(user.email) || user.isAdmin;
}

// notFound() rather than a redirect: a bounce would tell whoever probed /admin
// that there's something there to find. A signed-out visitor never reaches this
// — the proxy sends them to /login first.
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminUser(user)) notFound();
  return user;
}

// For the handful of things a promoted admin must not be able to do: granting
// admin, and acting on another admin's account.
export async function requireOwner() {
  const user = await requireUser();
  if (!isOwnerEmail(user.email)) notFound();
  return user;
}
