// Profile photos: the numbers that keep them small, the check that enforces
// them, and the one place their URL is built.
//
// No DOM in here — the browser-side resizing lives in src/lib/downscale.ts.
// This module is imported by server actions, the route handler, and by pages
// rendering an <Avatar>, so it has to stay runtime-agnostic.

// The square a photo is resized to in the browser before it's sent. The largest
// avatar the app draws today is 36px (h-9), so 256 is generous — it's sized for
// a retina display of something several times bigger, which is the headroom
// worth having when the alternative is asking everyone to upload again.
//
// At this size a WebP portrait lands around 10-18KB. That is the whole answer
// to "will these take up space": a thousand accounts is a few megabytes, so the
// photos can live in Postgres beside everything else and there is no bucket, no
// second credential, and nothing to garbage-collect.
export const PHOTO_EDGE = 256;
export const PHOTO_QUALITY = 0.82;

// What the server will actually accept. Roughly ten times what a correctly
// resized photo weighs, so it never fires for an honest upload — it's here for
// the two cases the browser resize can't cover: a canvas that encoded far worse
// than expected, and someone POSTing to the action directly. The same division
// of labour gemini.ts describes for food photos: the resize is a courtesy, this
// is the control.
//
// It also sits well inside the 1MB default server-action body limit, so
// serverActions.bodySizeLimit stays untouched — raising it would raise it for
// every action in the app.
export const MAX_PHOTO_BYTES = 150_000;

// Read off the bytes, not off the multipart Content-Type, which is client-
// supplied text and therefore not evidence of anything. A null means "this is
// not one of the three image formats a canvas produces", and every caller
// treats that as a rejection.
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && PNG.every((b, i) => bytes[i] === b)) {
    return "image/png";
  }

  // RIFF....WEBP — four bytes of container size sit between the two tags.
  const ascii = (at: number, text: string) =>
    [...text].every((c, i) => bytes[at + i] === c.charCodeAt(0));
  if (bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")) {
    return "image/webp";
  }

  return null;
}

// The <img src> for someone's photo, or null when they haven't got one — which
// is the signal Avatar uses to fall back to initials.
//
// photoUpdatedAt rides along as ?v= and is the reason the route can answer
// `immutable`: the bytes behind a given version never change, so a new photo is
// a new URL rather than a cache to invalidate. Built here and nowhere else so
// no call site can forget the version and pin someone to their old face.
export function avatarUrl(user: {
  id: string;
  photoUpdatedAt: Date | null;
}): string | null {
  if (!user.photoUpdatedAt) return null;
  return `/api/avatar/${user.id}?v=${user.photoUpdatedAt.getTime()}`;
}
