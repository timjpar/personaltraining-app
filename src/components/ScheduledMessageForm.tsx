"use client";

import { useActionState, useState } from "react";
import {
  Avatar,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  FormError,
  buttonClass,
} from "@/components/ui";
import { formatTime } from "@/lib/calendar";
import {
  BROADCAST_AUDIENCES,
  MAX_MESSAGE_LENGTH,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  type BroadcastAudience,
} from "@/lib/constants";
import type { BroadcastState } from "@/app/(trainer)/messages/actions";
import type { StarterClient } from "@/components/ThreadStarter";

export type ScheduledMessage = {
  id: string;
  label: string;
  body: string;
  hour: number;
  weekdays: number[];
  audience: BroadcastAudience;
  alsoEmail: boolean;
  active: boolean;
  recipientIds: string[];
};

// Write once, send on a rhythm. The same form creates and edits — the only
// difference is a hidden id, which is also what the action keys on.
export function ScheduledMessageForm({
  action,
  clients,
  timeZone,
  existing,
}: {
  action: (state: BroadcastState, formData: FormData) => Promise<BroadcastState>;
  clients: StarterClient[];
  // The zone the hour below is in, so "7:00 AM" isn't ambiguous — the same
  // thing NotificationsCard says under the digest hour, and for the same
  // reason.
  timeZone: string;
  existing?: ScheduledMessage;
}) {
  const [state, formAction, pending] = useActionState<BroadcastState, FormData>(
    action,
    {},
  );

  // The one piece of controlled state: the picker below has to appear the
  // moment "Just some of them" is chosen, not after a save.
  const [audience, setAudience] = useState<BroadcastAudience>(
    existing?.audience ?? BROADCAST_AUDIENCES.ALL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormError>{state.error}</FormError>
      {state.ok ? (
        <p className="rounded-[var(--radius-sm)] border border-jade/25 bg-jade-wash px-3.5 py-2.5 text-sm text-jade-strong">
          {state.ok}
        </p>
      ) : null}

      {existing ? <input type="hidden" name="id" value={existing.id} /> : null}

      <Field
        label="Name"
        htmlFor="broadcast-label"
        hint="Just for your list — nobody else sees this."
      >
        <Input
          id="broadcast-label"
          name="label"
          placeholder="Monday kick-off"
          defaultValue={existing?.label ?? ""}
          maxLength={80}
          required
        />
      </Field>

      <Field
        label="Message"
        htmlFor="broadcast-body"
        hint="Goes out in your name, and lands in each athlete's thread so they can reply."
      >
        <Textarea
          id="broadcast-body"
          name="body"
          rows={5}
          placeholder="New week. Pick one session you're going to do properly and build the rest around it."
          defaultValue={existing?.body ?? ""}
          maxLength={MAX_MESSAGE_LENGTH}
          required
        />
      </Field>

      <div>
        <p className="eyebrow text-ink-soft">Days</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {WEEKDAY_ORDER.map((day) => (
            // A checkbox styled as a chip rather than seven rows: it's the
            // one control here where the whole week has to be readable at a
            // glance, and at 375px a column of seven would push everything
            // else off the screen.
            <label
              key={day}
              className="cursor-pointer select-none rounded-full border border-line bg-card px-3 py-1.5 text-sm text-ink-soft transition-colors has-checked:border-jade has-checked:bg-jade has-checked:text-white hover:bg-paper has-checked:hover:bg-jade"
            >
              <input
                type="checkbox"
                name="weekday"
                value={day}
                defaultChecked={existing?.weekdays.includes(day) ?? false}
                className="sr-only"
              />
              {WEEKDAY_LABELS[day]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Field label="Send at" htmlFor="broadcast-hour">
          <Select
            id="broadcast-hour"
            name="hour"
            defaultValue={String(existing?.hour ?? 7)}
            className="sm:max-w-40"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {/* formatTime takes minutes past midnight, the same helper the
                    calendar and the digest hour use. */}
                {formatTime(h * 60)}
              </option>
            ))}
          </Select>
        </Field>
        <p className="metric text-xs text-ink-soft">
          Times are {timeZone}. Delivery can be up to an hour late.
        </p>
      </div>

      <div>
        <p className="eyebrow text-ink-soft">Who gets it</p>
        <div className="mt-1.5 flex flex-col gap-2">
          <label className="flex items-start gap-3">
            <input
              type="radio"
              name="audience"
              value={BROADCAST_AUDIENCES.ALL}
              checked={audience === BROADCAST_AUDIENCES.ALL}
              onChange={() => setAudience(BROADCAST_AUDIENCES.ALL)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-jade"
            />
            <span className="text-sm text-ink">
              Everyone on my roster
              <span className="mt-0.5 block text-xs text-ink-soft">
                Including clients you add later.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="radio"
              name="audience"
              value={BROADCAST_AUDIENCES.PICKED}
              checked={audience === BROADCAST_AUDIENCES.PICKED}
              onChange={() => setAudience(BROADCAST_AUDIENCES.PICKED)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-jade"
            />
            <span className="text-sm text-ink">Just some of them</span>
          </label>
        </div>

        {audience === BROADCAST_AUDIENCES.PICKED ? (
          <Card className="mt-2 p-2">
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
                    defaultChecked={existing?.recipientIds.includes(client.id)}
                    className="h-4 w-4 accent-jade"
                  />
                  <Avatar
                    name={client.name}
                    src={client.avatar}
                    className="h-7 w-7"
                  />
                  <span className="truncate text-sm text-ink">
                    {client.name}
                  </span>
                </label>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="alsoEmail"
          defaultChecked={existing?.alsoEmail ?? true}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-jade)]"
        />
        <span className="text-sm text-ink">
          Email it as well
          <span className="mt-0.5 block text-xs text-ink-soft">
            It always lands in the thread. This puts a copy in their inbox too.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="active"
          defaultChecked={existing?.active ?? true}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-jade)]"
        />
        <span className="text-sm text-ink">
          Sending
          <span className="mt-0.5 block text-xs text-ink-soft">
            Untick to pause it without losing what you wrote.
          </span>
        </span>
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className={buttonClass("primary")}
        >
          {pending ? "Saving…" : existing ? "Save changes" : "Schedule it"}
        </button>
      </div>
    </form>
  );
}
