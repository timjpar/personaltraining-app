"use client";

import { useActionState } from "react";
import {
  resetClientPassword,
  type ResetClientPasswordState,
} from "../actions";
import { Card, FormError, buttonClass } from "@/components/ui";

const initial: ResetClientPasswordState = {};

export function ResetClientPassword({
  clientId,
  firstName,
}: {
  clientId: string;
  firstName: string;
}) {
  const [state, action, pending] = useActionState(resetClientPassword, initial);

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="font-display text-base font-semibold text-ink">
        Password
      </h2>

      {state.password ? (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Read this to {firstName}{" "}
            now — it isn&rsquo;t stored anywhere and leaving this page is the end
            of it. They&rsquo;ve been signed out on every device.
          </p>
          <p className="metric mt-3 rounded-[var(--radius-sm)] border border-line bg-paper px-3.5 py-2.5 text-sm text-ink">
            {state.password}
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            For when {firstName}{" "}
            can&rsquo;t get to the emailed reset link. Generates a new one to
            read out, and signs them out everywhere.
          </p>

          <form action={action} className="mt-4 flex flex-col gap-4">
            <FormError>{state.error}</FormError>
            <input type="hidden" name="clientId" value={clientId} />
            <button
              type="submit"
              disabled={pending}
              className={buttonClass("outline")}
            >
              {pending ? "Resetting…" : "Reset password"}
            </button>
          </form>
        </>
      )}
    </Card>
  );
}
