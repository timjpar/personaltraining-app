// Appearance preferences. Data-only on purpose: this module is imported by
// client components, so it must not pull in next/headers. Cookie reading lives
// in theme-server.ts.

export const THEME_COOKIE = "pt_theme";
export const ACCENT_COOKIE = "pt_accent";

// A year — appearance is a preference, not a session.
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

// Dark is the product default; a visitor who has never chosen gets it.
export const DEFAULT_THEME: Theme = "dark";

export const ACCENTS = ["jade", "indigo", "ember", "violet", "slate"] as const;
export type Accent = (typeof ACCENTS)[number];

export const DEFAULT_ACCENT: Accent = "jade";

export const THEME_LABELS: Record<Theme, string> = {
  dark: "Dark",
  light: "Light",
};

// Swatch colors for the picker UI. These duplicate the accent values in
// globals.css because CSS variables can't be read before the theme is applied —
// the picker has to show all five at once, in colors other than the active one.
export const ACCENT_META: Record<
  Accent,
  { label: string; dark: string; light: string }
> = {
  jade: { label: "Jade", dark: "#2fa886", light: "#0e8a6c" },
  indigo: { label: "Indigo", dark: "#6d8bff", light: "#3b5bdb" },
  ember: { label: "Ember", dark: "#e8734f", light: "#c2542f" },
  violet: { label: "Violet", dark: "#a78bfa", light: "#6d4bd0" },
  slate: { label: "Slate", dark: "#94a7b1", light: "#4a5b64" },
};

export function toTheme(value: unknown): Theme {
  const v = String(value ?? "");
  return (THEMES as readonly string[]).includes(v) ? (v as Theme) : DEFAULT_THEME;
}

export function toAccent(value: unknown): Accent {
  const v = String(value ?? "");
  return (ACCENTS as readonly string[]).includes(v) ? (v as Accent) : DEFAULT_ACCENT;
}
