"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { lookupBarcode, scanFoodPhoto } from "@/app/food-scan-actions";
import { Input, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  CAMERA_UNAVAILABLE,
  closeCamera,
  createDetector,
  detectFrom,
  openCamera,
  PHOTO_CAMERA_UNAVAILABLE,
  supportsBarcodeScanning,
  supportsInPageCamera,
  watchPointer,
} from "@/lib/barcode";
import { fitWithin, frameToBlob } from "@/lib/downscale";
import type { FoodPreset } from "@/lib/food-presets";
import { FOOD_SOURCE, type FoodSource } from "@/lib/constants";

// The long edge a photo is resized to before it's sent. Enough for the model to
// read a nutrition label, small enough that the POST stays well inside the
// default 1MB server-action body limit — which is the reason to resize here
// rather than raise serverActions.bodySizeLimit, since that would raise it for
// every action in the app including the workout log.
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.7;

export function FoodScanner({
  onFoods,
  photoEnabled,
}: {
  // Scanned foods, shaped as presets so the caller adds them exactly as it
  // would a catalog pick. The source rides along because it's the only record
  // of how a row got its numbers once it's saved.
  onFoods: (foods: FoodPreset[], source: FoodSource) => void;
  // The server read GEMINI_API_KEY; a client component can't.
  photoEnabled: boolean;
}) {
  // One camera, two jobs. The stream, the <video> and the teardown are shared;
  // all that differs is whether frames are fed to a barcode detector or waiting
  // for the athlete to press the shutter. A single nullable mode rather than
  // two booleans, because "both open at once" isn't a state that exists.
  const [camera, setCamera] = useState<"barcode" | "photo" | null>(null);
  const [canScan, setCanScan] = useState(false);
  const [manual, setManual] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // The capability check is async, so the button can't be gated inline. Gating
  // on the resolved value means it simply doesn't render where it can't work,
  // rather than appearing and then failing.
  useEffect(() => {
    let alive = true;
    supportsBarcodeScanning().then((ok) => {
      if (alive) setCanScan(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Not an effect, because this one is a value the browser already knows and
  // can change its mind about — false on the server, read on the client, and
  // re-read if a pointer is plugged in.
  const canShoot = useSyncExternalStore(
    watchPointer,
    supportsInPageCamera,
    () => false,
  );

  const stop = useCallback(() => {
    cancelledRef.current = true;
    closeCamera(streamRef.current, videoRef.current);
    streamRef.current = null;
  }, []);

  // Unmount is the teardown that gets forgotten, and it's the one that leaves
  // the camera light on.
  useEffect(() => stop, [stop]);

  // Backgrounding the tab should release the camera too — a scanner still
  // holding it while the athlete answers a message is indistinguishable from
  // one that's spying.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        stop();
        setCamera(null);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [stop]);

  const finish = useCallback(
    (foods: FoodPreset[], source: FoodSource) => {
      onFoods(foods, source);
      stop();
      setCamera(null);
      setManual("");
      setMessage(null);
    },
    [onFoods, stop],
  );

  const submitBarcode = useCallback(
    (code: string) => {
      startTransition(async () => {
        const result = await lookupBarcode(code);
        if (result.foods?.length) finish(result.foods, FOOD_SOURCE.BARCODE);
        else setMessage(result.error ?? "We couldn't find that barcode.");
      });
    },
    [finish],
  );

  // Never on mount — always behind a tap. An app that opens the camera as a
  // page loads is one nobody trusts twice.
  const startCamera = useCallback(
    async (mode: "barcode" | "photo") => {
      setMessage(null);
      // Switching straight from one job to the other has to release the first
      // stream, or the second getUserMedia contends with a camera we still hold.
      stop();
      setCamera(mode);
      // Cleared before the await, not after: stop() can run while the permission
      // prompt is up, and setting the flag afterwards would overwrite the very
      // cancellation we need to see below.
      cancelledRef.current = false;

      // Built before the camera opens, so a browser that could never decode a
      // barcode says so instead of asking for permission first and then failing.
      const detector = mode === "barcode" ? createDetector() : null;
      if (mode === "barcode" && !detector) {
        setMessage(CAMERA_UNAVAILABLE);
        setCamera(null);
        return;
      }

      let stream: MediaStream;
      try {
        stream = await openCamera();
      } catch {
        // NotAllowedError, NotFoundError and NotReadableError all collapse to
        // one message. Which one depends on where you were headed: the barcode
        // path can point at the number field below, the photo path can't.
        setMessage(
          mode === "barcode" ? CAMERA_UNAVAILABLE : PHOTO_CAMERA_UNAVAILABLE,
        );
        setCamera(null);
        return;
      }

      // Closed, unmounted or backgrounded while the prompt was up — the stream
      // we've just been granted has to be released or the light stays on.
      const video = videoRef.current;
      if (cancelledRef.current || !video) {
        closeCamera(stream, null);
        return;
      }

      streamRef.current = stream;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        /* autoplay can reject; the frames still arrive once it settles */
      }

      // Photo mode is done here: the stream is on screen and the next move is the
      // athlete's. Everything below is the barcode loop.
      if (!detector) return;

      // requestAnimationFrame rather than setInterval: it pauses when the tab is
      // backgrounded, so the loop stops costing anything for free.
      const tick = async () => {
        if (cancelledRef.current) return;
        try {
          const code = await detectFrom(detector, video);
          if (code) {
            cancelledRef.current = true;
            submitBarcode(code);
            return;
          }
        } catch {
          // Transient per-frame failures are normal; one bad frame must not kill
          // the scanner.
        }
        if (!cancelledRef.current) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    [stop, submitBarcode],
  );

  // Shared by the file picker and the shutter. By the time a photo reaches
  // here it is already a JPEG inside MAX_EDGE, and where it came from has
  // stopped mattering.
  const sendPhoto = useCallback(
    async (blob: Blob) => {
      const body = new FormData();
      body.append("photo", blob, "photo.jpg");
      const result = await scanFoodPhoto(body);
      if (result.foods?.length) {
        finish(result.foods, FOOD_SOURCE.PHOTO);
        if (result.unsure) {
          setMessage("Added — these are estimates, so check the numbers.");
        }
      } else {
        setMessage(result.error ?? "We couldn't read that photo.");
      }
    },
    [finish],
  );

  const onPhoto = (file: File) => {
    setMessage(null);
    startTransition(async () => {
      await sendPhoto(await fitWithin(file, MAX_EDGE, JPEG_QUALITY));
    });
  };

  // The shutter. Grabs the frame that's already on screen rather than asking
  // the camera for a fresh one — ImageCapture.takePhoto() would be the better
  // picture and Safari doesn't have it, and a still off the preview is what
  // Gemini gets from the phone path anyway.
  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    setMessage(null);
    startTransition(async () => {
      let blob: Blob;
      try {
        blob = await frameToBlob(video, MAX_EDGE, JPEG_QUALITY);
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : "We couldn't take that picture.",
        );
        return;
      }
      await sendPhoto(blob);
    });
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Its own line on a phone. Inline, the label eats enough of a 375px
            row to push the second button onto a line of its own, which reads
            as two unrelated controls rather than a pair. */}
        <span className="eyebrow basis-full text-ink-soft sm:basis-auto">
          Add by scanning
        </span>

        {canScan ? (
          <button
            type="button"
            onClick={() => {
              if (camera === "barcode") {
                stop();
                setCamera(null);
              } else {
                startCamera("barcode");
              }
            }}
            disabled={pending}
            className={buttonClass("outline", "sm")}
          >
            {camera === "barcode" ? "Stop camera" : "Scan barcode"}
          </button>
        ) : null}

        {/* Only where the file input wouldn't already do this — see
            supportsInPageCamera. A phone has no need of it: the input below
            hands you the camera app, which takes a better picture of a
            nutrition label than a <video> frame can. A laptop ignores that
            attribute and drops you in a file browser, which is no help at all
            when the food is in front of you and the photo doesn't exist yet. */}
        {canShoot ? (
          <button
            type="button"
            onClick={() => {
              if (camera === "photo") {
                stop();
                setCamera(null);
              } else if (!photoEnabled) {
                setMessage("Photo scanning isn't set up on this server.");
              } else {
                startCamera("photo");
              }
            }}
            disabled={pending}
            className={cn(
              buttonClass("outline", "sm"),
              !photoEnabled && "opacity-60",
            )}
          >
            {camera === "photo" ? "Close camera" : "Take a photo"}
          </button>
        ) : null}

        {/* capture="environment" opens the camera directly on a phone with no
            getUserMedia involved, which is what keeps the photo path working
            on iOS where BarcodeDetector doesn't exist. */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset first: picking the same file twice must fire again.
            e.target.value = "";
            if (file) onPhoto(file);
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!photoEnabled) {
              setMessage("Photo scanning isn't set up on this server.");
              return;
            }
            fileRef.current?.click();
          }}
          disabled={pending}
          // Rendered even when the key is missing, and says so when pressed —
          // the position GoogleCalendarCard takes. A button that isn't there
          // makes a missing environment variable look like missing code.
          className={cn(
            buttonClass("outline", "sm"),
            !photoEnabled && "opacity-60",
          )}
        >
          {/* Named for what it does on the device you're holding. Beside a
              "Take a photo" button, "Photo of food" would be two buttons
              claiming the same job; on a phone, where it *is* the camera,
              "Upload" would describe the wrong half of what happens. */}
          {canShoot ? "Upload a photo" : "Photo of food"}
        </button>

        {pending ? (
          <span className="text-xs text-ink-soft">Reading…</span>
        ) : null}
      </div>

      {camera ? (
        <div className="mt-3 overflow-hidden rounded-[var(--radius-sm)] border border-line bg-ink/5">
          {/* Cropped while scanning, whole while shooting. The detector reads
              the video element itself, so what the preview crops there costs
              nothing — but the shutter encodes the full frame, and a preview
              that hid its edges would take a picture nobody had seen. */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn(
              "w-full",
              camera === "photo" ? "h-64 object-contain" : "h-48 object-cover",
            )}
          />
          {camera === "photo" ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-card px-3 py-2">
              <span className="text-xs text-ink-soft">
                Fill the frame with the plate — or the label, if it has one.
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
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="eyebrow text-ink-soft/70">Or type the barcode</span>
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            placeholder="5449000000996"
            className="metric bg-card text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // The scanner lives inside the log form; Enter here must look
                // up a barcode, not submit the day.
                e.preventDefault();
                if (manual.trim()) submitBarcode(manual.trim());
              }
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => manual.trim() && submitBarcode(manual.trim())}
          disabled={pending || !manual.trim()}
          className={buttonClass("outline", "sm")}
        >
          Look up
        </button>
      </div>

      {message ? (
        <p className="mt-2 text-xs text-ink-soft">{message}</p>
      ) : (
        <p className="mt-2 text-xs text-ink-soft/70">
          Scanned numbers are a starting point — check them before you save.
          {photoEnabled
            ? " Photos are sent to Google to be read and aren't stored by us."
            : ""}
        </p>
      )}
    </div>
  );
}
