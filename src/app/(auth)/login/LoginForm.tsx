"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthState } from "../actions";
import { Field, Input, FormError, buttonClass } from "@/components/ui";

const initial: AuthState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormError>{state.error}</FormError>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@gym.com"
          required
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </Field>
        {/* Below the field rather than beside its label: the label row is an
            eyebrow, and hanging a link off it puts a tap target inside the
            <label>, where a thumb aiming for it focuses the input instead. */}
        <Link
          href="/forgot"
          className="self-start text-xs text-ink-soft hover:text-jade-strong hover:underline"
        >
          Forgot your password?
        </Link>
      </div>

      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
