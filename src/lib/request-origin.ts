// The origin a server action's request arrived on.
//
// Server actions have no request object in hand, and the links inside emails
// have to be absolute — they're read in a mail client that has no idea what
// "/reset/abc" means. Route handlers don't need this: they hold a request and
// can read `req.nextUrl.origin` directly.
//
// Deliberately *not* in app-url.ts, which stays free of next/headers so it can
// be imported from anywhere. This returns the raw origin; APP_URL is applied by
// appUrl() inside the mail builders, so the precedence lives in one place.
import { headers } from "next/headers";

export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "";
  // A deploy behind TLS termination sees http on the socket, so the forwarded
  // header is the only honest answer about the scheme the browser used.
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "";
}
