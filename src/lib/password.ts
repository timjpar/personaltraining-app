import { randomInt } from "node:crypto";

// No l/1/I or O/0: these get read down a phone line and typed by hand.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

// A password someone else picks on your behalf — a trainer creating a client,
// or the owner resetting an account. `randomInt` rather than Math.random
// because this is now the credential that gets an admin into a reset account,
// and modulo bias on a 31-character alphabet would narrow it further.
export function generatePassword(length = 10) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `chalk-${out}`;
}
