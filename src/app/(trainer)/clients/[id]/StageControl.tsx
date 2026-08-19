"use client";

import { useActionState } from "react";
import { setClientStage, type SetStageState } from "../actions";
import { Card, Badge, FormError, buttonClass } from "@/components/ui";
import {
  CLIENT_STAGE,
  CLIENT_STAGE_HINTS,
  CLIENT_STAGE_LABELS,
  CLIENT_STAGE_ORDER,
  type ClientStage,
} from "@/lib/constants";

const initial: SetStageState = {};

// Where this person stands with the coach, and the buttons that move them.
//
// This was a single toggle while there were two stages and the destination was
// therefore never in question. With three it becomes one button per stage they
// are not in — still no picker and no separate save, because the button naming
// its destination is what makes the control readable at a glance. The stage
// travels on the submit button's own value, so two buttons share one form.
const MOVE_LABEL: Record<ClientStage, string> = {
  ACTIVE: "Move to client",
  PROSPECT: "Move to prospect",
  // Not "Move to old client": the others are a sideways step and this one ends
  // their access, so it gets a verb that sounds like the bigger decision it is.
  ARCHIVED: "Make an old client",
};

const TONES: Record<ClientStage, "jade" | "neutral" | "amber"> = {
  ACTIVE: "jade",
  PROSPECT: "neutral",
  // Amber rather than neutral: on a page full of someone's training history,
  // "this account is closed" is the one piece of standing worth catching an eye.
  ARCHIVED: "amber",
};

export function StageControl({
  clientId,
  firstName,
  stage,
}: {
  clientId: string;
  firstName: string;
  stage: ClientStage;
}) {
  const [state, action, pending] = useActionState(
    setClientStage.bind(null, clientId),
    initial,
  );

  const others = CLIENT_STAGE_ORDER.filter((s) => s !== stage);
  const archived = stage === CLIENT_STAGE.ARCHIVED;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-ink">
          Standing
        </h2>
        <Badge tone={TONES[stage]}>{CLIENT_STAGE_LABELS[stage]}</Badge>
      </div>

      <p className="mt-1 text-sm text-ink-soft">
        {CLIENT_STAGE_HINTS[stage]}. Each counts against its own limit, and
        moving {firstName} across keeps everything on their file.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-3">
        <FormError>{state.error}</FormError>
        {state.ok ? (
          <p className="rounded-[var(--radius-sm)] border border-jade/20 bg-jade-wash px-3.5 py-2.5 text-sm text-jade-strong">
            {state.ok}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {others.map((next) => (
            <button
              key={next}
              type="submit"
              name="stage"
              value={next}
              disabled={pending}
              className={buttonClass("outline")}
            >
              {pending ? "Moving…" : MOVE_LABEL[next]}
            </button>
          ))}
        </div>

        {/* Said before the press, not after. Archiving signs someone out of an
            app they may be mid-week in, and that is not recoverable by them —
            only the coach can move them back. */}
        <p className="text-xs text-ink-soft">
          {archived
            ? `${firstName} can't sign in while they're an old client. Everything they logged is still here, and moving them back restores their access.`
            : `Making ${firstName} an old client signs them out and blocks their sign-in. Their history stays on file, and you can move them back at any time.`}
        </p>
      </form>
    </Card>
  );
}
