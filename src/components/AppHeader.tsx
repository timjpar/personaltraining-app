"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./Wordmark";
import { logout } from "./logout-action";
import { AppearanceControl } from "./AppearanceControl";
import { cn } from "@/lib/cn";
import type { Theme, Accent } from "@/lib/theme";

export type NavItem = { href: string; label: string; badge?: number };

export function AppHeader({
  name,
  roleLabel,
  navItems,
  theme,
  accent,
  themeChosen,
}: {
  name: string;
  roleLabel: string;
  navItems: NavItem[];
  theme: Theme;
  accent: Accent;
  themeChosen: boolean;
}) {
  const pathname = usePathname();

  // Longest matching nav href wins, so nested routes highlight one item.
  const activeHref = navItems
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-2 px-4 sm:gap-6 sm:px-8">
        <Wordmark responsive />

        {/* Six items don't fit a phone, so the row scrolls sideways rather than
            wrapping into the header or squashing the labels. The scrollbar is
            hidden — the overflowing item is the affordance. */}
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activeHref === item.href ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors",
                activeHref === item.href
                  // text-paper, not text-white: both tokens invert with the
                  // theme, so this stays legible in dark mode where `ink` is
                  // the light colour.
                  ? "bg-ink text-paper"
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

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
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
              className="whitespace-nowrap text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
