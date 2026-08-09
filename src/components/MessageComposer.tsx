"use client";

import { useActionState, useEffect, useRef } from "react";
import { Textarea, FormError, buttonClass } from "@/components/ui";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";

// The box at the bottom of a thread. One component for both roles: the action
// is passed in because a coach and an athlete post through different route
// groups, but what they're doing is the same thing and looks the same.
export type ComposerState = { error?: string; sentAt?: number };

export function MessageComposer({
  action,
  threadId,
  placeholder = "Write a message…",
}: {
  action: (state: ComposerState, formData: FormData) => Promise<ComposerState>;
  threadId: string;
  placeholder?: string;
}) {
  const [state, formAction, pending] = useActionState<ComposerState, FormData>(
    action,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the box once the message is actually away. Keyed on the nonce rather
  // than on "no error", which would also fire on first render and on a
  // rejected send.
  useEffect(() => {
    if (state.sentAt) formRef.current?.reset();
  }, [state.sentAt]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2.5">
      <FormError>{state.error}</FormError>
      <input type="hidden" name="threadId" value={threadId} />
      <Textarea
        name="body"
        rows={3}
        placeholder={placeholder}
        // A courtesy to whoever is typing. The real limit is enforced in the
        // action, which is the only side an attacker can't skip.
        maxLength={MAX_MESSAGE_LENGTH}
        required
        aria-label="Message"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className={buttonClass("primary")}
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
