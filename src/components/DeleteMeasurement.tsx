"use client";

import { useActionState } from "react";
import { buttonClass } from "@/components/ui";
import type { BodyState } from "@/lib/body-form";

const initial: BodyState = {};

// Delete one weigh-in. No confirm dialog: a measurement is one row of numbers
// that can be typed again in ten seconds, and the app doesn't put a modal in
// front of deleting a workout either.
export function DeleteMeasurement({
  action,
  measurementId,
  label,
}: {
  action: (prev: BodyState, formData: FormData) => Promise<BodyState>;
  measurementId: string;
  label: string;
}) {
  const [, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction}>
      <input type="hidden" name="measurementId" value={measurementId} />
      <button
        type="submit"
        disabled={pending}
        className={buttonClass("ghost", "sm")}
        aria-label={`Delete the weigh-in from ${label}`}
      >
        {pending ? "…" : "Delete"}
      </button>
    </form>
  );
}
