"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import type { PhotoState } from "@/app/profile-photo-actions";
import { Avatar, Card, FormError, buttonClass } from "@/components/ui";
import { squareCrop, squareCropFrame } from "@/lib/downscale";
import { supportsInPageCamera, watchPointer } from "@/lib/barcode";
import { useCamera } from "@/lib/use-camera";
import { PHOTO_EDGE, PHOTO_QUALITY } from "@/lib/avatar";

// A photo, the picker that replaces it and the button that clears it. Two
// callers with the same shape and different subjects:
//
//   your own  — on the page you already live on rather than a settings screen,
//               the call NotificationsCard and GoogleCalendarCard both make,
//               which is why it renders on /dashboard for a coach and /my for
//               an athlete. Down at the bottom with the other once-in-a-while
//               controls.
//   a client's — on their client page, where a coach who signed them up at a
//               desk can put a face on the file.
//
// The actions arrive as props rather than being imported here, and that is the
// whole design: this component never knows whose photo it is holding, so it has
// no permission decision it could get wrong. Its two callers do — one has a
// user id it proves it owns, the other refuses to accept an id at all.

// Rendered from the resized blob, so it's what the server is about to be sent
// and not what came off the camera roll.
function sizeLabel(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ProfilePhotoCard({
  name,
  photoUrl,
  save,
  remove,
  title = "Profile photo",
  blurb = "Shown next to your name wherever you appear. Optional — your initials work fine.",
}: {
  name: string;
  // Null when there's no photo yet; see avatarUrl().
  photoUrl: string | null;
  // Pre-bound by the caller when it needs to name a subject —
  // saveClientPhoto.bind(null, client.id). The signature stays FormData-only
  // so this component has nothing to pass but the photo.
  save: (formData: FormData) => Promise<PhotoState>;
  remove: () => Promise<PhotoState>;
  title?: string;
  blurb?: string;
}) {
  const [state, setState] = useState<PhotoState>({});
  const [pending, startTransition] = useTransition();

  // What the file input just produced, shown until the page re-renders with the
  // saved one. Without it the avatar wouldn't visibly change on this page: the
  // photo URL is versioned and the new version only arrives with the refresh.
  const [preview, setPreview] = useState<string | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const { videoRef, start, stop } = useCamera(() => setCameraOpen(false));

  // Whether "Take a photo" opens a camera here or hands off to the phone's.
  // Both buttons show either way; only the mechanism differs.
  const inPageCamera = useSyncExternalStore(
    watchPointer,
    supportsInPageCamera,
    () => false,
  );

  // Two inputs rather than one with a toggled attribute — `capture` is read
  // when the picker opens, so flipping it between clicks on a reused DOM node
  // is a race nobody can see.
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const libraryRef = useRef<HTMLInputElement | null>(null);

  // Everything past the crop is the same whichever way the photo arrived.
  const upload = async (blob: Blob) => {
    const body = new FormData();
    body.append("photo", blob, "photo");
    const result = await save(body);

    if (result.ok) {
      setPreview(URL.createObjectURL(blob));
      stop();
      setCameraOpen(false);
    }
    setState(result);
  };

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
      await upload(blob);
    });
  };

  const openCameraPanel = async () => {
    setState({});
    // Before the await, so the <video> is mounted by the time the permission
    // prompt resolves and the stream has somewhere to land.
    setCameraOpen(true);
    if (!(await start("user"))) {
      setState({ error: "We couldn't open the camera. Upload a photo instead." });
      setCameraOpen(false);
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    setState({});
    startTransition(async () => {
      let blob: Blob;
      try {
        blob = await squareCropFrame(video, PHOTO_EDGE, PHOTO_QUALITY);
      } catch (err) {
        setState({
          error:
            err instanceof Error
              ? err.message
              : "We couldn't take that picture.",
        });
        return;
      }
      await upload(blob);
    });
  };

  const onRemove = () => {
    setState({});
    startTransition(async () => {
      const result = await remove();
      // Only drop the local preview once the server agrees it's gone —
      // clearing it first made a failed removal look like it had worked.
      if (result.ok) setPreview(null);
      setState(result);
    });
  };

  const shown = preview ?? photoUrl;

  return (
    <Card className="p-5">
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 text-sm text-ink-soft">{blurb}</p>

      <div className="mt-4 flex items-center gap-4">
        <Avatar name={name} src={shown} className="h-16 w-16 text-lg" />

        <div className="flex min-w-0 flex-col items-start gap-2">
          {/* capture="user" points a phone at its front camera — this is a
              face, not a barcode. Desktop browsers ignore it, which is why the
              button falls through to the in-page camera there instead. */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Cleared so picking the same file twice still fires a change,
              // which is how someone retries after an error.
              e.target.value = "";
              if (file) onPick(file);
            }}
          />
          {/* No capture: always the library. */}
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onPick(file);
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (cameraOpen) {
                  stop();
                  setCameraOpen(false);
                } else if (inPageCamera) {
                  openCameraPanel();
                } else {
                  cameraRef.current?.click();
                }
              }}
              disabled={pending}
              className={buttonClass("outline", "sm")}
            >
              {cameraOpen ? "Close camera" : "Take a photo"}
            </button>

            <button
              type="button"
              onClick={() => libraryRef.current?.click()}
              disabled={pending}
              className={buttonClass("outline", "sm")}
            >
              {shown ? "Change photo" : "Upload a photo"}
            </button>
          </div>

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

      {/* The same preview-and-shutter the food scanner uses, so the one camera
          gesture in this app looks like itself wherever you meet it. */}
      {cameraOpen ? (
        <div className="mt-4 overflow-hidden rounded-[var(--radius-sm)] border border-line bg-ink/5">
          {/* object-contain, not cover: the shutter keeps the middle square of
              the *frame*, and a preview that cropped differently would hand
              back a photo nobody had seen. */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-64 w-full object-contain"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-card px-3 py-2">
            <span className="text-xs text-ink-soft">
              Only the middle square is kept.
            </span>
            <button
              type="button"
              onClick={takePhoto}
              disabled={pending}
              className={buttonClass("primary", "sm")}
            >
              Take the picture
            </button>
          </div>
        </div>
      ) : null}

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
