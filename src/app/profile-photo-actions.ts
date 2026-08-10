"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { readPhotoUpload } from "@/lib/avatar";
import { clearProfilePhoto, writeProfilePhoto } from "@/lib/photo-store";

// Top-level rather than inside a route group, alongside theme-actions and
// time-zone-actions, because both a coach and an athlete call these — the card
// they belong to renders on /dashboard and on /my.
//
// Everything here is scoped to the signed-in account. No user id ever arrives
// in the form: there is no way to express "set someone else's photo", which is
// the cheapest version of getting the permission check right.
//
// A coach setting a photo *for* a client is deliberately a different pair of
// actions in a different file — see src/app/(trainer)/clients/photo-actions.ts,
// which takes an id and therefore has to prove it owns it. The two share the
// upload rules (readPhotoUpload) and the write (photo-store), and share no
// permission code at all, which is the half that must not be generalised.

export type PhotoState = { error?: string; ok?: string; bytes?: number };

// Both pages that render the card, plus every page that draws an avatar of
// someone else — the clients list, the feed, the admin tables. They're all
// dynamic, so this is clearing the client's router cache rather than a CDN
// entry, and the same broad sweep theme-actions makes for the same reason:
// the change is visible in more places than it is written from.
//
// Not exported, and not lifted into a shared module either: a "use server" file
// may only export async functions, so sharing this one line would mean either
// an await on a synchronous cache call or a third module to hold it. The coach
// action repeats it and adds the client page on top.
function revalidateAvatars() {
  revalidatePath("/", "layout");
}

export async function saveProfilePhoto(formData: FormData): Promise<PhotoState> {
  const user = await requireUser();

  // Kept whole rather than destructured: the two halves of the result are a
  // union discriminated on `error`, and a truthiness check on a destructured
  // `string | undefined` doesn't narrow its siblings.
  const upload = await readPhotoUpload(formData);
  if (upload.error !== undefined) return { error: upload.error };

  await writeProfilePhoto(user.id, upload.bytes, upload.contentType);

  revalidateAvatars();
  return { ok: "Photo saved.", bytes: upload.bytes.length };
}

export async function removeProfilePhoto(): Promise<PhotoState> {
  const user = await requireUser();

  await clearProfilePhoto(user.id);

  revalidateAvatars();
  return { ok: "Photo removed." };
}
