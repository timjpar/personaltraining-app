// The door every scheduled endpoint comes through.
//
// Lifted out of api/cron/digest/route.ts when a second cron appeared, with its
// reasoning intact — the two decisions below are the whole security of an
// endpoint that has no session to check and is reachable by anyone who can
// resolve the hostname.
import type { NextRequest } from "next/server";
import { sha256Hex } from "@/lib/random";

export type CronAuth =
  // The secret isn't configured at all.
  | { ok: false; reason: "unconfigured" }
  | { ok: false; reason: "unauthorized" }
  | { ok: true };

export async function authorizeCron(req: NextRequest): Promise<CronAuth> {
  const expected = process.env.CRON_SECRET;
  if (!expected) return { ok: false, reason: "unconfigured" };

  // Vercel Cron sends `Authorization: Bearer`; the x-cron-secret fallback is
  // for anything that can't set an auth header.
  const header = req.headers.get("authorization") ?? "";
  const provided = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : (req.headers.get("x-cron-secret") ?? "");

  // Compared as digests, not with ===. Both sides become fixed-length hex, so
  // the comparison's timing says nothing about how much of the secret matched
  // or how long it is. sha256Hex is Web Crypto, so this stays runtime-agnostic
  // rather than being the first node:crypto import in the app.
  if ((await sha256Hex(provided)) !== (await sha256Hex(expected))) {
    return { ok: false, reason: "unauthorized" };
  }

  return { ok: true };
}
