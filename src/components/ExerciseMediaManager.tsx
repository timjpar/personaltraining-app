"use client";

import { useActionState } from "react";
import {
  setExerciseMediaLink,
  removeExerciseMedia,
  type MediaFormState,
} from "@/app/(shared)/exercises/actions";
import { ExercisePicker } from "@/components/ExercisePicker";
import { VideoEmbed } from "@/components/VideoEmbed";
import { Card, Input, Field, FormError, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { PickerCatalog } from "@/lib/exercise-catalog";
import { parseVideoUrl } from "@/lib/video-embed";

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

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <h2 className="font-display text-base font-semibold text-ink">
          Add a demo
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Paste a video link and it plays inside Chalkline. Works with YouTube,
          Instagram, Facebook and TikTok. Nothing is copied or stored — the video
          stays where you posted it, so this costs you no storage.
        </p>

        <form action={linkAction} className="mt-4 flex flex-col gap-3">
          <Field label="Exercise">
            <ExercisePicker
              name="name"
              catalog={catalog}
              placeholder="Search any exercise"
            />
          </Field>

          <Field
            label="Video link"
            hint="e.g. youtube.com/watch?v=… · instagram.com/reel/… · tiktok.com/@you/video/… · facebook.com/…/videos/…"
          >
            <div className="flex gap-2">
              <Input name="url" placeholder="https://…" className="flex-1" />
              <button
                type="submit"
                disabled={linkPending}
                className={buttonClass("outline")}
              >
                {linkPending ? "Saving…" : "Add"}
              </button>
            </div>
          </Field>

          <FormError>{linkState.error}</FormError>
          {linkState.ok ? (
            <p className="text-sm text-jade-strong">{linkState.ok}</p>
          ) : null}
        </form>
      </Card>

      {rows.length > 0 ? (
        <Card>
          <ul className="divide-y divide-line">
            {rows.map((row) => {
              const video = parseVideoUrl(row.mediaUrl);
              return (
                <li key={row.id} className="px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{row.name}</p>
                      <p className="metric text-xs text-ink-soft">
                        {video.embedUrl
                          ? `${video.label} · plays in-app`
                          : "Link only — this URL can't be embedded"}
                      </p>
                    </div>
                    <a
                      href={row.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonClass("ghost", "sm"))}
                    >
                      Open ↗
                    </a>
                    <form action={removeExerciseMedia.bind(null, row.id)}>
                      <button type="submit" className={buttonClass("danger", "sm")}>
                        Remove
                      </button>
                    </form>
                  </div>
                  {/* Lets the coach confirm the embed works before a client
                      hits it mid-session. */}
                  <VideoEmbed url={row.mediaUrl} name={row.name} />
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
