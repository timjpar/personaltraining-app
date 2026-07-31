"use client";

import { buttonClass } from "@/components/ui";

export function DeleteWorkoutForm({
  action,
  confirmMessage = "Delete this workout? This can't be undone.",
  label = "Delete",
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage?: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={buttonClass("danger", "sm")}>
        {label}
      </button>
    </form>
  );
}
