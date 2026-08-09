"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { MAX_PHOTO_BYTES, sniffImageType } from "@/lib/avatar";

// Top-level rather than inside a route group, alongside theme-actions and
// time-zone-actions, because both a coach and an athlete call these — the card
// they belong to renders on /dashboard and on /my.
//
// Everything here is scoped to the signed-in account. No user id ever arrives
// in the form: there is no way to express "set someone else's photo", which is
// the cheapest version of getting the permission check right.

export type PhotoState = { error?: string; ok?: string; bytes?: number };

// Both pages that render the card, plus every page that draws an avatar of
// someone else — the clients list, the feed, the admin tables. They're all
// dynamic, so this is clearing the client's router cache rather than a CDN
// entry, and the same broad sweep theme-actions makes for the same reason:
// the change is visible in more places than it is written from.
function revalidateAvatars() {
  revalidatePath("/", "layout");
}

export async function saveProfilePhoto(formData: FormData): Promise<PhotoState> {
  const user = await requireUser();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "We didn't get a photo. Try again." };
  }

  // Checked before the bytes are read into memory, so an enormous upload is
  // refused rather than buffered. The browser resizes to ~15KB first, so
  // reaching this means the resize didn't run.
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: "That photo is too big. Try a smaller one." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // The declared type is client-supplied text; this reads the actual header.
  const contentType = sniffImageType(bytes);
  if (!contentType) {
    return { error: "That file isn't an image we can use." };
  }

  const updatedAt = new Date();

  // One transaction, because the marker on User is what every avatar reads to
  // decide whether a photo exists. A row written without it is invisible, and a
  // marker written without a row is a broken image.
  await prisma.$transaction([
    prisma.profilePhoto.upsert({
      where: { userId: user.id },
      update: { data: bytes, contentType },
      create: { userId: user.id, data: bytes, contentType },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { photoUpdatedAt: updatedAt },
    }),
  ]);

  revalidateAvatars();
  return { ok: "Photo saved.", bytes: bytes.length };
}

export async function removeProfilePhoto(): Promise<PhotoState> {
  const user = await requireUser();

  // deleteMany, not delete: removing a photo that's already gone is a no-op
  // rather than a thrown P2025.
  await prisma.$transaction([
    prisma.profilePhoto.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: { photoUpdatedAt: null },
    }),
  ]);

  revalidateAvatars();
  return { ok: "Photo removed." };
}
