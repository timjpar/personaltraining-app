"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createCustomExercise,
  type ExerciseFormState,
} from "@/app/(trainer)/exercises/actions";
import {
  Card,
  Field,
  Input,
  Select,
  FormError,
  buttonClass,
} from "@/components/ui";
import { DISCIPLINE_ORDER, DISCIPLINE_LABELS } from "@/lib/constants";

// All uncontrolled. Name and discipline are the same pair CustomExerciseRow
// edits back on the list page; the demo link is the one field this form asks
// for that the row doesn't, since media is managed by ExerciseMediaManager
// above it — either way it's the same URL, going to the same two columns.
export function CustomExerciseForm() {
  const [state, formAction, pending] = useActionState<ExerciseFormState, FormData>(
    createCustomExercise,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError>{state.error}</FormError>

      <Card className="grid gap-3.5 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            label="Movement name"
            htmlFor="name"
            hint="However you say it in the gym — that's what shows up in the picker."
          >
            <Input
              id="name"
              name="name"
              placeholder="Hack squat"
              autoFocus
              required
            />
          </Field>
        </div>

        <Field label="Discipline" htmlFor="discipline">
          <Select id="discipline" name="discipline" defaultValue="STRENGTH">
            {DISCIPLINE_ORDER.map((d) => (
              <option key={d} value={d}>
                {DISCIPLINE_LABELS[d]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Demo video (optional)"
          htmlFor="url"
          hint="YouTube, Instagram, TikTok or Facebook — it plays inside Chalkline."
        >
          {/* inputMode rather than type="url": a phone still gets the URL
              keyboard, but a link the browser dislikes reaches the server and
              comes back with our wording instead of a native tooltip. */}
          <Input id="url" name="url" inputMode="url" placeholder="https://…" />
        </Field>
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : "Add exercise"}
        </button>
        <Link href="/exercises" className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
