// Client-direct upload to Vercel Blob.
//
// This is the app's only route handler — everything else is Server Actions.
// It has to be one: Server Actions cap request bodies at 1MB and Vercel
// functions at 4.5MB, so video can't travel through the server. The browser
// calls upload() from @vercel/blob/client, which uses this endpoint only to
// mint a short-lived token and then sends the bytes straight to Blob storage.
//
// SECURITY: src/proxy.ts's matcher excludes /api, so this endpoint gets NO
// session check from the proxy. The requireTrainer() call below is the only
// thing preventing an open upload endpoint on someone else's bill.

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

const MAX_BYTES = 200 * 1024 * 1024; // 200MB — a demo clip, not a feature film

export async function POST(request: Request): Promise<NextResponse> {
  // Authorize BEFORE handleUpload, not only inside onBeforeGenerateToken.
  // handleUpload validates its own configuration first and can fail out before
  // ever invoking that callback — so treating the callback as the security
  // boundary makes authorization depend on a library's internal ordering.
  // getCurrentUser rather than requireTrainer: the redirect() the require*
  // helpers perform is meaningless in a route handler.
  const user = await getCurrentUser();
  if (!user || user.role !== ROLES.TRAINER) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Belt and braces: re-checked here too, so the constraint holds even
        // if this handler is ever refactored.
        const trainer = await getCurrentUser();
        if (!trainer || trainer.role !== ROLES.TRAINER) {
          throw new Error("Not authorised.");
        }

        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          // Echoed back to onUploadCompleted, and lets us scope paths per user.
          tokenPayload: JSON.stringify({ trainerId: trainer.id }),
        };
      },
      onUploadCompleted: async () => {
        // The blob URL is recorded by an explicit server action once the
        // browser reports success, so there is nothing to do here. (This
        // callback doesn't fire on localhost anyway — it needs a public URL.)
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
