"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  THEME_COOKIE,
  ACCENT_COOKIE,
  THEME_COOKIE_MAX_AGE,
  toTheme,
  toAccent,
} from "@/lib/theme";

// Appearance is deliberately not tied to the user record: it's a device
// preference, it must work before any database round-trip, and it needs to be
// readable synchronously in the root layout to avoid a flash of the wrong theme.
export async function saveThemePrefs(theme: string, accent: string) {
  const store = await cookies();

  const options = {
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
    path: "/",
  };

  store.set(THEME_COOKIE, toTheme(theme), options);
  store.set(ACCENT_COOKIE, toAccent(accent), options);

  // The <html> attributes are rendered by the root layout, so the whole tree
  // has to re-render for the change to take effect.
  revalidatePath("/", "layout");
}
