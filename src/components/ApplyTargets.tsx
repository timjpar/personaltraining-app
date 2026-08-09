"use client";

import { useActionState } from "react";
import { Button, FormError } from "@/components/ui";
import type { BodyState } from "@/lib/body-form";

const initial: BodyState = {};

// The "accept these numbers into their plan" button. It posts nothing but the
// intent — the action recomputes the targets server-side and reports what it
// actually wrote, so the success line is the receipt rather than an echo of
// what this page happened to render.
export function ApplyTargets({
  action,
  planId,
  planTitle,
}: {
  action: (prev: BodyState, formData: FormData) => Promise<BodyState>;
  planId: string;
  planTitle: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {/* Which plan the label below promises. The action writes to this one
          rather than to whatever is newest, so the button can't edit a plan it
          didn't name. */}
      <input type="hidden" name="planId" value={planId} />
      <FormError>{state.error}</FormError>
      {state.ok ? (
        <p className="rounded-[var(--radius-sm)] border border-jade/20 bg-jade-wash px-3.5 py-2.5 text-sm text-jade-strong">
          Applied to <span className="metric">{state.ok}</span>
        </p>
      ) : null}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Applying…" : `Apply to ${planTitle}`}
      </Button>
    </form>
  );
}
