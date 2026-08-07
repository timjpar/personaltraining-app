"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./Wordmark";
import { logout } from "./logout-action";
import { AppearanceControl } from "./AppearanceControl";
import { NavIcon, type IconName } from "./NavIcon";
import { cn } from "@/lib/cn";
import type { Theme, Accent } from "@/lib/theme";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
};

export function AppHeader({
  name,
  roleLabel,
  navItems,
  theme,
  accent,
  themeChosen,
  adminHref,
}: {
  name: string;
  roleLabel: string;
  navItems: NavItem[];
  theme: Theme;
  accent: Accent;
  themeChosen: boolean;
  // Set for admins only. It lives up here rather than in the tab bar because
  // the bar has no scroll and is already at its cell budget — and because
  // owner tools aren't a destination you reach for one-handed mid-session.
  adminHref?: string;
}) {
  const pathname = usePathname();

  // Longest matching nav href wins, so nested routes highlight one item.
  const activeHref = navItems
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      {/* ---- Top bar -------------------------------------------------------
          On a phone this carries identity and account only — the destinations
          moved to the tab bar below. That is what buys back the horizontal
          room: previously six links, the theme control and Sign out fought
          over 375px, and the loser was clipped mid-word. */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:h-16 sm:gap-6 sm:px-8">
          <Wordmark />

          {/* lg, not sm: the row of pills needs ~570px and the cluster to its
              right needs ~260, so below 1024 it doesn't fit and the last item
              used to be drawn underneath Sign out. Under that width the tab
              bar below is the navigation, which is what it's for. The
              overflow-x is a safety net for a long name or a translated
              label — it scrolls rather than overlapping. */}
          <nav className="hidden min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activeHref === item.href ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-sm font-medium transition-colors",
                  activeHref === item.href
                    ? // text-paper, not text-white: both tokens invert with the
                      // theme, so this stays legible in dark mode where `ink`
                      // is the light colour.
                      "bg-ink text-paper"
                    : "text-ink-soft hover:bg-card hover:text-ink",
                )}
              >
                {item.label}
                {item.badge ? (
                  <span
                    className={cn(
                      "metric grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[0.625rem] font-semibold",
                      activeHref === item.href
                        ? "bg-paper/20 text-paper"
                        : "bg-jade text-white",
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-4">
            {adminHref ? (
              <Link
                href={adminHref}
                aria-label="Owner tools"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-colors hover:bg-card hover:text-ink sm:h-8 sm:w-8"
              >
                <NavIcon name="admin" className="h-5 w-5" />
              </Link>
            ) : null}
            <AppearanceControl
              theme={theme}
              accent={accent}
              firstRun={!themeChosen}
            />
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-ink">{name}</p>
              <p className="eyebrow text-ink-soft">{roleLabel}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="grid h-11 place-items-center whitespace-nowrap px-2 text-sm text-ink-soft transition-colors hover:text-ink sm:h-auto sm:px-0"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ---- Tab bar (phones and tablets) -----------------------------------
          Fixed to the bottom, where a thumb actually reaches. Every
          destination is visible at once — no scrolling, so the active tab is
          never off-screen the way it was on /library. Labels stay: seven icons
          alone would be a guessing game, and "Programs" vs "Workouts" is
          exactly the pair that needs words. At seven cells a label has ~53px
          on a 375px screen, which is why they're all one short word. */}
      <nav
        aria-label="Sections"
        className="safe-b fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur lg:hidden"
      >
        <ul className="flex items-stretch">
          {navItems.map((item) => {
            const active = activeHref === item.href;
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-14 flex-col items-center justify-center gap-1 px-0.5 transition-colors",
                    active ? "text-jade-strong" : "text-ink-soft",
                  )}
                >
                  {/* The active marker is a short rule on the top edge —
                      the same hairline vocabulary the sheet uses elsewhere,
                      rather than a pill that would crowd six cells. */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-2 top-0 h-0.5 rounded-full transition-opacity",
                      active ? "bg-jade opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="relative">
                    <NavIcon name={item.icon} className="h-5 w-5" />
                    {item.badge ? (
                      <span className="metric absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-jade px-1 text-[0.5625rem] font-semibold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "w-full truncate text-center text-[0.625rem] leading-none",
                      active ? "font-semibold" : "font-medium",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
