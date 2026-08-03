// Turns a pasted video URL into something embeddable.
//
// Nothing is ever downloaded or copied: we store the trainer's original URL and
// derive the platform's own embed URL at render time. The video keeps living on
// YouTube/Instagram/Facebook/TikTok, and we hold nothing but a string.
//
// Deriving at render (rather than storing the embed URL) means improving this
// parser retroactively fixes every link already saved.
//
// Data-only: imported by a client component.

export type VideoProvider = "YOUTUBE" | "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINK";

export type ParsedVideo = {
  provider: VideoProvider;
  label: string;
  // Absent for LINK — nothing embeddable, so callers render a plain link out.
  embedUrl?: string;
  // CSS aspect-ratio. Shorts/Reels/TikToks are portrait; the rest are 16:9.
  aspect: string;
};

export const PROVIDER_LABELS: Record<VideoProvider, string> = {
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  LINK: "Link",
};

const PORTRAIT = "9 / 16";
const LANDSCAPE = "16 / 9";

function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

const host = (u: URL) => u.hostname.replace(/^www\./, "").toLowerCase();

export function parseVideoUrl(raw: string): ParsedVideo {
  const fallback: ParsedVideo = { provider: "LINK", label: "Link", aspect: LANDSCAPE };
  const u = safeUrl(raw);
  if (!u) return fallback;

  const h = host(u);
  const parts = u.pathname.split("/").filter(Boolean);

  // ---- YouTube -----------------------------------------------------------
  if (h === "youtu.be" && parts[0]) {
    return yt(parts[0], LANDSCAPE);
  }
  if (h === "youtube.com" || h === "m.youtube.com" || h === "music.youtube.com") {
    const v = u.searchParams.get("v");
    if (v) return yt(v, LANDSCAPE);
    // /shorts/ID is portrait; /embed/ID and /live/ID are already embeddable.
    if (parts[0] === "shorts" && parts[1]) return yt(parts[1], PORTRAIT);
    if ((parts[0] === "embed" || parts[0] === "live") && parts[1]) {
      return yt(parts[1], LANDSCAPE);
    }
  }

  // ---- Instagram ---------------------------------------------------------
  // /p/CODE, /reel/CODE and /tv/CODE all take a trailing /embed.
  if (h === "instagram.com") {
    const kind = parts[0];
    const code = parts[1];
    if ((kind === "p" || kind === "reel" || kind === "reels" || kind === "tv") && code) {
      const seg = kind === "reels" ? "reel" : kind;
      return {
        provider: "INSTAGRAM",
        label: "Instagram",
        embedUrl: `https://www.instagram.com/${seg}/${encodeURIComponent(code)}/embed`,
        // Instagram's embed adds its own header/footer chrome, so even a square
        // post needs a taller box than the media itself.
        aspect: seg === "p" ? "4 / 5" : PORTRAIT,
      };
    }
  }

  // ---- TikTok ------------------------------------------------------------
  // Only the canonical /@user/video/ID form carries the id. Short vm.tiktok.com
  // links redirect, and resolving them would mean a network call at render —
  // so those degrade to a plain link rather than silently failing to embed.
  // vm./vt. are the short links the TikTok app copies; they carry no id.
  if (h === "tiktok.com" || h.endsWith(".tiktok.com")) {
    const idx = parts.indexOf("video");
    const id = idx >= 0 ? parts[idx + 1] : undefined;
    if (id && /^\d+$/.test(id)) {
      return {
        provider: "TIKTOK",
        label: "TikTok",
        embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
        aspect: PORTRAIT,
      };
    }
    return { ...fallback, provider: "TIKTOK", label: "TikTok" };
  }

  // ---- Facebook ----------------------------------------------------------
  // The video plugin takes the original URL, so no id parsing is needed.
  if (h === "facebook.com" || h === "fb.watch" || h === "web.facebook.com") {
    const isReel = parts[0] === "reel" || u.pathname.includes("/reels/");
    return {
      provider: "FACEBOOK",
      label: "Facebook",
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        u.toString(),
      )}&show_text=false`,
      aspect: isReel ? PORTRAIT : LANDSCAPE,
    };
  }

  return fallback;
}

function yt(id: string, aspect: string): ParsedVideo {
  return {
    provider: "YOUTUBE",
    label: "YouTube",
    // youtube-nocookie avoids setting tracking cookies on your clients until
    // they actually press play.
    embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`,
    aspect,
  };
}
