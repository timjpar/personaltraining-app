"use client";

import { useActionState, useState } from "react";
import {
  deleteUser,
  resetPassword,
  type DeleteUserState,
  type ResetPasswordState,
} from "../../actions";
import { Card, Field, Input, FormError, buttonClass } from "@/components/ui";

const resetInitial: ResetPasswordState = {};
const deleteInitial: DeleteUserState = {};

export function DangerZone({
  userId,
  email,
  name,
  removes,
  orphans,
  isSelf,
  isOwner,
  isAdmin,
}: {
  userId: string;
  email: string;
  name: string;
  // Plain-language list of what the delete takes with it, built on the server
  // from the same relations the cascade follows.
  removes: string[];
  orphans: number;
  isSelf: boolean;
  isOwner: boolean;
  // Either tier — the two are told apart only to say which fix applies.
  isAdmin: boolean;
}) {
  const [reset, resetAction, resetting] = useActionState(
    resetPassword,
    resetInitial,
  );
  const [del, deleteAction, deleting] = useActionState(
    deleteUser,
    deleteInitial,
  );
  const [copied, setCopied] = useState(false);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          Reset password
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Existing passwords can&rsquo;t be shown — they&rsquo;re stored as
          one-way hashes, so nobody can read them back, including you. Setting a
          new one is the way to get {name} in.
        </p>

        {reset.password ? (
          <>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-jade/25 bg-jade-wash px-3.5 py-2.5">
              <span className="metric text-sm text-ink">{reset.password}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(reset.password ?? "");
                  setCopied(true);
                }}
                className="eyebrow shrink-0 rounded-[var(--radius-sm)] border border-line bg-card px-2.5 py-1.5 text-ink-soft transition-colors hover:text-ink"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              Shown once, because nothing stores it — leaving this page is the
              end of it and you&rsquo;d have to set another. Hand it to {name}{" "}
              and have them change it.
            </p>
          </>
        ) : (
          <form action={resetAction} className="mt-4 flex flex-col gap-4">
            <FormError>{reset.error}</FormError>
            <input type="hidden" name="userId" value={userId} />
            <Field
              label="New password"
              htmlFor="reset-password"
              hint="Type one to choose it yourself, or leave blank and one gets generated."
            >
              <Input
                id="reset-password"
                name="password"
                type="text"
                autoComplete="off"
                placeholder="Auto-generate"
                minLength={8}
              />
            </Field>
            <button
              type="submit"
              disabled={resetting}
              className={buttonClass("outline")}
            >
              {resetting ? "Setting…" : "Set a new password"}
            </button>
          </form>
        )}
      </Card>

      <Card className="border-flag/25 p-5">
        <h2 className="font-display text-lg font-semibold text-flag">
          Delete account
        </h2>

        {isSelf || isAdmin ? (
          <p className="mt-1 text-sm text-ink-soft">
            {isSelf
              ? "This is the account you're signed in as."
              : isOwner
                ? "This is an owner account. Remove it from ADMIN_EMAILS first."
                : "This is an admin account. Revoke its access first."}
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-soft">
              Permanent. Also deletes:
            </p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-soft">
              {removes.length ? (
                removes.map((r) => <li key={r}>{r}</li>)
              ) : (
                <li>nothing else — this account hasn&rsquo;t created anything</li>
              )}
            </ul>
            {orphans > 0 ? (
              <p className="mt-2 text-sm text-ink-soft">
                {orphans} client{orphans === 1 ? "" : "s"} will be kept, but left
                without a trainer.
              </p>
            ) : null}
            <p className="mt-2 text-xs text-ink-soft">
              Their sign-in history stays on the Sign-ins page.
            </p>

            <form action={deleteAction} className="mt-4 flex flex-col gap-4">
              <FormError>{del.error}</FormError>
              <input type="hidden" name="userId" value={userId} />
              <Field label="Type the email to confirm" htmlFor="confirm-email">
                <Input
                  id="confirm-email"
                  name="confirm"
                  type="text"
                  autoComplete="off"
                  placeholder={email}
                  required
                />
              </Field>
              <button
                type="submit"
                disabled={deleting}
                className={buttonClass("danger")}
              >
                {deleting ? "Deleting…" : "Delete this account"}
              </button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
