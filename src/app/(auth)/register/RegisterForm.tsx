"use client";

import { useActionState } from "react";
import { register, type AuthState } from "../actions";
import { Field, Input, FormError, buttonClass } from "@/components/ui";

const initial: AuthState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormError>{state.error}</FormError>

      <Field label="Your name" htmlFor="name">
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Alex Rivera"
          required
        />
      </Field>

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

      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          required
        />
      </Field>

      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Creating your workspace…" : "Create trainer account"}
      </button>
    </form>
  );
}
