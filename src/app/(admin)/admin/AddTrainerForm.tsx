import { InviteForm } from "@/components/InviteForm";
import { addTrainer } from "./actions";

// A server component that hands the action down, so the "use client" boundary
// stays inside InviteForm and this file keeps nothing but the wording.
export function AddTrainerForm() {
  return (
    <InviteForm
      action={addTrainer}
      noun="coach"
      idPrefix="t"
      title="Add a coach"
      blurb={
        <>
          Create their workspace. You&rsquo;ll get a password to pass along, and
          they add their own clients from there.
        </>
      }
      namePlaceholder="Dana Whitlock"
      emailPlaceholder="dana@example.com"
    />
  );
}
