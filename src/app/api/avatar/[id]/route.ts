// Serving a profile photo.
//
// A route handler and not a server action, which is the line api/cron/digest
// draws: an action is the page asking the server a question, and a handler
// exists when something outside the app has to reach a URL. An <img src> is
// exactly that.
//
// src/proxy.ts excludes /api from its matcher, so nothing has checked a session
// before the first line here — same as the Google callback notes. This
// authenticates itself.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";

// 404 for every refusal, never 403 or 401. Whether a given cuid is an account,
// and whether that account has uploaded a photo, are both things a stranger
// shouldn't be able to learn by watching status codes — the same call
// requireAdmin makes about /admin.
const notFound = () => new NextResponse(null, { status: 404 });

// `params` is a promise in this version of Next. Spelled out rather than using
// the global RouteContext helper, because that helper's route literals only
// exist once `next dev`/`next build`/`next typegen` has written them — and a
// bare `tsc --noEmit` shouldn't depend on having run a build first.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getCurrentUser();
  if (!viewer) return notFound();

  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      trainerId: true,
      photo: { select: { data: true, contentType: true } },
    },
  });
  if (!target?.photo) return notFound();

  // Who may see a face: yourself, an admin, the coach of the person in the
  // photo, or — the other direction — your own coach. Anyone else is told
  // nothing, which matters because the ids are handed to the browser in
  // every avatar URL on a page.
  const visible =
    target.id === viewer.id ||
    isAdminUser(viewer) ||
    target.trainerId === viewer.id ||
    viewer.trainerId === target.id;
  if (!visible) return notFound();

  // Cacheable forever because the URL carries ?v=photoUpdatedAt: these bytes
  // cannot change without the URL changing, so there is no invalidation to get
  // wrong. `private` rather than `public` — the response depends on who asked,
  // and a shared cache must not hand one viewer's copy to the next.
  return new NextResponse(new Uint8Array(target.photo.data), {
    headers: {
      "Content-Type": target.photo.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
