"use client";

import { useActionState, useState } from "react";
import {
  renameCustomExercise,
  deleteCustomExercise,
  type ExerciseFormState,
} from "@/app/(trainer)/exercises/actions";
import { DeleteWorkoutForm } from "@/components/DeleteWorkoutForm";
import { Input, FormError, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";

export function CustomExerciseRow({
  id,
  name,
  lastUsed,
}: {
  id: string;
  name: string;
  lastUsed: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ExerciseFormState, FormData>(
    renameCustomExercise.bind(null, id),
    {},
  );

  if (editing) {
    return (
      <li className="px-4 py-3 sm:px-5">
        <form
          action={async (formData) => {
            formAction(formData);
            setEditing(false);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <Input
            name="name"
            defaultValue={name}
            aria-label="Exercise name"
            className="flex-1"
            autoFocus
          />
          <button
            type="submit"
            disabled={pending}
            className={buttonClass("primary", "sm")}
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={buttonClass("ghost", "sm")}
          >
            Cancel
          </button>
        </form>
        <div className="mt-2">
          <FormError>{state.error}</FormError>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{name}</p>
        <p className="metric text-xs text-ink-soft">Last used {lastUsed}</p>
      </div>
      <FormError>{state.error}</FormError>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(buttonClass("ghost", "sm"))}
      >
        Rename
      </button>
      <DeleteWorkoutForm
        action={deleteCustomExercise.bind(null, id)}
        label="Remove"
        confirmMessage="Remove this from your exercise list? Workouts you've already written keep it."
      />
    </li>
  );
}
