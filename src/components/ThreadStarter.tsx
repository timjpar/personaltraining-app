"use client";

import { useActionState, useState } from "react";
import {
  Avatar,
  Card,
  Field,
  Input,
  Textarea,
  FormError,
  buttonClass,
} from "@/components/ui";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";
import type { StartThreadState } from "@/app/(trainer)/messages/actions";

export type StarterClient = {
  id: string;
  name: string;
  avatar: string | null;
};

// Picking who a new conversation is with. Deliberately not two screens ("chat"
// vs "group"): a coach doesn't decide which kind of thread they want, they
// decide who they're talking to, and the kind falls out of how many people
// they tick. The name field and the privacy note appear once that answer is
// more than one.
export function ThreadStarter({
  action,
  clients,
}: {
  action: (
    state: StartThreadState,
    formData: FormData,
  ) => Promise<StartThreadState>;
  clients: StarterClient[];
}) {
  const [state, formAction, pending] = useActionState<
    StartThreadState,
    FormData
  >(action, {});
  const [picked, setPicked] = useState<string[]>([]);

  const isGroup = picked.length > 1;

  function toggle(id: string, on: boolean) {
    setPicked((current) =>
      on ? [...current, id] : current.filter((c) => c !== id),
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormError>{state.error}</FormError>

      <div>
        <p className="eyebrow text-ink-soft">Who it&rsquo;s with</p>
        <Card className="mt-1.5 p-2">
          <div className="grid gap-1 sm:grid-cols-2">
            {clients.map((client) => (
              <label
                key={client.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 transition-colors hover:bg-paper"
              >
                <input
                  type="checkbox"
                  name="clientId"
                  value={client.id}
                  onChange={(e) => toggle(client.id, e.target.checked)}
                  className="h-4 w-4 accent-jade"
                />
                <Avatar
                  name={client.name}
                  src={client.avatar}
                  className="h-7 w-7"
                />
                <span className="truncate text-sm text-ink">{client.name}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      {isGroup ? (
        <>
          <Field
            label="Group name"
            htmlFor="thread-title"
            hint="What everyone in it will see this conversation called."
          >
            <Input
              id="thread-title"
              name="title"
              placeholder="Tuesday squad"
              maxLength={80}
              required
            />
          </Field>

          {/* Said plainly, and only when it applies. A coach picking three
              names is not necessarily thinking about the fact that those three
              are about to see each other's replies — and two athletes who
              compete against each other is the case where finding out
              afterwards is a real problem. */}
          <p className="rounded-[var(--radius-sm)] border border-amber/25 bg-amber-wash px-3.5 py-2.5 text-sm text-ink">
            Everyone in a group sees the others&rsquo; names and replies. For
            something private, send it to one person at a time.
          </p>
        </>
      ) : null}

      <Field label="First message" hint="Optional — you can just open the thread.">
        <Textarea
          name="body"
          rows={4}
          placeholder="How did the week land?"
          maxLength={MAX_MESSAGE_LENGTH}
        />
      </Field>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className={buttonClass("primary")}
        >
          {pending ? "Starting…" : isGroup ? "Start group" : "Start conversation"}
        </button>
      </div>
    </form>
  );
}
