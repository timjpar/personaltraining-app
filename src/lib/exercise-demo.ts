// What a workout card offers for watching a movement, in one place so every
// view that shows a session agrees.
//
// Data-only: imported by a client component.

import { demoSearchUrl } from "./exercise-archetypes";
import { reelId, reelsFor } from "./exercise-reels";

// `own` is a link the coach attached, which embeds in-app. `reels` are the
// Instagram reels the movement was drawn from, linked out. `search` is the
// generic YouTube search, only offered when there's nothing better.
export type Demo = { own?: string; reels: string[]; search?: string };

export function demoFor(
  name: string,
  own: { url: string } | undefined,
  // Athlete-facing views fall back to a search; coach views don't bother.
  { search }: { search: boolean },
): Demo | undefined {
  // A coach who already attached the source reel doesn't need it twice.
  const ownReel = own ? reelId(own.url) : null;
  const reels = reelsFor(name).filter((url) => reelId(url) !== ownReel);
  if (!own && reels.length === 0) {
    return search ? { reels, search: demoSearchUrl(name) } : undefined;
  }
  return { own: own?.url, reels };
}
