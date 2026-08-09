"use client";

import { useActionState, useState } from "react";
import {
  saveCoachFeedback,
  type CoachFeedbackState,
} from "@/app/(trainer)/workout-actions";
import { Card, Textarea, FormError, buttonClass } from "@/components/ui";
import {
  COACH_REACTION_DISPLAY,
  type CoachReaction,
} from "@/lib/constants";

// The coach's half of a finished session, at the foot of the review page. It
// sits after the exercises rather than beside the effort card it answers: the
// coach writes this having just read the session, and a compose box between
// them and the sets is a box to scroll past.
//
// One form and one action for both the reaction and the note, rather than a
// tap-to-react endpoint beside a save-the-note one. Two writers to three
// columns is how the reaction ends up clearing a note somebody was midway
// through typing.
export function CoachFeedbackForm({
  workoutId,
  clientName,
  reaction,
  note,
}: {
  workoutId: string;
  clientName: string;
  reaction: CoachReaction | null;
  note: string | null;
}) {
  const [state, action, pending] = useActionState<CoachFeedbackState, FormData>(
    saveCoachFeedback.bind(null, workoutId),
    {},
  );

  // Controlled so a second tap on the chosen reaction clears it. A radio group
  // can be set but never unset without a "none" option, and a row of pills with
  // an explicit None in it is a worse thing to look at than this.
  const [picked, setPicked] = useState<CoachReaction | null>(reaction);

  // First name only. "Tell Maria how that went" is what a coach would say; the
  // full name reads like a form field about her rather than a message to her.
  const firstName = clientName.split(" ")[0];

  return (
    <Card className="p-5">
      <h2 className="font-display text-base font-semibold text-ink">
        Your response
      </h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        {firstName} sees this on their own copy of the session.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-4">
        <FormError>{state.error}</FormError>

        {/* The picked value rides along in a hidden field rather than as the
            buttons' own value, because these are type="button": a submit button
            would post on every tap, and tapping a reaction is not the same
            gesture as sending one. */}
        <input type="hidden" name="reaction" value={picked ?? ""} />

        <div className="flex flex-wrap gap-2">
          {(
            Object.entries(COACH_REACTION_DISPLAY) as [
              CoachReaction,
              { emoji: string; label: string },
            ][]
          ).map(([key, { emoji, label }]) => {
            const on = picked === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(on ? null : key)}
                className={[
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
                  on
                    ? "border-jade/40 bg-jade-wash text-jade-strong"
                    : "border-line bg-card text-ink-soft hover:border-jade/30 hover:text-ink",
                ].join(" ")}
              >
                <span aria-hidden className="text-base leading-none">
                  {emoji}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        <Textarea
          name="note"
          rows={3}
          defaultValue={note ?? ""}
          placeholder={`Anything you want ${firstName} to know about this one?`}
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={buttonClass("primary")}
          >
            {pending ? "Sending…" : "Send"}
          </button>
          {state.ok ? (
            <span className="text-sm text-jade-strong">{state.ok}</span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
