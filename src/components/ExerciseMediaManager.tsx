"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import {
  setExerciseMediaLink,
  attachUploadedMedia,
  removeExerciseMedia,
  type MediaFormState,
} from "@/app/(trainer)/exercises/actions";
import { ExercisePicker } from "@/components/ExercisePicker";
import { Card, Input, Field, FormError, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { PickerCatalog } from "@/lib/exercise-catalog";

export type MediaRow = {
  id: string;
  name: string;
  mediaUrl: string;
  mediaKind: string;
};

export function ExerciseMediaManager({
  catalog,
  rows,
}: {
  catalog: PickerCatalog;
  rows: MediaRow[];
}) {
  const [linkState, linkAction, linkPending] = useActionState<MediaFormState, FormData>(
    setExerciseMediaLink,
    {},
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const nameRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // The picker owns its own <input name="name">; read it out of the DOM rather
  // than duplicating its state here.
  const currentName = () =>
    (nameRef.current?.querySelector('input[name="name"]') as HTMLInputElement | null)
      ?.value.trim() ?? "";

  const onFile = async (file: File) => {
    const name = currentName();
    if (!name) {
      setUploadError("Pick an exercise before choosing a file.");
      return;
    }
    setUploadError(null);
    setProgress(0);
    try {
      // Goes browser → Blob directly. The route handler only mints a token,
      // so the file never passes through a serverless function's body limit.
      const blob = await upload(`exercise-media/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/exercise-media",
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      startTransition(async () => {
        await attachUploadedMedia(name, blob.url);
        setProgress(null);
        if (fileRef.current) fileRef.current.value = "";
      });
    } catch (err) {
      setProgress(null);
      setUploadError(
        (err as Error).message.includes("BLOB_READ_WRITE_TOKEN")
          ? "Blob storage isn't configured yet — add BLOB_READ_WRITE_TOKEN."
          : (err as Error).message,
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <h2 className="font-display text-base font-semibold text-ink">
          Add a demo
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Attach your own video to any movement — including the built-in ones.
          Your clients see it instead of a generic search link.
        </p>

        <form action={linkAction} className="mt-4 flex flex-col gap-3">
          <div ref={nameRef}>
            <Field label="Exercise">
              <ExercisePicker
                name="name"
                catalog={catalog}
                placeholder="Search any exercise"
              />
            </Field>
          </div>

          <Field label="Paste a link" hint="A YouTube, Vimeo or Drive URL.">
            <div className="flex gap-2">
              <Input name="url" placeholder="https://…" className="flex-1" />
              <button
                type="submit"
                disabled={linkPending}
                className={buttonClass("outline")}
              >
                {linkPending ? "Saving…" : "Link"}
              </button>
            </div>
          </Field>

          <FormError>{linkState.error}</FormError>
          {linkState.ok ? (
            <p className="text-sm text-jade-strong">{linkState.ok}</p>
          ) : null}
        </form>

        <div className="mt-4 border-t border-line pt-4">
          <span className="eyebrow text-ink-soft">Or upload a file</span>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
            className="mt-2 block w-full text-sm text-ink-soft file:mr-3 file:rounded-[var(--radius-sm)] file:border file:border-line file:bg-card file:px-3.5 file:py-2 file:text-sm file:text-ink hover:file:bg-paper"
          />
          {progress !== null ? (
            <p className="metric mt-2 text-xs text-ink-soft">Uploading… {progress}%</p>
          ) : null}
          <FormError>{uploadError}</FormError>
        </div>
      </Card>

      {rows.length > 0 ? (
        <Card>
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{row.name}</p>
                  <p className="metric text-xs text-ink-soft">
                    {row.mediaKind === "UPLOAD" ? "Uploaded video" : "Linked demo"}
                  </p>
                </div>
                <a
                  href={row.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonClass("ghost", "sm"))}
                >
                  View ↗
                </a>
                <form action={removeExerciseMedia.bind(null, row.id)}>
                  <button type="submit" className={buttonClass("danger", "sm")}>
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
