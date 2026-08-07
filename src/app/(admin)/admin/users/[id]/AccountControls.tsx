"use client";

import { useActionState, useState } from "react";
import {
  setAdminAccess,
  updateAccount,
  type AdminAccessState,
  type UpdateAccountState,
} from "../../actions";
import {
  Badge,
  Card,
  Field,
  FormError,
  Input,
  Select,
  buttonClass,
} from "@/components/ui";
import { ROLES } from "@/lib/constants";

const updateInitial: UpdateAccountState = {};
const accessInitial: AdminAccessState = {};

export function AccountControls({
  userId,
  name,
  email,
  role,
  trainerId,
  trainers,
  isOwner,
  isAdmin,
  isSelf,
  actorIsOwner,
}: {
  userId: string;
  name: string;
  email: string;
  role: string;
  trainerId: string | null;
  // Every trainer account except this one, for the reassign list.
  trainers: { id: string; name: string; email: string }[];
  isOwner: boolean;
  isAdmin: boolean;
  isSelf: boolean;
  actorIsOwner: boolean;
}) {
  const [saved, saveAction, saving] = useActionState(
    updateAccount,
    updateInitial,
  );
  const [access, accessAction, changingAccess] = useActionState(
    setAdminAccess,
    accessInitial,
  );

  // Tracked here only so the trainer picker can disappear the moment the role
  // changes — a trainer has no trainer, and the action clears the column to
  // match. The submitted value is still whatever the select holds.
  const [pendingRole, setPendingRole] = useState(role);
  const editable = actorIsOwner || !(isOwner || isAdmin);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          Account details
        </h2>

        {editable ? (
          <form action={saveAction} className="mt-4 flex flex-col gap-4">
            <FormError>{saved.error}</FormError>
            {saved.ok ? (
              <p className="rounded-[var(--radius-sm)] border border-jade/20 bg-jade-wash px-3.5 py-2.5 text-sm text-jade-strong">
                {saved.ok}
              </p>
            ) : null}
            <input type="hidden" name="userId" value={userId} />

            <Field label="Name" htmlFor="account-name">
              <Input id="account-name" name="name" defaultValue={name} required />
            </Field>

            <Field
              label="Email"
              htmlFor="account-email"
              hint="What they sign in with. A linked Google account isn't affected."
            >
              <Input
                id="account-email"
                name="email"
                type="email"
                defaultValue={email}
                required
              />
            </Field>

            <Field
              label="Role"
              htmlFor="account-role"
              hint={
                isSelf
                  ? "You can't change your own role."
                  : "Changing this signs them out — their next visit asks them to sign in again."
              }
            >
              <Select
                id="account-role"
                name="role"
                defaultValue={role}
                disabled={isSelf}
                onChange={(e) => setPendingRole(e.target.value)}
              >
                <option value={ROLES.TRAINER}>Trainer</option>
                <option value={ROLES.CLIENT}>Client</option>
              </Select>
            </Field>

            {pendingRole === ROLES.CLIENT ? (
              <Field
                label="Coached by"
                htmlFor="account-trainer"
                hint="Moves them onto that trainer's roster. Their existing workouts stay as they are."
              >
                <Select
                  id="account-trainer"
                  name="trainerId"
                  defaultValue={trainerId ?? ""}
                >
                  <option value="">No trainer</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.email}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className={buttonClass("outline")}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">
            {isOwner
              ? "This is an owner account. Only another owner can edit it."
              : "This is an admin account. Only an owner can edit it."}
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Access</h2>

        <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
          Currently
          {isOwner ? (
            <Badge tone="amber">Owner</Badge>
          ) : isAdmin ? (
            <Badge tone="jade">Admin</Badge>
          ) : (
            <Badge tone="neutral">No admin access</Badge>
          )}
        </p>

        {isOwner ? (
          <p className="mt-3 text-sm text-ink-soft">
            Owners are named in the <span className="metric">ADMIN_EMAILS</span>{" "}
            environment variable, so this can&rsquo;t be changed from here — that
            is the point of it. Edit the variable and redeploy.
          </p>
        ) : !actorIsOwner ? (
          <p className="mt-3 text-sm text-ink-soft">
            Only an owner can give or take away admin access.
          </p>
        ) : isSelf ? (
          <p className="mt-3 text-sm text-ink-soft">
            This is the account you&rsquo;re signed in as.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-soft">
              {isAdmin
                ? "They can see every account, the sign-in log, and reset passwords on ordinary accounts. They can't promote anyone or touch another admin."
                : role === ROLES.TRAINER
                  ? "Lets them manage accounts the way you do — everything except granting this to someone else."
                  : "Only trainer accounts can be given admin access."}
            </p>

            <form action={accessAction} className="mt-4 flex flex-col gap-4">
              <FormError>{access.error}</FormError>
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="grant" value={isAdmin ? "0" : "1"} />
              <button
                type="submit"
                disabled={changingAccess || (!isAdmin && role !== ROLES.TRAINER)}
                className={buttonClass(isAdmin ? "outline" : "primary")}
              >
                {changingAccess
                  ? "Saving…"
                  : isAdmin
                    ? "Revoke admin access"
                    : "Make admin"}
              </button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
