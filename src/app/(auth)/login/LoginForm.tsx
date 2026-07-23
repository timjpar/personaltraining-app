"use client";

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

      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
