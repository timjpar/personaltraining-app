"use client";

import { useActionState } from "react";
import { addClient, type AddClientState } from "./actions";
import { Card, Field, Input, FormError, buttonClass } from "@/components/ui";

const initial: AddClientState = {};

export function AddClientForm() {
  const [state, action, pending] = useActionState(addClient, initial);

  if (state.created) {
    return (
      <Card className="p-5">
        <p className="eyebrow text-jade-strong">Client added</p>
        <h2 className="mt-2 font-display text-lg font-semibold text-ink">
          {state.created.emailed
            ? `Sent to ${state.created.name}`
            : `Share these with ${state.created.name}`}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {state.created.emailed
            ? `We emailed these sign-in details to ${state.created.email}. Here they are as well, in case it doesn't arrive.`
            : "They sign in at the same site with this email and password."}
        </p>

        <dl className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-line bg-paper px-3.5 py-2.5">
            <dt className="eyebrow text-ink-soft">Email</dt>
            <dd className="metric text-sm text-ink">{state.created.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-line bg-paper px-3.5 py-2.5">
            <dt className="eyebrow text-ink-soft">Password</dt>
            <dd className="metric text-sm text-ink">{state.created.password}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className={buttonClass("outline") + " mt-4 w-full"}
        >
          Add another client
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-ink">Add a client</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Create their account. You&rsquo;ll get a password to pass along.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-4">
        <FormError>{state.error}</FormError>

        <Field label="Name" htmlFor="c-name">
          <Input id="c-name" name="name" placeholder="Maria Lopez" required />
        </Field>

        <Field label="Email" htmlFor="c-email">
          <Input
            id="c-email"
            name="email"
            type="email"
            placeholder="maria@example.com"
            required
          />
        </Field>

        <Field
          label="Password"
          htmlFor="c-password"
          hint="Leave blank to generate one automatically."
        >
          <Input
            id="c-password"
            name="password"
            type="text"
            placeholder="Auto-generate"
            minLength={8}
          />
        </Field>

        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Adding…" : "Add client"}
        </button>
      </form>
    </Card>
  );
}
