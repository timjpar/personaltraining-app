import { InviteForm } from "@/components/InviteForm";
import { Field, Select } from "@/components/ui";
import {
  CLIENT_STAGE,
  CLIENT_STAGE_HINTS,
  CLIENT_STAGE_LABELS,
  CLIENT_STAGE_ORDER,
} from "@/lib/constants";
import type { StageAllowance } from "@/lib/roster";
import { addClient } from "./actions";

export function AddClientForm({
  allowances,
}: {
  allowances: StageAllowance[];
}) {
  // Full on both counts is the only state that takes the form away. With room
  // on one of the two, the picker below still has somewhere to put someone —
  // and the action refuses the full side by name if they pick it anyway.
  const full = allowances.every((a) => a.full);

  return (
    <InviteForm
      action={addClient}
      noun="client"
      idPrefix="c"
      title="Add a client"
      blurb={
        <>
          Create their account. You&rsquo;ll get a password to pass along.
        </>
      }
      namePlaceholder="Maria Lopez"
      emailPlaceholder="maria@example.com"
      blocked={
        full ? (
          <>
            You&rsquo;re at your limit on both counts —{" "}
            {allowances
              .map((a) => `${a.used} of ${a.limit}`)
              .join(" and ")}
            . During the beta an admin has to raise it.
          </>
        ) : null
      }
    >
      <Field
        label="Add as"
        htmlFor="c-stage"
        hint={allowances
          .map((a) => `${a.remaining} ${CLIENT_STAGE_LABELS[a.stage].toLowerCase()} slot${a.remaining === 1 ? "" : "s"} left`)
          .join(" · ")}
      >
        <Select id="c-stage" name="stage" defaultValue={CLIENT_STAGE.ACTIVE}>
          {CLIENT_STAGE_ORDER.map((stage) => {
            const allowance = allowances.find((a) => a.stage === stage);
            return (
              <option key={stage} value={stage} disabled={allowance?.full}>
                {CLIENT_STAGE_LABELS[stage]} — {CLIENT_STAGE_HINTS[stage]}
                {allowance?.full ? " (full)" : ""}
              </option>
            );
          })}
        </Select>
      </Field>
    </InviteForm>
  );
}
