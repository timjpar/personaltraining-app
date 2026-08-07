// Google Calendar OAuth tokens: sealing them at rest, trading a code for them,
// and keeping a usable access token in hand.
//
// Why encrypt at all, when the database is already private? Because AUTH_SECRET
// and DATABASE_URL live in different places. The realistic leak here isn't a
// full server compromise — it's a preview deploy attached to a branch of the
// database, a backup handed to someone, a query log, a read replica pointed at
// analytics. Every one of those hands over the table without the environment,
// and a plaintext column would turn it into every trainer's calendar. Forty
// lines buys immunity to the whole class.
//
// No GOOGLE_TOKEN_KEY env var, deliberately: one more secret to lose, and
// losing it has the same consequence as losing AUTH_SECRET already does.
import { prisma } from "./db";
import { base64url } from "./random";
import { getSecret } from "./session";
import { googleConfig, type GoogleConfig, verifyIdToken } from "./google";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

// A distinct label so the key that seals tokens is not the same bytes as the
// key that signs sessions, even though both descend from AUTH_SECRET.
const HKDF_INFO = "chalkline.gcal.v1";
const VERSION = "v1";

async function sealingKey(): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    getSecret(),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      // No salt: the input is already a high-entropy secret, and a random salt
      // would have to be stored alongside every value to be re-derivable.
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(HKDF_INFO),
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function seal(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await sealingKey(),
    new TextEncoder().encode(plain),
  );
  return `${VERSION}.${base64url(iv)}.${base64url(new Uint8Array(ct))}`;
}

// Null rather than a throw when it can't be opened — which in practice means
// AUTH_SECRET was rotated. That is not a crash: it's the same "reconnect this"
// state as a token Google has revoked, and every caller already handles it.
export async function open(sealed: string): Promise<string | null> {
  try {
    const [version, ivPart, ctPart] = sealed.split(".");
    if (version !== VERSION || !ivPart || !ctPart) return null;
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64url(ivPart) },
      await sealingKey(),
      fromBase64url(ctPart),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

// Allocated rather than built with Uint8Array.from, which types as
// Uint8Array<ArrayBufferLike> and so isn't assignable to the BufferSource that
// crypto.subtle wants.
function fromBase64url(s: string): Uint8Array<ArrayBuffer> {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type TokenGrant = {
  refreshToken: string | null;
  accessToken: string;
  expiresIn: number;
  scope: string;
  googleId: string;
  email: string;
};

// The connect flow's token exchange. Unlike sign-in's fetchIdentity, this keeps
// the whole grant: the refresh token is the entire point, and the id_token is
// still verified so we know which account was connected.
export async function exchangeCode(
  config: GoogleConfig,
  code: string,
  uri: string,
  verifier: string,
  nonce: string,
): Promise<TokenGrant | null> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: uri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!res.ok) return null;

  const body = (await res.json()) as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    scope?: unknown;
    id_token?: unknown;
  };

  if (typeof body.access_token !== "string") return null;
  if (typeof body.id_token !== "string") return null;

  const identity = await verifyIdToken(config, body.id_token, nonce);
  if (!identity) return null;

  return {
    refreshToken:
      typeof body.refresh_token === "string" ? body.refresh_token : null,
    accessToken: body.access_token,
    expiresIn: typeof body.expires_in === "number" ? body.expires_in : 3600,
    scope: typeof body.scope === "string" ? body.scope : "",
    googleId: identity.googleId,
    email: identity.email,
  };
}

export type Connection = {
  id: string;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  status: string;
};

// A minute of headroom, so a token that passes this check doesn't expire
// mid-way through a long backfill.
const EXPIRY_SKEW_MS = 60_000;

// Returns a usable access token, refreshing if needed. Null means "this
// connection is not usable right now" — every caller treats that as not
// connected rather than as an error to surface.
export async function accessTokenFor(
  connection: Connection,
): Promise<string | null> {
  if (connection.status !== "ACTIVE") return null;

  if (
    connection.accessToken &&
    connection.accessTokenExpiresAt &&
    connection.accessTokenExpiresAt.getTime() - EXPIRY_SKEW_MS > Date.now()
  ) {
    const cached = await open(connection.accessToken);
    if (cached) return cached;
    // Falls through to a refresh — an unopenable cache is a rotated secret,
    // and the refresh below will discover whether the refresh token survived.
  }

  const config = googleConfig();
  if (!config) return null;

  const refreshToken = await open(connection.refreshToken);
  if (!refreshToken) {
    // AUTH_SECRET changed. The stored token is unrecoverable, so this is the
    // same dead end as a revoked grant and gets the same state.
    await markRevoked(connection.id, "Stored token could not be read.");
    return null;
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    // invalid_grant is Google's answer for "the user revoked this in their
    // account settings" and for a token that aged out through disuse. Both are
    // permanent, and both are fixed by reconnecting — so the row is marked
    // rather than retried forever.
    const body = await res.text();
    if (res.status === 400 || res.status === 401) {
      await markRevoked(connection.id, "Google revoked access.");
      return null;
    }
    console.error("Google token refresh failed", res.status, body);
    return null;
  }

  const body = (await res.json()) as {
    access_token?: unknown;
    expires_in?: unknown;
  };
  if (typeof body.access_token !== "string") return null;

  const expiresIn =
    typeof body.expires_in === "number" ? body.expires_in : 3600;

  // Concurrent refreshes are safe: Google issues multiple valid access tokens
  // per refresh token, so a lost write costs one redundant refresh, not a
  // broken connection.
  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: await seal(body.access_token),
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      lastError: null,
    },
  });

  return body.access_token;
}

export async function markRevoked(id: string, reason: string): Promise<void> {
  await prisma.googleCalendarConnection.update({
    where: { id },
    data: {
      status: "REVOKED",
      lastError: reason,
      // Nulled rather than kept: they're useless now, and holding a dead
      // credential is strictly worse than holding none.
      accessToken: null,
      accessTokenExpiresAt: null,
    },
  });
}

// Best effort. Google's revoke endpoint is the polite thing to call on
// disconnect, but a failure here must not stop the local row being deleted.
export async function revokeToken(sealedRefreshToken: string): Promise<void> {
  const token = await open(sealedRefreshToken);
  if (!token) return;
  try {
    await fetch(REVOKE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch (err) {
    console.error("Google token revoke failed", err);
  }
}
