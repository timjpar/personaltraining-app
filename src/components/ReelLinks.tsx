// Links to the Instagram reels a movement was drawn from (see exercise-reels.ts),
// or nothing for a movement that didn't come from one. `short` is for the
// board's narrow columns.
import { reelsFor } from "@/lib/exercise-reels";
import { cn } from "@/lib/cn";

export function ReelLinks({
  name,
  short,
  className,
}: {
  name: string;
  short?: boolean;
  className?: string;
}) {
  const reels = reelsFor(name);
  if (reels.length === 0) return null;
  const label = (i: number) =>
    short
      ? reels.length > 1
        ? `Instagram ${i + 1} ↗`
        : "Instagram ↗"
      : reels.length > 1
        ? `Instagram video ${i + 1} ↗`
        : "Watch the Instagram video ↗";
  return (
    <p className={cn("flex flex-wrap gap-x-3 text-xs", className)}>
      {reels.map((url, i) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Watch ${name} on Instagram${reels.length > 1 ? ` (video ${i + 1})` : ""}`}
          className="text-ink-soft transition-colors hover:text-jade-strong hover:underline"
        >
          {label(i)}
        </a>
      ))}
    </p>
  );
}
