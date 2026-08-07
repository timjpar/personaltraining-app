"use client";

// The "Sign-in methods" cell, made actionable. It reads as the place a password
// would be, so the question "where is it?" gets asked here rather than at the
// Reset password card further down the page — and the honest answer is short
// enough to fit: there isn't one to show, but you can put one here in a click.
//
// Deliberately drives the same resetPassword action as DangerZone rather than a
// second one. One code path, one set of guards; this is only a nearer door.
import { useActionState, useState } from "react";
import { resetPassword, type ResetPasswordState } from "../../actions";
import { Badge, FormError, Input, buttonClass } from "@/components/ui";

const initial: ResetPasswordState = {};

export function SignInMethods({
  userId,
  firstName,
  hasPassword,
  hasGoogle,
  canSet,
}: {
  userId: string;
  firstName: string;
  hasPassword: boolean;
  hasGoogle: boolean;
  // False when this account is an admin and the viewer isn't an owner. The
  // action refuses it too — this only avoids offering what would be rejected.
  canSet: boolean;
}) {
  const [state, action, pending] = useActionState(resetPassword, initial);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <>
      <span className="flex flex-wrap gap-1.5">
        {hasPassword ? <Badge tone="neutral">Password</Badge> : null}
        {hasGoogle ? <Badge tone="jade">Google</Badge> : null}
        {!hasPassword && !hasGoogle ? (
          <Badge tone="flag">None &mdash; can&rsquo;t sign in</Badge>
        ) : null}
      </span>

      {state.password ? (
        <div className="mt-2">
          <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-jade/25 bg-jade-wash px-3 py-2">
            <span className="metric text-sm text-ink">{state.password}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(state.password ?? "");
                setCopied(true);
              }}
              className="eyebrow shrink-0 rounded-[var(--radius-sm)] border border-line bg-card px-2 py-1 text-ink-soft transition-colors hover:text-ink"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            Read it to {firstName} now — nothing stores it, so leaving this page
            means setting another.
          </p>
        </div>
      ) : !canSet ? (
        <p className="mt-2 text-xs text-ink-soft">
          Only an owner can set this account&rsquo;s password.
        </p>
      ) : open ? (
        <form action={action} className="mt-2 flex flex-col gap-2">
          <FormError>{state.error}</FormError>
          <input type="hidden" name="userId" value={userId} />
          <Input
            name="password"
            type="text"
            autoComplete="off"
            placeholder="Leave blank to generate"
            minLength={8}
            aria-label="New password"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className={buttonClass("outline", "sm")}
            >
              {pending ? "Setting…" : "Set it"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="eyebrow px-2 text-ink-soft transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-2 text-xs text-ink-soft">
            The password itself can&rsquo;t be shown — it&rsquo;s stored as a
            one-way hash, so nobody can read it back.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="eyebrow mt-1.5 text-jade-strong underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Set a new one
          </button>
        </>
      )}
    </>
  );
}
