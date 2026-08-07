// The crypto primitives that aren't specific to any one flow. These lived
// privately inside google.ts until password resets became the second caller —
// and two copies of a CSPRNG helper is exactly the kind of duplication that
// ends with one of them quietly rewritten as Math.random by someone who only
// needed "a random string".
//
// Everything here is Web Crypto rather than node:crypto, so these stay usable
// from any runtime the app renders in.

export function base64url(bytes: Uint8Array): string {
  // Built with a loop rather than String.fromCharCode(...bytes): the spread
  // form passes one argument per byte, which throws on a large enough input.
  // The callers here are small, but a helper this general shouldn't carry a
  // size limit nobody documented.
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 32 bytes is 256 bits of entropy — far past guessable, and short enough to
// survive being pasted into a mail client that wraps long lines.
export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return new Uint8Array(digest);
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = await sha256(input);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
