"use client";

import { useActionState, useState } from "react";
import {
  updateCustomExercise,
  deleteCustomExercise,
  type ExerciseFormState,
} from "@/app/(trainer)/exercises/actions";
import { DeleteWorkoutForm } from "@/components/DeleteWorkoutForm";
import { Badge, Input, Select, FormError, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  DISCIPLINE_ORDER,
  DISCIPLINE_LABELS,
  toDiscipline,
} from "@/lib/constants";

export function CustomExerciseRow({
  id,
  name,
  discipline,
  lastUsed,
}: {
  id: string;
  name: string;
  // Null for a movement nobody has classified — the row was created
  // automatically the first time it was programmed. Reads as Other until the
  // trainer says otherwise.
  discipline: string | null;
  lastUsed: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ExerciseFormState, FormData>(
    updateCustomExercise.bind(null, id),
    {},
  );

  const current = discipline ? toDiscipline(discipline) : "OTHER";

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
            className="min-w-40 flex-1"
            autoFocus
          />
          <Select
            name="discipline"
            defaultValue={current}
            aria-label="Discipline"
            className="w-auto"
          >
            {DISCIPLINE_ORDER.map((d) => (
              <option key={d} value={d}>
                {DISCIPLINE_LABELS[d]}
              </option>
            ))}
          </Select>
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
      <Badge>{DISCIPLINE_LABELS[current]}</Badge>
      <FormError>{state.error}</FormError>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(buttonClass("ghost", "sm"))}
      >
        Edit
      </button>
      <DeleteWorkoutForm
        action={deleteCustomExercise.bind(null, id)}
        label="Remove"
        confirmMessage="Remove this from your exercise list? Workouts you've already written keep it."
      />
    </li>
  );
}
