"use client";

import { useActionState, useState } from "react";
import {
  saveNotificationPrefs,
  type NotifyState,
} from "@/app/(trainer)/dashboard/actions";
import { Card, Field, Select, FormError, buttonClass } from "@/components/ui";
import { formatTime } from "@/lib/calendar";

// Email settings, on the activity page rather than a settings screen — the
// same call GoogleCalendarCard makes about living where you'd look for it, and
// this is email *about the activity feed*.
//
// At the bottom of the page, not the top: dashboard/page.tsx is explicit that
// nothing should push the feed down, so this sits where ResetClientPassword
// sits on the client page — the thing you reach for once in a while.
export function NotificationsCard({
  digestHour,
  instantWorkoutEmail,
  instantNutritionEmail,
  timeZone,
  mailConfigured,
}: {
  digestHour: number | null;
  instantWorkoutEmail: boolean;
  instantNutritionEmail: boolean;
  // The zone the hours below are in, so "8:00 PM" isn't ambiguous.
  timeZone: string;
  mailConfigured: boolean;
}) {
  const [state, action, pending] = useActionState<NotifyState, FormData>(
    saveNotificationPrefs,
    {},
  );

  // The only piece of state on the card, and it exists so the hour can grey out
  // the moment the box is unchecked rather than after a save. null digestHour
  // is off — the one place the column's encoding is read as a boolean.
  const [digestOn, setDigestOn] = useState(digestHour != null);

  // Shown rather than hidden when there's no mail credential, the same way
  // GoogleCalendarCard reports an unconfigured server: a missing card makes a
  // missing environment variable look like missing code.
  if (!mailConfigured) {
    return (
      <Card className="p-5">
        <h2 className="font-display text-base font-semibold text-ink">
          Email notifications
        </h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Email isn&rsquo;t set up on this server, so nothing can be sent yet.
          Everything still shows up in your activity feed above.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="font-display text-base font-semibold text-ink">
        Email notifications
      </h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        Choose what reaches your inbox, and whether it waits for the evening.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-4">
        <FormError>{state.error}</FormError>

        {/* Checked and controlled, unlike the two below it, because the hour
            underneath reacts to it. Unchecking is how the digest is turned off
            now — the select no longer carries an Off option, so there's one
            control per decision instead of a dropdown that hides a switch. */}
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="digest"
            checked={digestOn}
            onChange={(e) => setDigestOn(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-jade)]"
          />
          <span className="text-sm text-ink">
            Send me one summary a day
            <span className="mt-0.5 block text-xs text-ink-soft">
              Everyone who trained and everyone who logged their food, in one
              email.
            </span>
          </span>
        </label>

        {/* Indented to the checkbox's text, so it reads as part of that choice
            rather than a fourth one. Disabled — not hidden — when the digest is
            off: the hour is still worth seeing, and a control that vanishes
            makes the box above look like it did something bigger than it did. */}
        <div className="ml-8 flex flex-col gap-1.5">
          <Field label="Send it at" htmlFor="digestHour">
            <Select
              id="digestHour"
              name="digestHour"
              disabled={!digestOn}
              defaultValue={String(digestHour ?? 20)}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {/* formatTime takes minutes past midnight — the same helper
                      the calendar uses, so the string reads identically. */}
                  {formatTime(h * 60)}
                </option>
              ))}
            </Select>
          </Field>
          <p className="metric text-xs text-ink-soft">
            Times are {timeZone}. Delivery can be up to an hour late.
          </p>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="instant"
            defaultChecked={instantWorkoutEmail}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-jade)]"
          />
          <span className="text-sm text-ink">
            Email me the moment a session is finished
            <span className="mt-0.5 block text-xs text-ink-soft">
              One email per completed workout.
            </span>
          </span>
        </label>

        {/* The noisy one, and the copy says so rather than letting a coach with
            twenty athletes find out from their inbox. */}
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="instantNutrition"
            defaultChecked={instantNutritionEmail}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-jade)]"
          />
          <span className="text-sm text-ink">
            Email me every nutrition update
            <span className="mt-0.5 block text-xs text-ink-soft">
              One email each time an athlete saves their food log — often
              several a day per person.
            </span>
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={buttonClass("primary")}
          >
            {pending ? "Saving…" : "Save"}
          </button>
          {state.ok ? (
            <span className="text-sm text-jade-strong">{state.ok}</span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
