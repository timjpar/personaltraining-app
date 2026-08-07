"use client";

import { useActionState } from "react";
import { completePasswordReset, type AuthState } from "../../actions";
import { Field, Input, FormError, buttonClass } from "@/components/ui";

const initial: AuthState = {};

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(completePasswordReset, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormError>{state.error}</FormError>

      <input type="hidden" name="token" value={token} />

      {/* Hidden, and here only for password managers: they key an entry on the
          username field in the form, and without one a saved login gets
          orphaned rather than updated. Not editable — which account this is was
          settled by the link. */}
      <input
        type="email"
        name="email"
        value={email}
        autoComplete="username"
        readOnly
        hidden
      />

      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          required
        />
      </Field>

      <Field label="Confirm new password" htmlFor="confirm">
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          required
        />
      </Field>

      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Saving…" : "Set password and sign in"}
      </button>
    </form>
  );
}
