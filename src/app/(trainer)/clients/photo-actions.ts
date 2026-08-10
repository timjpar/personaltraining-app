"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import { readPhotoUpload } from "@/lib/avatar";
import { clearProfilePhoto, writeProfilePhoto } from "@/lib/photo-store";
import type { PhotoState } from "@/app/profile-photo-actions";

// A coach setting the photo on a client's file. The counterpart to
// profile-photo-actions.ts, which is strictly your own face and takes no id at
// all — and the whole reason these are two files rather than one pair of
// actions with an optional userId. An optional id is a permission check that is
// skipped whenever the argument is absent, and the version of this bug that
// matters is the one where a forged form posts somebody else's.
//
// Why a coach needs this: half a roster is signed up by the coach at a desk
// (signupSource TRAINER) and never opens the settings card, so their file is a
// wall of identical initials. The person who takes a photo of an athlete is the
// one standing in front of them.
//
// The athlete keeps full control of the result: it lands in exactly the same
// place their own upload would, and their own card on /my will happily replace
// or remove it. There is no notion here of a photo the coach owns.

// Reloaded with the trainer scope in the where clause rather than trusting the
// posted id, exactly as body-actions.ts and resetClientPassword do. A client id
// from another coach's roster has to find nothing.
async function ownedClient(clientId: string, trainerId: string) {
  return prisma.user.findFirst({
    where: { id: clientId, trainerId, role: "CLIENT" },
    select: { id: true, name: true },
  });
}

// The layout sweep every avatar in the app depends on, plus this client's own
// page — which is where the change was made and the one place a stale face
// would be most obvious.
function revalidateClientAvatar(clientId: string) {
  revalidatePath("/", "layout");
  revalidatePath(`/clients/${clientId}`);
}

export async function saveClientPhoto(
  clientId: string,
  formData: FormData,
): Promise<PhotoState> {
  const trainer = await requireTrainer();
  const client = await ownedClient(clientId, trainer.id);
  if (!client) return { error: "That client no longer exists." };

  // Not destructured, for the reason saveProfilePhoto spells out.
  const upload = await readPhotoUpload(formData);
  if (upload.error !== undefined) return { error: upload.error };

  await writeProfilePhoto(client.id, upload.bytes, upload.contentType);

  revalidateClientAvatar(client.id);
  return { ok: "Photo saved.", bytes: upload.bytes.length };
}

export async function removeClientPhoto(clientId: string): Promise<PhotoState> {
  const trainer = await requireTrainer();
  const client = await ownedClient(clientId, trainer.id);
  if (!client) return { error: "That client no longer exists." };

  await clearProfilePhoto(client.id);

  revalidateClientAvatar(client.id);
  return { ok: "Photo removed." };
}
