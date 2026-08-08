import { Card } from "@/components/ui";
import { COACH_REACTION_DISPLAY, type CoachReaction } from "@/lib/constants";
import { relativeTime } from "@/lib/format";

// What the athlete sees when their coach has responded, and the read-only twin
// of CoachFeedbackForm. A server component: there is nothing to interact with
// here, and the athlete has no reply to make — the session already carries
// their side of it.
//
// Rendered only when there is something to show. An empty "no response yet"
// card on every finished session would turn a coach's silence into a thing the
// app says out loud, once per session, forever.
export function CoachResponseCard({
  coachName,
  reaction,
  note,
  respondedAt,
}: {
  coachName: string;
  reaction: CoachReaction | null;
  note: string | null;
  respondedAt: Date | null;
}) {
  if (!reaction && !note) return null;

  const display = reaction ? COACH_REACTION_DISPLAY[reaction] : null;

  return (
    <Card className="border-jade/30 bg-jade-wash/40 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="eyebrow text-jade-strong">From {coachName}</p>
        {respondedAt ? (
          <p className="metric text-xs text-ink-soft">
            {relativeTime(respondedAt)}
          </p>
        ) : null}
      </div>

      {display ? (
        <p className="mt-3 flex items-center gap-2.5">
          {/* The emoji is hidden from assistive tech and the label carries the
              meaning, so the reaction reads as words rather than as the name of
              a character. */}
          <span aria-hidden className="text-2xl leading-none">
            {display.emoji}
          </span>
          <span className="text-sm font-medium text-ink">{display.label}</span>
        </p>
      ) : null}

      {note ? (
        <p className="mt-3 border-l-2 border-jade/40 pl-3.5 text-sm leading-relaxed text-ink">
          {note}
        </p>
      ) : null}
    </Card>
  );
}
