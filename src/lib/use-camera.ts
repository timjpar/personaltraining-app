"use client";

// The camera lifecycle both capture surfaces need, and neither should own.
//
// What's shared is not the interesting part — opening a stream is four lines —
// it's every path that has to close one. A camera left running lights an
// indicator on the device and reads as the app watching you, so "stop" has to
// survive the panel closing, the component unmounting, and the tab being
// backgrounded mid-shot. That was already three teardowns in the food scanner
// before the profile card wanted the same thing, and a second copy of it is how
// one of them quietly stops being called.
//
// What each caller keeps is what makes it different: the food scanner's barcode
// loop, the shutters, and every pixel of chrome around the preview.

import { useCallback, useEffect, useRef } from "react";
import { closeCamera, openCamera, type CameraFacing } from "./barcode";

// `onHidden` fires after the camera is released because the tab went away, so
// the caller can close whatever panel was showing the preview. Taken as an
// argument and kept in a ref refreshed by an effect — the standard latest-ref
// shape — so a caller can pass a fresh closure every render without the
// listener being torn down and rebound each time.
export function useCamera(onHidden?: () => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Set the moment anything asks the camera to close, and read again after
  // every await. getUserMedia's permission prompt sits open for as long as the
  // person ignores it, so whatever we do when it finally resolves has to ask
  // whether the surface that wanted it is still on screen.
  const cancelledRef = useRef(false);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    closeCamera(streamRef.current, videoRef.current);
    streamRef.current = null;
  }, []);

  // Unmount is the teardown that gets forgotten, and it's the one that leaves
  // the camera light on.
  useEffect(() => stop, [stop]);

  // Backgrounding the tab should release the camera too — one still holding it
  // while the athlete answers a message is indistinguishable from one spying.
  // The caller hears about it after the fact, because only it knows what state
  // to close alongside.
  const hiddenRef = useRef(onHidden);
  useEffect(() => {
    hiddenRef.current = onHidden;
  });

  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") {
        stop();
        hiddenRef.current?.();
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [stop]);

  // True once frames are arriving. False means the camera never opened, or was
  // closed while the prompt was up — either way the caller has nothing to shoot
  // and should say so.
  //
  // The <video> must already be on screen when this is awaited: mount it on the
  // same state update that leads here, so React has rendered it by the time the
  // permission prompt resolves.
  const start = useCallback(
    async (facing: CameraFacing = "environment"): Promise<boolean> => {
      // Switching straight from one job to another has to release the first
      // stream, or the second getUserMedia contends with a camera we still hold.
      stop();
      // Cleared after stop(), never before: stop() is what sets it, and doing
      // these the other way round would throw away the flag we just raised.
      cancelledRef.current = false;

      let stream: MediaStream;
      try {
        stream = await openCamera(facing);
      } catch {
        // NotAllowedError, NotFoundError and NotReadableError all mean the same
        // thing here. The caller picks the sentence, because the useful half is
        // the way out and that depends on what it was for.
        return false;
      }

      const video = videoRef.current;
      if (cancelledRef.current || !video) {
        closeCamera(stream, null);
        return false;
      }

      streamRef.current = stream;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        /* autoplay can reject; the frames still arrive once it settles */
      }
      return true;
    },
    [stop],
  );

  return { videoRef, cancelledRef, start, stop };
}
