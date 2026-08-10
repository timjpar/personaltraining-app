import { Card, buttonClass } from "@/components/ui";
import { DeleteWorkoutForm } from "@/components/DeleteWorkoutForm";
import { relativeTime } from "@/lib/format";
import { gcalMessage } from "@/lib/google-calendar";
import {
  disconnectGoogleCalendar,
  resyncGoogleCalendar,
} from "@/app/google-calendar-actions";

export type GoogleCalendarState =
  | { kind: "unconfigured" }
  | { kind: "disconnected"; timeZone: string }
  | { kind: "revoked"; email: string }
  // Connected, but with no calendar to write to — see googleCalendarState.
  | {
      kind: "incomplete";
      email: string;
      timeZone: string;
      lastError: string | null;
    }
  | { kind: "connected"; email: string; timeZone: string; syncedAt: Date | null };

// Lives at the top of both calendar pages rather than on a settings page. This
// is where you'd look for a calendar feature, and a setting nobody finds is a
// feature nobody uses.
export function GoogleCalendarCard({
  state,
  notice,
}: {
  state: GoogleCalendarState;
  // ?google=<code> from the connect routes, which redirect rather than render
  // and so have no other channel to report what happened.
  notice?: string;
}) {
  const message = gcalMessage(notice);

  return (
    <Card className="mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-base font-semibold text-ink">
          Google Calendar
        </h2>
        <Body state={state} />
        {message ? (
          <p
            className={`mt-1.5 text-xs ${
              message.ok ? "text-jade-strong" : "text-flag"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {state.kind === "connected" ? (
          <>
            <form action={resyncGoogleCalendar}>
              <button type="submit" className={buttonClass("outline", "sm")}>
                Sync now
              </button>
            </form>
            <Disconnect />
          </>
        ) : state.kind === "incomplete" ? (
          // Both buttons: the repair is one click, and giving up shouldn't mean
          // hunting for a way out of a half-made connection.
          <>
            <a
              href="/api/calendar/google"
              className={buttonClass("primary", "sm")}
            >
              Finish setup
            </a>
            <Disconnect />
          </>
        ) : state.kind === "unconfigured" ? null : (
          <a href="/api/calendar/google" className={buttonClass("primary", "sm")}>
            {state.kind === "revoked" ? "Reconnect" : "Connect"}
          </a>
        )}
      </div>
    </Card>
  );
}

function Disconnect() {
  return (
    <DeleteWorkoutForm
      action={disconnectGoogleCalendar}
      confirmMessage="Disconnect Google Calendar? The Chalkline calendar and everything on it will be removed from your Google account."
      label="Disconnect"
    />
  );
}

function Body({ state }: { state: GoogleCalendarState }) {
  switch (state.kind) {
    case "unconfigured":
      // Rendered rather than hidden, for the same reason the Google sign-in
      // button always renders: a missing button makes a missing environment
      // variable look like missing code.
      return (
        <p className="mt-1 text-sm text-ink-soft">
          Syncing to Google Calendar isn&rsquo;t set up on this server yet.
        </p>
      );

    case "revoked":
      return (
        <p className="mt-1 text-sm text-ink-soft">
          Google disconnected Chalkline from{" "}
          <span className="metric">{state.email}</span>. Reconnect to resume
          syncing.
        </p>
      );

    case "incomplete":
      return (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Connected as <span className="metric">{state.email}</span>, but the{" "}
            <span className="metric">Chalkline</span> calendar was never
            created, so nothing is syncing. Times will be sent as{" "}
            <span className="metric">{state.timeZone}</span> once it is.
          </p>
          {/* Google's own words, verbatim. Ugly next to the rest of this card,
              and worth it: this failure is almost always a switch in the
              Google Cloud project, and the message names the switch and links
              to it. Anything we paraphrased would be a guess. */}
          {state.lastError ? (
            <p className="mt-1 break-words text-xs text-ink-soft/80">
              Google said: <span className="metric">{state.lastError}</span>
            </p>
          ) : null}
        </>
      );

    case "disconnected":
      return (
        <p className="mt-1 text-sm text-ink-soft">
          Push your sessions to Google Calendar, one way. Times will be sent as{" "}
          <span className="metric">{state.timeZone}</span>.
        </p>
      );

    case "connected":
      return (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Connected as <span className="metric">{state.email}</span> ·{" "}
            <span className="metric">{state.timeZone}</span> ·{" "}
            {state.syncedAt ? `synced ${relativeTime(state.syncedAt)}` : "not yet synced"}
          </p>
          {/* The most likely support question, answered before it's asked: a
              new secondary calendar is not always ticked by default in the
              Google Calendar mobile app, and someone who connects and sees an
              empty phone concludes it's broken. */}
          <p className="mt-1 text-xs text-ink-soft/80">
            Events go to a calendar called <span className="metric">Chalkline</span>.
            On phones you may need to tick it in the Google Calendar app&rsquo;s
            calendar list before it shows up.
          </p>
        </>
      );
  }
}
