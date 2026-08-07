"use client";

import { useActionState } from "react";
import { requestPasswordReset, type ResetRequestState } from "../actions";
import { Field, Input, FormError, buttonClass } from "@/components/ui";

const initial: ResetRequestState = {};

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  // The form is replaced rather than kept alongside the confirmation: leaving a
  // second submit button under "check your inbox" invites the impatient to burn
  // through the rate limit before the first mail has landed.
  if (state.sent) {
    return (
      <p className="rounded-[var(--radius-sm)] border border-jade/20 bg-jade-wash px-3.5 py-3 text-sm text-jade-strong">
        If that email has an account, a reset link is on its way. It works once
        and expires in an hour.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormError>{state.error}</FormError>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@gym.com"
          required
        />
      </Field>

      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}
