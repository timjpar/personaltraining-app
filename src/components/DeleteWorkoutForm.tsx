"use client";

import { buttonClass } from "@/components/ui";

export function DeleteWorkoutForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this workout? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={buttonClass("danger", "sm")}>
        Delete
      </button>
    </form>
  );
}
