import { InviteForm } from "@/components/InviteForm";
import { Field, Select } from "@/components/ui";
import {
  ADDABLE_STAGES,
  CLIENT_STAGE,
  CLIENT_STAGE_HINTS,
  CLIENT_STAGE_LABELS,
} from "@/lib/constants";
import type { StageAllowance } from "@/lib/roster";
import { addClient } from "./actions";

export function AddClientForm({
  allowances,
}: {
  allowances: StageAllowance[];
}) {
  // Only the stages you can add into have a say here. The archive has its own
  // cap and its own way in — moving somebody across on their file — so a full
  // archive must not be able to take this form away.
  const addable = allowances.filter((a) =>
    (ADDABLE_STAGES as readonly string[]).includes(a.stage),
  );

  // Full on both counts is the only state that takes the form away. With room
  // on one of the two, the picker below still has somewhere to put someone —
  // and the action refuses the full side by name if they pick it anyway.
  const full = addable.every((a) => a.full);

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
            {addable
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
        hint={addable
          .map((a) => `${a.remaining} ${CLIENT_STAGE_LABELS[a.stage].toLowerCase()} slot${a.remaining === 1 ? "" : "s"} left`)
          .join(" · ")}
      >
        <Select id="c-stage" name="stage" defaultValue={CLIENT_STAGE.ACTIVE}>
          {ADDABLE_STAGES.map((stage) => {
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
