"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { logout } from "./logout-action";
import { cn } from "@/lib/cn";

// Identity and the way out of the app, in one control.
//
// These used to be two things sitting in the top bar — a name/role block and a
// "Sign out" button — and between them they wanted about 150px on a line that
// hasn't got it. The row is capped at max-w-5xl, so 960px is the whole budget
// no matter how wide the window is: the wordmark takes 118, the trainer's nine
// pills take 674, and what's left over for the account is 136. The name was the
// flex item that gave way, and it gave way all the way down to "Ti…".
//
// Collapsing both into a 32px avatar is what buys the line back. The name isn't
// shortened here, it's moved: the panel is 224px wide and free to wrap, so the
// one place the name is written in full is the place it can't be clipped.
export function AccountMenu({
  name,
  roleLabel,
  photoUrl,
}: {
  name: string;
  roleLabel: string;
  photoUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    // Dismissal is the picker idiom from FoodPicker: focus leaving the wrapper
    // closes it, which covers a click anywhere else, a Tab out, and the click
    // on the trigger that toggles it shut. relatedTarget is null for a click on
    // something unfocusable, and null is not contained — so that closes too.
    <div
      className="relative shrink-0"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          // Escape should leave the keyboard where it started, not on <body>.
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        // The visible name below lg is decoration for this label, not a
        // replacement — at lg the avatar is on its own and still has to say
        // whose it is.
        aria-label={`Account: ${name}, ${roleLabel}`}
        className={cn(
          "flex h-11 items-center gap-2 rounded-[8px] px-1 transition-colors hover:bg-card sm:h-8",
          open && "bg-card",
        )}
      >
        <Avatar name={name} src={photoUrl} className="h-8 w-8" />
        {/* Shown only where the line can afford it. Below sm the bar is
            identity-free by design; from lg the pill row is back and this is
            exactly the 150px that didn't fit. min-w-0 with truncate keeps a
            pathological name from pushing the row wide in between. */}
        <span className="hidden min-w-0 text-left leading-tight sm:block lg:hidden">
          <span className="block truncate text-sm font-medium text-ink">
            {name}
          </span>
          <span className="eyebrow block truncate text-ink-soft">
            {roleLabel}
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-40 mt-1 w-56 rounded-[var(--radius-card)] border border-line bg-card py-1 shadow-[var(--shadow-card)]"
        >
          {/* The full name, wrapping rather than truncating — this panel is the
              one surface that owes the reader every character of it. */}
          <div className="flex items-center gap-2.5 px-3 py-2">
            <Avatar name={name} src={photoUrl} />
            <span className="min-w-0">
              <span className="block break-words text-sm font-medium text-ink">
                {name}
              </span>
              <span className="eyebrow block text-ink-soft">{roleLabel}</span>
            </span>
          </div>

          <div className="my-1 h-px bg-line" aria-hidden />

          <form action={logout}>
            {/* min-h-11 on touch widths for the same reason every other control
                in this header carries it — the row is a thumb target before
                it's a menu item. */}
            <button
              type="submit"
              role="menuitem"
              className="flex min-h-11 w-full items-center px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-paper hover:text-ink sm:min-h-0"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
