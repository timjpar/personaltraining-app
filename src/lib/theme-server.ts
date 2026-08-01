// Server-side reads of the appearance cookies. Separate from theme.ts because
// next/headers can't be imported into a client component.

import { cookies } from "next/headers";
import {
  THEME_COOKIE,
  ACCENT_COOKIE,
  toTheme,
  toAccent,
  type Theme,
  type Accent,
} from "@/lib/theme";

export type ThemePrefs = {
  theme: Theme;
  accent: Accent;
  // False until the visitor has actually picked. Drives the first-run prompt —
  // and is why we can't just infer it from `theme` being the default.
  chosen: boolean;
};

export async function getThemePrefs(): Promise<ThemePrefs> {
  const store = await cookies();
  const raw = store.get(THEME_COOKIE)?.value;
  return {
    theme: toTheme(raw),
    accent: toAccent(store.get(ACCENT_COOKIE)?.value),
    chosen: Boolean(raw),
  };
}
