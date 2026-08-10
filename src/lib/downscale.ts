// Shrinking an image in the browser before it's uploaded. Canvas only — this
// module touches document and createImageBitmap, so it is client-side and
// nothing on the server may import it.
//
// Three callers with deliberately different contracts:
//
//   fitWithin  — used by the food scanner. Falls back to the original file if
//                the canvas won't cooperate, because an oversized photo the
//                server rejects with a clear message beats no scan attempt.
//   frameToBlob— also the food scanner, grabbing a still off the live camera,
//                and throws: there is no original to fall back to.
//   squareCrop — used by the profile photo card, and throws instead. There is
//                no useful fallback: handing the action a 4MB original would
//                fail the size cap and report the wrong reason.

async function encode(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
  // A canvas that can't encode the type asked for is allowed to hand back a
  // PNG instead of null, so the type is checked rather than assumed.
  return blob && blob.type === type ? blob : null;
}

// Scales an image down so its longest edge is at most maxEdge, keeping the
// aspect ratio. Never scales up.
export async function fitWithin(
  file: File,
  maxEdge: number,
  quality: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  return blob ?? file;
}

// One frame off a playing <video>, fitted to maxEdge on the way out so the
// result is interchangeable with what fitWithin returns for a picked file.
//
// The source size comes from videoWidth/videoHeight, never the element's CSS
// box: the preview is object-cover cropped to a short strip, and drawing from
// the box would capture that crop rather than what the camera actually sees.
export async function frameToBlob(
  video: HTMLVideoElement,
  maxEdge: number,
  quality: number,
): Promise<Blob> {
  // Zero until the first frame decodes — a capture in that window would encode
  // a blank canvas, and a plausible-looking blank photo is worse than an error.
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("The camera hasn't sent a picture yet. Try again.");
  }

  const scale = Math.min(
    1,
    maxEdge / Math.max(video.videoWidth, video.videoHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't take a picture.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await encode(canvas, "image/jpeg", quality);
  if (!blob) throw new Error("This browser can't take a picture.");
  return blob;
}

// The centre square of a source, drawn at `size` and encoded. WebP where the
// browser can (about 30% smaller than JPEG at the same quality), JPEG where it
// can't — Safari below 14 being the case that's left. The caller stores
// whichever came back, which is why ProfilePhoto has a contentType column
// rather than assuming.
//
// Dimensions are passed in rather than read off the source: a bitmap keeps them
// on width/height and a video on videoWidth/videoHeight, and that one
// difference is the only thing separating the two public functions below.
async function squareFrom(
  source: CanvasImageSource,
  width: number,
  height: number,
  size: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't resize images.");

  // The largest square the source contains, taken from its middle — a face in a
  // portrait photo survives this, where squashing to a square wouldn't.
  const edge = Math.min(width, height);
  ctx.drawImage(
    source,
    (width - edge) / 2,
    (height - edge) / 2,
    edge,
    edge,
    0,
    0,
    size,
    size,
  );

  const blob =
    (await encode(canvas, "image/webp", quality)) ??
    (await encode(canvas, "image/jpeg", quality));
  if (!blob) throw new Error("This browser can't resize images.");
  return blob;
}

// Centre-crops a picked file.
export async function squareCrop(
  file: File,
  size: number,
  quality: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  // finally, so a throw out of squareFrom still frees the decoded bitmap — it
  // holds the full-resolution image, which on a modern phone camera is tens of
  // megabytes.
  try {
    return await squareFrom(bitmap, bitmap.width, bitmap.height, size, quality);
  } finally {
    bitmap.close();
  }
}

// The same crop taken off a live camera, encoded once rather than routed
// through a JPEG on its way to becoming a WebP.
export async function squareCropFrame(
  video: HTMLVideoElement,
  size: number,
  quality: number,
): Promise<Blob> {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("The camera hasn't sent a picture yet. Try again.");
  }
  return squareFrom(
    video,
    video.videoWidth,
    video.videoHeight,
    size,
    quality,
  );
}
