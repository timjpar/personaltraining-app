"use client";

import { useActionState } from "react";
import { setClientStage, type SetStageState } from "../actions";
import { Card, Badge, FormError, buttonClass } from "@/components/ui";
import {
  CLIENT_STAGE,
  CLIENT_STAGE_HINTS,
  CLIENT_STAGE_LABELS,
  type ClientStage,
} from "@/lib/constants";

const initial: SetStageState = {};

// Client or prospect, and the one button that swaps them.
//
// One button rather than a picker with a save, because there are exactly two
// stages: a select of two options plus a submit is three interactions for a
// decision with one bit in it. The button names the destination ("Move to
// prospect") rather than the state, which is the difference between a control
// you can press confidently and one you have to think about first.
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

  const next: ClientStage =
    stage === CLIENT_STAGE.ACTIVE ? CLIENT_STAGE.PROSPECT : CLIENT_STAGE.ACTIVE;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-ink">
          Standing
        </h2>
        <Badge tone={stage === CLIENT_STAGE.ACTIVE ? "jade" : "neutral"}>
          {CLIENT_STAGE_LABELS[stage]}
        </Badge>
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

        <input type="hidden" name="stage" value={next} />
        <button type="submit" disabled={pending} className={buttonClass("outline")}>
          {pending
            ? "Moving…"
            : `Move to ${CLIENT_STAGE_LABELS[next].toLowerCase()}`}
        </button>
      </form>
    </Card>
  );
}
