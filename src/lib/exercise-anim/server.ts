// Server side of the animations: the drawings themselves, by slug.

import { SPECS } from "./exercises";
import { ANIMATION_ALIASES, ANIMATIONS } from "./index";
import { renderSvg, type Spec } from "./render";
import { animationSlug } from "./slug";

const BY_SLUG = new Map<string, Spec>();
for (const spec of SPECS) BY_SLUG.set(animationSlug(spec.name), spec);

export function animationSvg(slug: string): string | null {
  const spec = BY_SLUG.get(ANIMATION_ALIASES[slug] ?? slug);
  return spec ? renderSvg(spec) : null;
}

export function animationSlugs(): string[] {
  return [...BY_SLUG.keys()];
}

// The generated index must name exactly the specs that exist, or the browser
// would ask for drawings that aren't there (or never ask for ones that are).
export function assertIndexCurrent() {
  const drawn = [...BY_SLUG.keys()].sort().join("|");
  const indexed = Object.keys(ANIMATIONS).sort().join("|");
  if (drawn !== indexed) {
    throw new Error(
      "src/lib/exercise-anim/index.ts is out of date with the exercise specs. Run: npx tsx scripts/anim-index.ts",
    );
  }
}
