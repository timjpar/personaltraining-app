"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card, Field, Input, Badge, FormError, buttonClass } from "@/components/ui";
import { formatDate, relativeTime } from "@/lib/format";
import {
  SESSION_CREDIT_KIND_LABELS,
  balanceLabel,
  sessionState,
  toSessionCreditKind,
  type SessionBalance,
} from "@/lib/constants";
import type { SessionCreditState } from "@/app/(trainer)/clients/actions";

// The paid-sessions block on a client's file: what's left, what moved, and the
// one form that changes it.
//
// The balance is stated in words rather than as a bare number ("3 sessions
// left", not "3"), because the number alone is ambiguous on the one screen
// where being wrong about it costs money — 3 what, sold or used? balanceLabel
// owns that phrasing so the roster row and this card can't word it differently.
export type CreditEntry = {
  id: string;
  delta: number;
  kind: string;
  note: string | null;
  createdAt: Date;
  workout: { id: string; title: string; scheduledDate: Date } | null;
};

const initial: SessionCreditState = {};

export function SessionCreditsCard({
  firstName,
  entry,
  history,
  action,
}: {
  firstName: string;
  entry: SessionBalance;
  history: CreditEntry[];
  action: (
    prev: SessionCreditState,
    formData: FormData,
  ) => Promise<SessionCreditState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  const standing = sessionState(entry);
  const label = balanceLabel(entry);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            Paid sessions
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {entry.tracked
              ? `Counts down by one each time ${firstName} finishes a session with you.`
              : `${firstName} isn't on a package. Add sessions and they'll count down as you train.`}
          </p>
        </div>
        {label ? (
          <Badge
            tone={
              standing === "OUT" ? "flag" : standing === "LOW" ? "amber" : "jade"
            }
          >
            {label}
          </Badge>
        ) : null}
      </div>

      {/* The warning, said once and in the place the coach can act on it. The
          roster and the dashboard both flag a low balance too, but this is
          where the form to fix it is. */}
      {standing !== "OK" ? (
        <p
          className={
            "mt-4 rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-sm " +
            (standing === "OUT"
              ? "border-flag/25 bg-flag/5 text-flag"
              : "border-amber/25 bg-amber-wash text-amber")
          }
        >
          {entry.balance < 0
            ? `${firstName} has trained ${-entry.balance} session${entry.balance === -1 ? "" : "s"} past the end of their block. Time to settle up.`
            : entry.balance === 0
              ? `${firstName} has used every session in their block.`
              : `${firstName} is running low — worth asking about the next block.`}
        </p>
      ) : null}

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <FormError>{state.error}</FormError>
        {state.ok ? (
          <p className="rounded-[var(--radius-sm)] border border-jade/20 bg-jade-wash px-3.5 py-2.5 text-sm text-jade-strong">
            {state.ok}
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <Field
            label="Sessions"
            htmlFor="sc-count"
            className="w-28"
            hint="Negative to correct."
          >
            <Input
              id="sc-count"
              name="count"
              type="number"
              step="1"
              placeholder="10"
              required
            />
          </Field>
          <Field label="Note" htmlFor="sc-note" className="min-w-48 flex-1">
            <Input id="sc-note" name="note" placeholder="Ten-pack, paid by card" />
          </Field>
        </div>

        <button
          type="submit"
          disabled={pending}
          className={buttonClass("outline") + " sm:self-start sm:px-6"}
        >
          {pending ? "Saving…" : "Add to their balance"}
        </button>
      </form>

      {history.length > 0 ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="eyebrow text-ink-soft">Recent</p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {history.map((row) => (
              <li
                key={row.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0">
                  {row.workout ? (
                    <Link
                      href={`/workouts/${row.workout.id}`}
                      className="text-ink hover:underline"
                    >
                      {row.workout.title}
                    </Link>
                  ) : (
                    <span className="text-ink">
                      {SESSION_CREDIT_KIND_LABELS[toSessionCreditKind(row.kind)]}
                    </span>
                  )}
                  {row.note ? (
                    <span className="text-ink-soft"> · {row.note}</span>
                  ) : null}
                  <span className="metric block text-xs text-ink-soft">
                    {row.workout
                      ? formatDate(row.workout.scheduledDate)
                      : relativeTime(row.createdAt)}
                  </span>
                </span>
                {/* Signed, always. "+10" and "-1" read as movements; "10" and
                    "1" read as two balances that disagree. */}
                <span
                  className={
                    "metric shrink-0 text-sm " +
                    (row.delta > 0 ? "text-jade-strong" : "text-ink-soft")
                  }
                >
                  {row.delta > 0 ? "+" : ""}
                  {row.delta}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
