"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ProgramFormState } from "@/app/(trainer)/programs/actions";
import {
  Card,
  Field,
  Input,
  Textarea,
  Select,
  FormError,
  buttonClass,
} from "@/components/ui";
import { PROGRAM_DAYS, dayLabel } from "@/lib/constants";

type TemplateOption = { id: string; title: string };

type Initial = {
  title?: string;
  notes?: string | null;
  weeks?: number;
  slots?: { week: number; day: number; templateId: string }[];
};

export function ProgramBuilder({
  action,
  submitLabel,
  cancelHref,
  templates,
  initial,
}: {
  action: (state: ProgramFormState, formData: FormData) => Promise<ProgramFormState>;
  submitLabel: string;
  cancelHref: string;
  templates: TemplateOption[];
  initial?: Initial;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [weeks, setWeeks] = useState(initial?.weeks ?? 4);

  // week-day -> templateId, for prefilling the grid on edit.
  const slotMap = new Map<string, string>();
  initial?.slots?.forEach((s) => slotMap.set(`${s.week}-${s.day}`, s.templateId));

  if (templates.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="font-display text-lg text-ink">Save a workout first</p>
        <p className="max-w-sm text-sm text-ink-soft">
          Programs are built from your saved workouts. Create one in the library,
          then come back to lay out the weeks.
        </p>
        <Link href="/library/new" className={buttonClass("primary", "sm")}>
          New workout
        </Link>
      </Card>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormError>{state.error}</FormError>

      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Program title" htmlFor="title">
            <Input
              id="title"
              name="title"
              placeholder="8-Week Hypertrophy"
              defaultValue={initial?.title ?? ""}
              required
            />
          </Field>
        </div>
        <Field label="Weeks" htmlFor="weeks">
          <Input
            id="weeks"
            name="weeks"
            type="number"
            min={1}
            max={16}
            value={weeks}
            onChange={(e) =>
              setWeeks(Math.max(1, Math.min(16, Number(e.target.value) || 1)))
            }
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              placeholder="Progression scheme, deload week, coaching cues…"
              defaultValue={initial?.notes ?? ""}
            />
          </Field>
        </div>
      </Card>

      <div className="flex flex-col gap-5">
        {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
          <div key={w}>
            <h2 className="mb-2 font-display text-base font-semibold text-ink">
              Week {w}
            </h2>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {PROGRAM_DAYS.map((d) => (
                <label key={d} className="flex flex-col gap-1">
                  <span className="eyebrow text-ink-soft/70">{dayLabel(d)}</span>
                  <Select
                    name={`slot_w${w}_d${d}`}
                    defaultValue={slotMap.get(`${w}-${d}`) ?? ""}
                    className="text-sm"
                  >
                    <option value="">Rest</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
