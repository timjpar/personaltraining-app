"use client";

import { useState, useTransition } from "react";
import {
  saveProfilePhoto,
  removeProfilePhoto,
  type PhotoState,
} from "@/app/profile-photo-actions";
import { Avatar, Card, FormError, buttonClass } from "@/components/ui";
import { squareCrop } from "@/lib/downscale";
import { PHOTO_EDGE, PHOTO_QUALITY } from "@/lib/avatar";
import { cn } from "@/lib/cn";

// Your own photo, on the page you already live on rather than a settings
// screen — the call NotificationsCard and GoogleCalendarCard both make, and the
// reason this renders on /dashboard for a coach and /my for an athlete. Down at
// the bottom with the other once-in-a-while controls, where nothing it does
// pushes the day's actual work further down the page.

// Rendered from the resized blob, so it's what the server is about to be sent
// and not what came off the camera roll.
function sizeLabel(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ProfilePhotoCard({
  name,
  photoUrl,
}: {
  name: string;
  // Null when there's no photo yet; see avatarUrl().
  photoUrl: string | null;
}) {
  const [state, setState] = useState<PhotoState>({});
  const [pending, startTransition] = useTransition();

  // What the file input just produced, shown until the page re-renders with the
  // saved one. Without it the avatar wouldn't visibly change on this page: the
  // photo URL is versioned and the new version only arrives with the refresh.
  const [preview, setPreview] = useState<string | null>(null);

  const onPick = (file: File) => {
    setState({});
    startTransition(async () => {
      let blob: Blob;
      try {
        blob = await squareCrop(file, PHOTO_EDGE, PHOTO_QUALITY);
      } catch {
        // createImageBitmap rejects on anything that isn't a decodable image,
        // which is the honest place to catch "they picked a PDF".
        setState({ error: "We couldn't read that image. Try another one." });
        return;
      }

      const body = new FormData();
      body.append("photo", blob, "photo");
      const result = await saveProfilePhoto(body);

      if (result.ok) {
        setPreview(URL.createObjectURL(blob));
      }
      setState(result);
    });
  };

  const onRemove = () => {
    setState({});
    startTransition(async () => {
      setPreview(null);
      setState(await removeProfilePhoto());
    });
  };

  const shown = preview ?? photoUrl;

  return (
    <Card className="p-5">
      <h2 className="font-display text-base font-semibold text-ink">
        Profile photo
      </h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        Shown next to your name wherever you appear. Optional — your initials
        work fine.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <Avatar name={name} src={shown} className="h-16 w-16 text-lg" />

        <div className="flex min-w-0 flex-col items-start gap-2">
          {/* A label styled as the button, with the input itself visually
              hidden. A bare file input can't be styled to match anything else
              on the page, and wrapping it in a real <button> would need a
              click-forwarding ref for no gain. */}
          <label
            className={cn(buttonClass("outline", "sm"), pending && "opacity-60")}
          >
            {shown ? "Change photo" : "Upload a photo"}
            <input
              type="file"
              accept="image/*"
              disabled={pending}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Cleared so picking the same file twice still fires a change,
                // which is how someone retries after an error.
                e.target.value = "";
                if (file) onPick(file);
              }}
            />
          </label>

          {shown ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink disabled:opacity-60"
            >
              Remove photo
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <FormError>{state.error}</FormError>
        {state.ok ? (
          <p className="text-sm text-ink-soft">
            {state.ok}
            {/* The size is on show because "will this eat my storage" is the
                first question anyone sensible asks. Answering it with the real
                number beats promising it's small. */}
            {state.bytes ? ` Stored at ${sizeLabel(state.bytes)}.` : null}
          </p>
        ) : null}
        <p className="text-xs text-ink-soft">
          Photos are cropped square and shrunk to {PHOTO_EDGE}px in your browser
          before they&rsquo;re sent, so a full-size camera shot is fine to pick.
        </p>
      </div>
    </Card>
  );
}
