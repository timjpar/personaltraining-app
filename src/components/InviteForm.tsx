"use client";

import { useActionState, type ReactNode } from "react";
import { Card, Field, Input, FormError, buttonClass } from "@/components/ui";

// Making an account for somebody else — the only way anyone gets in now that
// the app is invite-only. Two callers: an admin creating a coach, and a coach
// creating a client.
//
// One component rather than two nearly identical ones, because the interesting
// half is identical and easy to get subtly wrong in a copy: an account has been
// written, a password exists in exactly one place, and the person who pressed
// the button is the delivery mechanism if the email didn't land. That screen —
// what it says when the mail went out, what it says when it didn't, and the
// fact that it shows the password either way — is the same in both cases and
// should stay that way.
//
// What differs is the wording and the extra fields, which is what `noun` and
// `children` are for. The client form adds a stage picker through the slot; the
// coach form passes nothing.
export type InviteState = {
  error?: string;
  // `emailed` false means the account exists but nothing reached them — mail
  // isn't configured, or the send failed. The password below is then the only
  // way in, so the card keeps showing it either way.
  created?: {
    name: string;
    email: string;
    password: string;
    emailed: boolean;
  };
};

const initial: InviteState = {};

export function InviteForm({
  action,
  noun,
  title,
  blurb,
  namePlaceholder,
  emailPlaceholder,
  idPrefix,
  children,
  blocked,
}: {
  action: (prev: InviteState, formData: FormData) => Promise<InviteState>;
  // "client" or "coach", lowercase — it lands mid-sentence in the button and
  // the success card.
  noun: string;
  title: string;
  blurb: ReactNode;
  namePlaceholder: string;
  emailPlaceholder: string;
  // Keeps the field ids unique when two of these are ever on one page.
  idPrefix: string;
  children?: ReactNode;
  // Why the form isn't available — a coach at their roster limit. Rendered in
  // place of the fields: a form that posts only to be refused is worse than one
  // that says up front why it isn't there.
  blocked?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  if (state.created) {
    const firstName = state.created.name.split(/\s+/)[0];
    return (
      <Card className="p-5">
        <p className="eyebrow text-jade-strong">Account created</p>
        <h2 className="mt-2 font-display text-lg font-semibold text-ink">
          {state.created.emailed
            ? `Sent to ${firstName}`
            : `Share these with ${firstName}`}
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

        {/* A reload rather than resetting the state, and deliberately so: the
            page around this form counts what was just created — a roster
            allowance, an account list — and clearing the card in place would
            leave every one of those numbers one behind. */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={buttonClass("outline") + " mt-4 w-full"}
        >
          Add another {noun}
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-1 text-sm text-ink-soft">{blurb}</div>

      {blocked ? (
        <div className="mt-4 rounded-[var(--radius-sm)] border border-amber/25 bg-amber-wash px-3.5 py-3 text-sm text-amber">
          {blocked}
        </div>
      ) : (
        <form action={formAction} className="mt-4 flex flex-col gap-4">
          <FormError>{state.error}</FormError>

          <Field label="Name" htmlFor={`${idPrefix}-name`}>
            <Input
              id={`${idPrefix}-name`}
              name="name"
              placeholder={namePlaceholder}
              required
            />
          </Field>

          <Field label="Email" htmlFor={`${idPrefix}-email`}>
            <Input
              id={`${idPrefix}-email`}
              name="email"
              type="email"
              placeholder={emailPlaceholder}
              required
            />
          </Field>

          {children}

          <Field
            label="Password"
            htmlFor={`${idPrefix}-password`}
            hint="Leave blank to generate one automatically."
          >
            <Input
              id={`${idPrefix}-password`}
              name="password"
              type="text"
              placeholder="Auto-generate"
              minLength={8}
            />
          </Field>

          <button
            type="submit"
            disabled={pending}
            className={buttonClass("primary")}
          >
            {pending ? "Adding…" : `Add ${noun}`}
          </button>
        </form>
      )}
    </Card>
  );
}
