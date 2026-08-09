"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { lookupBarcode, scanFoodPhoto } from "@/app/(client)/my/nutrition/actions";
import { Input, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  CAMERA_UNAVAILABLE,
  closeCamera,
  createDetector,
  detectFrom,
  openCamera,
  supportsBarcodeScanning,
} from "@/lib/barcode";
import { fitWithin } from "@/lib/downscale";
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
  const [open, setOpen] = useState(false);
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
        setOpen(false);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [stop]);

  const finish = useCallback(
    (foods: FoodPreset[], source: FoodSource) => {
      onFoods(foods, source);
      stop();
      setOpen(false);
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
  const startScanning = useCallback(async () => {
    setMessage(null);
    setOpen(true);
    // Cleared before the await, not after: stop() can run while the permission
    // prompt is up, and setting the flag afterwards would overwrite the very
    // cancellation we need to see below.
    cancelledRef.current = false;

    const detector = createDetector();
    if (!detector) {
      setMessage(CAMERA_UNAVAILABLE);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await openCamera();
    } catch {
      // NotAllowedError, NotFoundError and NotReadableError all collapse to
      // one message plus the manual field below, which is already on screen.
      setMessage(CAMERA_UNAVAILABLE);
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
  }, [submitBarcode]);

  const onPhoto = (file: File) => {
    setMessage(null);
    startTransition(async () => {
      const blob = await fitWithin(file, MAX_EDGE, JPEG_QUALITY);
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
              if (open) {
                stop();
                setOpen(false);
              } else {
                startScanning();
              }
            }}
            disabled={pending}
            className={buttonClass("outline", "sm")}
          >
            {open ? "Stop camera" : "Scan barcode"}
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
          Photo of food
        </button>

        {pending ? (
          <span className="text-xs text-ink-soft">Reading…</span>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 overflow-hidden rounded-[var(--radius-sm)] border border-line bg-ink/5">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-48 w-full object-cover"
          />
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
