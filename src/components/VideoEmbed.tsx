"use client";

import { useState } from "react";
import { parseVideoUrl } from "@/lib/video-embed";
import { cn } from "@/lib/cn";

// Click-to-load. The iframe is only mounted once the athlete asks for it, so a
// nine-exercise session makes zero requests to YouTube/Meta/TikTok on load —
// which matters on a phone in a gym, and means those platforms aren't handed a
// view of the whole session either.
export function VideoEmbed({
  url,
  name,
  className,
}: {
  url: string;
  name: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const video = parseVideoUrl(url);

  // Nothing embeddable — a short TikTok link, a Drive file, anything else.
  if (!video.embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "mt-2 inline-flex items-center gap-1 text-sm text-jade-strong hover:underline",
          className,
        )}
      >
        Watch demo ↗
      </a>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className={cn(
          "mt-2.5 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-paper px-3 py-2 text-sm text-ink transition-colors hover:border-jade",
          className,
        )}
      >
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-jade text-white"
          aria-hidden
        >
          <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6 4l11 6-11 6z" />
          </svg>
        </span>
        Watch demo
        <span className="eyebrow text-ink-soft/70">{video.label}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "mt-2.5 w-full overflow-hidden rounded-[var(--radius-sm)] border border-line",
        // Portrait formats would be absurdly tall at full width.
        video.aspect === "16 / 9" ? "max-w-lg" : "max-w-[280px]",
        className,
      )}
      style={{ aspectRatio: video.aspect }}
    >
      <iframe
        src={video.embedUrl}
        title={`${name} demonstration`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}
