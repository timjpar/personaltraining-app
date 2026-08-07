// Where the app lives, as an absolute origin.
//
// Two things need this and they need it to agree: the OAuth redirect URI, which
// must be byte-identical across the authorization request and the token
// exchange, and the links inside emails, which are read on a device that has no
// idea what "/reset/abc" means. Defaulting to the origin the request actually
// arrived on means localhost and a deploy both work untouched; APP_URL is the
// escape hatch for a setup where that origin isn't the public one (a tunnel, an
// odd proxy).
//
// Deliberately free of next/headers so this stays importable from anywhere,
// including the route handlers that already hold a request object. Callers with
// no request in hand — server actions, server components — read the origin
// themselves and pass it in.
export function appUrl(requestOrigin: string): string {
  return process.env.APP_URL?.replace(/\/$/, "") || requestOrigin;
}
