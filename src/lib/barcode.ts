// Live barcode scanning: the browser's own BarcodeDetector where it has one,
// and zxing compiled to WASM, behind the same interface, where it doesn't.
//
// This was native-only once, and that cost more than it looked: Safari has no
// BarcodeDetector, so an iPhone got no "Scan barcode" button at all, and typing
// thirteen digits off a box in a kitchen is not a scanner. The ponyfill
// (barcode-detector, a thin wrapper over zxing-wasm) is the same class with the
// same detect(video), so nothing downstream of createDetector knows which one
// it got.
//
// What it costs is paid only where it's needed: the module is a dynamic import
// and its .wasm (~450KB gzipped) is fetched on the first tap of "Scan barcode",
// and only by a browser without a detector of its own. Android and Chrome on a
// Mac keep the native one, which is faster and was never the problem.

// The formats worth asking for: retail food carries EAN-13, EAN-8 or UPC-A,
// and UPC-E on small packages.
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

// Served from public/ rather than the jsDelivr URL the library defaults to, so
// scanning doesn't hang off a third-party CDN. The version is in the name and
// the path is built from the version the package reports, so upgrading
// barcode-detector without copying the new file in fails loudly as a 404 for
// the new name rather than quietly pairing new glue code with old WASM:
//
//   cp node_modules/zxing-wasm/dist/reader/zxing_reader.wasm \
//      public/zxing/zxing_reader-<version>.wasm
const wasmPath = (version: string) => `/zxing/zxing_reader-${version}.wasm`;

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

// A camera is the whole requirement now. Whether the browser can decode is
// createDetector's problem, and it always has an answer.
export function supportsBarcodeScanning(): boolean {
  if (typeof window === "undefined") return false;
  return !!navigator.mediaDevices?.getUserMedia;
}

// The native detector, but only one that can read retail barcodes.
// getSupportedFormats() is the check that looks like paranoia and isn't: some
// Android builds ship the constructor but come back without ean_13, and Chrome
// on a Mac has no upc_a (its ean_13 reads one anyway, with a leading zero).
async function nativeDetector(): Promise<BarcodeDetectorLike | null> {
  const C = ctor();
  if (!C) return null;
  try {
    const supported = await C.getSupportedFormats();
    const formats = FORMATS.filter((f) => supported.includes(f));
    if (!formats.length) return null;
    return new C({ formats });
  } catch {
    return null;
  }
}

// Null only when the WASM couldn't be fetched — offline, or the 404 above.
// Awaiting the module here rather than on the first frame is what turns that
// into a sentence instead of a camera that never reads anything.
export async function createDetector(): Promise<BarcodeDetectorLike | null> {
  const native = await nativeDetector();
  if (native) return native;
  try {
    const { BarcodeDetector, prepareZXingModule, ZXING_WASM_VERSION } =
      await import("barcode-detector/ponyfill");
    await prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith(".wasm") ? wasmPath(ZXING_WASM_VERSION) : prefix + path,
      },
      fireImmediately: true,
    });
    return new BarcodeDetector({ formats: [...FORMATS] });
  } catch (err) {
    console.error("Barcode decoder failed to load", err);
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

// The camera opened but the WASM decoder never arrived — offline, mostly.
export const DECODER_UNAVAILABLE =
  "We couldn't load the barcode reader. Enter the barcode number instead.";

// The identical failure on the photo path, where the barcode advice is no use:
// a plate of food has no digits to type. Two constants rather than one generic
// sentence, because the half that matters is the way out, not the diagnosis.
export const PHOTO_CAMERA_UNAVAILABLE =
  "We couldn't open the camera. Upload a photo instead.";

// Which way the camera points. "environment" for a thing you're holding — a
// barcode, a plate — and "user" for a face.
export type CameraFacing = "environment" | "user";

export async function openCamera(
  facing: CameraFacing = "environment",
): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    // `ideal`, never `exact`: a laptop with only a front camera throws
    // OverconstrainedError on exact and the scanner never opens at all.
    //
    // The size is asked for because the default is 640×480, and at that a
    // barcode held where the phone can focus on it is too few pixels per bar
    // to read. 720p is enough for that and cheap enough to decode every frame.
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });
}

// *How* a "Take a photo" button should behave, not whether to show one. Both
// platforms get both options — take one, or pick an existing one — and they
// differ only in the mechanism that serves each best:
//
//   phones   — an <input capture>, which hands over the OS camera. It focuses,
//              exposes and resolves the small print on a nutrition label far
//              better than a <video> preview and a canvas grab ever will.
//   desktop  — an in-page camera, because desktop browsers ignore `capture`
//              entirely and would otherwise open a second file browser.
//
// `pointer: fine` is the dividing line rather than a user-agent string: it asks
// the question that actually matters — is this thing driven by a mouse — and a
// touchscreen laptop still reports `fine` for its primary pointer. Both ways of
// being wrong are survivable, which is the point of choosing a mechanism rather
// than an offering: whichever branch you land in, you can still take a photo.
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
