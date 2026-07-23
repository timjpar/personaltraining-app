"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./Wordmark";
import { logout } from "./logout-action";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; badge?: number };

export function AppHeader({
  name,
  roleLabel,
  navItems,
}: {
  name: string;
  roleLabel: string;
  navItems: NavItem[];
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

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activeHref === item.href ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors",
                activeHref === item.href
                  ? "bg-ink text-white"
                  : "text-ink-soft hover:bg-card hover:text-ink",
              )}
            >
              {item.label}
              {item.badge ? (
                <span
                  className={cn(
                    "metric grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[0.625rem] font-semibold",
                    activeHref === item.href
                      ? "bg-white/20 text-white"
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
