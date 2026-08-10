// Live barcode scanning through the browser's own BarcodeDetector.
//
// No polyfill, and that is a decision with a cost worth naming: Safari does not
// implement BarcodeDetector, so on an iPhone this returns false and no live
// scanner is offered. The alternatives were a ~200KB WASM decoder (zxing) to
// serve one browser, in a repo that carries nine runtime dependencies and
// removed @vercel/blob rather than pay for storage.
//
// iOS is not left without a way to scan: the photo path uses a plain
// <input capture="environment">, which opens the camera with no getUserMedia
// at all, and Gemini reads a packaged label perfectly well. Typing the digits
// under the barcode is the third path, and doubles as the fallback everywhere
// when the camera is refused or busy.
//
// Everything the capability check needs is behind these two functions, so
// adding a ponyfill later is one import in one file and no call-site changes.

// The formats worth asking for: retail food carries EAN-13, EAN-8 or UPC-A,
// and UPC-E on small packages.
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = {
  new (options?: { formats?: readonly string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
};

function ctor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const c = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;
  return c ?? null;
}

// Async, and all three checks matter. getSupportedFormats() is the one that
// looks like paranoia and isn't: some Android builds ship the constructor but
// come back without ean_13, and a scanner that opens the camera and can never
// match anything is worse than no button.
export async function supportsBarcodeScanning(): Promise<boolean> {
  const C = ctor();
  if (!C) return false;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const supported = await C.getSupportedFormats();
    return FORMATS.some((f) => supported.includes(f));
  } catch {
    return false;
  }
}

export function createDetector(): BarcodeDetectorLike | null {
  const C = ctor();
  if (!C) return null;
  try {
    return new C({ formats: FORMATS });
  } catch {
    return null;
  }
}

// One frame. Throws transiently on some frames for reasons that clear by the
// next one, so the caller's loop swallows it and carries on rather than
// tearing the scanner down.
export async function detectFrom(
  detector: BarcodeDetectorLike,
  video: HTMLVideoElement,
): Promise<string | null> {
  const found = await detector.detect(video);
  for (const code of found) {
    const value = String(code.rawValue ?? "").replace(/\D/g, "");
    if (value.length >= 8) return value;
  }
  return null;
}

// getUserMedia rejects with a handful of distinct errors — denied, no camera,
// already in use — and there is exactly one thing the athlete can do about any
// of them. Collapsed into one sentence for the same reason GOOGLE_ERRORS is
// deliberately coarse.
export const CAMERA_UNAVAILABLE =
  "We couldn't open the camera. Enter the barcode number instead.";

// The identical failure on the photo path, where the barcode advice is no use:
// a plate of food has no digits to type. Two constants rather than one generic
// sentence, because the half that matters is the way out, not the diagnosis.
export const PHOTO_CAMERA_UNAVAILABLE =
  "We couldn't open the camera. Upload a photo instead.";

export async function openCamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    // `ideal`, never `exact`: a laptop with only a front camera throws
    // OverconstrainedError on exact and the scanner never opens at all.
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
}

// Whether to offer an in-page camera for *photos* — a laptop, in practice.
//
// Less a capability check than a check on whether one is needed. The photo
// input carries capture="environment", and on a phone that hands you the OS
// camera, which focuses, exposes and resolves the small print on a nutrition
// label far better than a <video> preview and a canvas grab ever will. Desktop
// browsers ignore the attribute and open a file browser instead — so the
// person who wants to point a webcam at their lunch has no way to do it, which
// is the gap this opens.
//
// `pointer: fine` is the dividing line rather than a user-agent string: it asks
// the question that actually matters — is this thing driven by a mouse — and a
// touchscreen laptop still reports `fine` for its primary pointer. Both ways of
// being wrong are survivable: a phone read as a laptop gets an in-page camera
// that works, and a laptop read as a phone gets the file browser it has today.
const MOUSE_DRIVEN = "(pointer: fine)";

export function supportsInPageCamera(): boolean {
  if (typeof window === "undefined") return false;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  return window.matchMedia(MOUSE_DRIVEN).matches;
}

// The subscribe half of the pair, so the answer can be read with
// useSyncExternalStore rather than latched into state by an effect. It also
// happens to be correct where a one-shot check isn't: an iPad that gains a
// trackpad, or a laptop in tablet mode, changes its answer mid-session.
export function watchPointer(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const query = window.matchMedia(MOUSE_DRIVEN);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// Both halves matter. Without stop() the camera indicator stays lit after the
// sheet closes, which on a phone reads as the app watching you; without
// clearing srcObject the element holds a reference to a dead stream.
export function closeCamera(
  stream: MediaStream | null,
  video: HTMLVideoElement | null,
) {
  stream?.getTracks().forEach((t) => t.stop());
  if (video) video.srcObject = null;
}
