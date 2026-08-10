// Writing and clearing a profile photo — the database half, shared by the two
// actions that do it: your own photo (src/app/profile-photo-actions.ts) and a
// coach setting one for a client (src/app/(trainer)/clients/photo-actions.ts).
//
// Not in src/lib/avatar.ts, which owns the sizes, the sniffer and the URL: that
// module is imported by ProfilePhotoCard, a client component, so a `prisma`
// import there would drag the database client toward a browser bundle. Same
// division downscale.ts describes from the other side.
//
// It exists at all because of the invariant below, which is exactly the kind of
// thing that survives in one place and rots in two.

import { prisma } from "@/lib/db";

// One transaction, because the marker on User is what every avatar reads to
// decide whether a photo exists. A row written without it is invisible, and a
// marker written without a row is a broken image.
//
// The marker doubles as the cache-busting version in the photo URL, so it is
// written on every save even when the bytes land on top of an existing row —
// that is what makes the new face appear instead of the old one.
export async function writeProfilePhoto(
  userId: string,
  // Pinned to ArrayBuffer for the reason readPhotoUpload gives: the Bytes
  // column's type won't take the wider ArrayBufferLike.
  bytes: Uint8Array<ArrayBuffer>,
  contentType: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.profilePhoto.upsert({
      where: { userId },
      update: { data: bytes, contentType },
      create: { userId, data: bytes, contentType },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { photoUpdatedAt: new Date() },
    }),
  ]);
}

export async function clearProfilePhoto(userId: string): Promise<void> {
  // deleteMany, not delete: removing a photo that's already gone is a no-op
  // rather than a thrown P2025.
  await prisma.$transaction([
    prisma.profilePhoto.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: { photoUpdatedAt: null },
    }),
  ]);
}
