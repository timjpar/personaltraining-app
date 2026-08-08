"use client";

import { useActionState } from "react";
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
  timeZone,
  mailConfigured,
}: {
  digestHour: number | null;
  instantWorkoutEmail: boolean;
  // The zone the hours below are in, so "8:00 PM" isn't ambiguous.
  timeZone: string;
  mailConfigured: boolean;
}) {
  const [state, action, pending] = useActionState<NotifyState, FormData>(
    saveNotificationPrefs,
    {},
  );

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
        One summary a day of who trained and who logged their food.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-4">
        <FormError>{state.error}</FormError>

        <Field label="Send the daily summary at" htmlFor="digestHour">
          <Select
            id="digestHour"
            name="digestHour"
            defaultValue={digestHour == null ? "" : String(digestHour)}
          >
            <option value="">Don&rsquo;t send it</option>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {/* formatTime takes minutes past midnight — the same helper
                    the calendar uses, so the string reads identically. */}
                {formatTime(h * 60)}
              </option>
            ))}
          </Select>
        </Field>
        <p className="metric -mt-2 text-xs text-ink-soft">
          Times are {timeZone}. Delivery can be up to an hour late.
        </p>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="instant"
            defaultChecked={instantWorkoutEmail}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-jade)]"
          />
          <span className="text-sm text-ink">
            Also email me the moment a session is finished
            <span className="mt-0.5 block text-xs text-ink-soft">
              One email per completed workout, on top of the daily summary.
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
