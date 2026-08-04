// Google sign-in — the OpenID Connect authorization-code flow, written against
// Google's endpoints directly rather than pulled in as an auth framework. The
// app already hand-rolls sessions (see session.ts), and one provider needs far
// less machinery than a framework brings: an authorization redirect, a token
// exchange, and an ID token to verify.
//
// Three values travel with the handshake, and each closes a different hole:
//   state     — proves the callback belongs to a flow *this* browser started,
//               so an attacker can't feed us their own authorization code.
//   nonce     — bound into the ID token by Google, so a token minted for some
//               other session can't be replayed into this one.
//   verifier  — PKCE. Belt and braces for a confidential client, but it costs
//               a hash and it removes the value of a stolen code.
//
// All three live in one signed, httpOnly cookie for the ten minutes the user is
// away at Google. Signing matters: an unsigned cookie could be planted by a
// site the user visits, which is exactly the login-CSRF that `state` exists to
// stop.
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { getSecret } from "./session";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
// Google is inconsistent about the scheme in `iss` and both forms are valid.
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export const OAUTH_COOKIE = "pt_oauth";
export const OAUTH_MAX_AGE = 60 * 10; // long enough to pick an account

export type GoogleConfig = { clientId: string; clientSecret: string };

// Null when the app hasn't been given credentials. Every caller treats that as
// "Google sign-in is switched off" rather than an error, so the app still runs
// on email and password alone with nothing configured.
export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

// Must be byte-identical in the authorization request and the token exchange,
// and registered in the Google Cloud console. It defaults to the origin the
// request actually arrived on so localhost and a deploy both work untouched;
// APP_URL is the escape hatch for a setup where that origin isn't the public
// one (an odd proxy, a tunnel).
export function redirectUri(requestOrigin: string) {
  const base = process.env.APP_URL?.replace(/\/$/, "") || requestOrigin;
  return `${base}/api/auth/google/callback`;
}

export type Handshake = { state: string; nonce: string; verifier: string };

export async function createHandshake(): Promise<Handshake> {
  return {
    state: randomString(),
    nonce: randomString(),
    verifier: randomString(),
  };
}

export async function signHandshake(handshake: Handshake): Promise<string> {
  return new SignJWT({ ...handshake })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyHandshake(
  token: string | undefined,
): Promise<Handshake | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const { state, nonce, verifier } = payload;
    if (
      typeof state !== "string" ||
      typeof nonce !== "string" ||
      typeof verifier !== "string"
    ) {
      return null;
    }
    return { state, nonce, verifier };
  } catch {
    return null;
  }
}

export async function authorizationUrl(
  config: GoogleConfig,
  uri: string,
  handshake: Handshake,
): Promise<string> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: uri,
    response_type: "code",
    scope: "openid email profile",
    state: handshake.state,
    nonce: handshake.nonce,
    code_challenge: await codeChallenge(handshake.verifier),
    code_challenge_method: "S256",
    // Without this, a browser signed into exactly one Google account is sent
    // straight back with no chance to pick a different one.
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

export type GoogleIdentity = {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

// Trades the one-time code for an ID token and verifies it. Everything the app
// then trusts about the user comes from that token's signature — the response
// body around it is not evidence of anything.
export async function fetchIdentity(
  config: GoogleConfig,
  code: string,
  uri: string,
  handshake: Handshake,
): Promise<GoogleIdentity | null> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: uri,
      grant_type: "authorization_code",
      code_verifier: handshake.verifier,
    }),
  });
  if (!res.ok) return null;

  const body: unknown = await res.json();
  const idToken =
    typeof body === "object" && body !== null && "id_token" in body
      ? (body as { id_token?: unknown }).id_token
      : undefined;
  if (typeof idToken !== "string") return null;

  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: ISSUERS,
      audience: config.clientId,
    });
    // The nonce ties this token to the handshake cookie in *this* browser.
    if (payload.nonce !== handshake.nonce) return null;

    const { sub, email, email_verified: verified, name } = payload;
    if (typeof sub !== "string" || typeof email !== "string") return null;

    return {
      googleId: sub,
      email: email.trim().toLowerCase(),
      // Google sends this as a boolean, but has historically also sent the
      // string "true"; anything else is treated as unverified.
      emailVerified: verified === true || verified === "true",
      name: typeof name === "string" && name.trim() ? name.trim() : null,
    };
  } catch {
    return null;
  }
}

// A failed sign-in comes back to /login?error=<code>. The codes are deliberately
// coarse: the user can only ever do one thing about it, which is try again.
export const GOOGLE_ERRORS = {
  unconfigured: "Google sign-in isn't set up on this server yet.",
  cancelled: "Google sign-in was cancelled.",
  handshake: "That Google sign-in took too long. Try again.",
  exchange: "Google couldn't confirm that sign-in. Try again.",
  unverified:
    "That Google account's email address isn't verified, so we can't sign you in with it.",
} as const;

export type GoogleError = keyof typeof GOOGLE_ERRORS;

export function googleErrorMessage(code: string | undefined) {
  if (!code) return undefined;
  return GOOGLE_ERRORS[code as GoogleError] ?? GOOGLE_ERRORS.exchange;
}

function randomString() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

async function codeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(new Uint8Array(digest));
}

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
