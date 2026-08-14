"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Wordmark } from "./Wordmark";
import { AccountMenu } from "./AccountMenu";
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
  photoUrl,
  navItems,
  theme,
  accent,
  themeChosen,
  adminHref,
}: {
  name: string;
  roleLabel: string;
  // Build it with avatarUrl(); null is an account with no photo, which the
  // avatar draws as initials.
  photoUrl?: string | null;
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

  // What makes the scrolling tab bar below acceptable: whichever cell is
  // current gets scrolled into view, so a trainer landing on /exercises sees
  // the tab they're on rather than a row that starts at Activity.
  //
  // block: "nearest" is load-bearing — the default would scroll the *page* to
  // bring a fixed bottom bar into view, which on a long page yanks the reader
  // to the end of it. inline: "center" rather than "nearest" so the
  // neighbouring tabs are visible too; the point is orientation, not just
  // presence.
  const activeCellRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    activeCellRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [activeHref]);

  return (
    <>
      {/* ---- Top bar -------------------------------------------------------
          On a phone this carries identity and account only — the destinations
          moved to the tab bar below. That is what buys back the horizontal
          room: previously six links, the theme control and Sign out fought
          over 375px, and the loser was clipped mid-word.

          The same fight resurfaced at lg, where the pills come back onto a line
          capped at 960px and the ninth of them left the account cluster 136px.
          The account is one avatar-sized control now (AccountMenu) rather than
          a name, a role and a button, which is what settles it. */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
        {/* gap tightens at lg rather than loosening: that is the one width
            where the pill row has to share the line, and 24px twice over is
            room the nav needs more than the rhythm does. */}
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:h-16 sm:gap-6 sm:px-8 lg:gap-4">
          <Wordmark />

          {/* lg, not sm: the row of pills needs ~640px and the cluster to its
              right needs ~120, so below 1024 it doesn't fit and the last item
              used to be drawn underneath Sign out. Under that width the tab
              bar below is the navigation, which is what it's for. The
              overflow-x is a safety net for a translated label — it scrolls
              rather than overlapping.

              shrink-0 is what keeps that net from catching the normal case.
              The row is capped at max-w-5xl, so no window is ever wide enough
              to relieve it; without this the nav was the flex item that gave
              way, and it gave way by exactly the last pill's right padding —
              "Exercises" kept its label and lost the right edge of its hover
              highlight. Nothing beside it yields any more either: the cluster
              to the right is fixed-width controls now. What that costs is that
              nothing can absorb a tenth cell, so the budget is worth stating —
              at the trainer's nine, with the owner's key icon showing, this
              line has about 48px spare. */}
          <nav className="hidden min-w-0 shrink-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activeHref === item.href ? "page" : undefined}
                className={cn(
                  // px-1.5 rather than px-2 is where the last of the headroom
                  // came from: 4px off nine pills is 36px, which is three
                  // times what the row had left over otherwise.
                  "inline-flex shrink-0 items-center gap-1.5 rounded-[8px] px-1.5 py-1.5 text-sm font-medium transition-colors",
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

          {/* gap-2 from lg for the same reason the row's own gap tightens
              there: with the pills back, this cluster is working with 136px and
              two 16px gaps is a tenth of it. */}
          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-4 lg:gap-2">
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
            {/* Name, role and Sign out, in a control that fits. They were
                three items on this line and the line only ever had room for
                the last one, so the name arrived clipped to two letters — see
                AccountMenu for the arithmetic. */}
            <AccountMenu
              name={name}
              roleLabel={roleLabel}
              photoUrl={photoUrl}
            />
          </div>
        </div>
      </header>

      {/* ---- Tab bar (phones and tablets) -----------------------------------
          Fixed to the bottom, where a thumb actually reaches. Labels stay:
          eight icons alone would be a guessing game, and "Programs" vs
          "Workouts" is exactly the pair that needs words.

          `min-w-[3.75rem] flex-1` is the whole layout rule, and it does two
          jobs. When the cells fit they divide the width equally, which is what
          the bar has always done — the athlete's six still span a 375px screen
          edge to edge. When they don't, the row scrolls instead of crushing
          "Nutrition" into three letters. Only the trainer's eight cross that
          line today.

          Scrolling was previously ruled out here, on the grounds that it put
          the active tab off-screen the way it did on /library. That objection
          was right and is answered below rather than ignored: the effect
          centres the current cell on load, so arriving on a scrolled bar looks
          the same as arriving on a fixed one. */}
      <nav
        aria-label="Sections"
        className="safe-b fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur lg:hidden"
      >
        {/* The scrollbar is hidden with the same idiom the desktop pill row
            above uses. It would otherwise sit across the labels on any
            platform that draws a persistent one. */}
        <ul className="flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const active = activeHref === item.href;
            return (
              <li
                key={item.href}
                ref={active ? activeCellRef : undefined}
                className="min-w-[3.75rem] flex-1"
              >
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
