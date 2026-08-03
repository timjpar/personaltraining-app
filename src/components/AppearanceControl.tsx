"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveThemePrefs } from "@/app/theme-actions";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  THEMES,
  ACCENTS,
  THEME_LABELS,
  ACCENT_META,
  type Theme,
  type Accent,
} from "@/lib/theme";

// Applies a draft straight to <html> so the whole app previews live while the
// dialog is open. The server action makes it durable; this just avoids a
// round-trip between clicking a swatch and seeing it.
function preview(theme: Theme, accent: Accent) {
  const el = document.documentElement;
  el.dataset.theme = theme;
  el.dataset.accent = accent;
  el.style.colorScheme = theme;
}

export function AppearanceControl({
  theme,
  accent,
  firstRun = false,
}: {
  theme: Theme;
  accent: Accent;
  // No choice stored yet — greet the user with the prompt instead of waiting
  // for them to find the button.
  firstRun?: boolean;
}) {
  const [open, setOpen] = useState(firstRun);
  const [showSchemes, setShowSchemes] = useState(false);
  const [draftTheme, setDraftTheme] = useState<Theme>(theme);
  const [draftAccent, setDraftAccent] = useState<Accent>(accent);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) preview(draftTheme, draftAccent);
  }, [open, draftTheme, draftAccent]);

  const commit = (nextTheme: Theme, nextAccent: Accent) => {
    preview(nextTheme, nextAccent);
    startTransition(async () => {
      await saveThemePrefs(nextTheme, nextAccent);
      setOpen(false);
      setShowSchemes(false);
    });
  };

  const cancel = () => {
    // Put back whatever the server last stored.
    preview(theme, accent);
    setDraftTheme(theme);
    setDraftAccent(accent);
    setShowSchemes(false);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Appearance"
        title="Appearance"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-colors hover:bg-card hover:text-ink"
      >
        {/* Half-filled circle — the conventional light/dark glyph. */}
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 3a7 7 0 000 14z" fill="currentColor" />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5"
          onMouseDown={(e) => {
            // Backdrop click closes — but never on first run, where a choice
            // is the whole point.
            if (!firstRun && !panelRef.current?.contains(e.target as Node)) cancel();
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="appearance-title"
            onKeyDown={(e) => {
              if (e.key === "Escape" && !firstRun) cancel();
            }}
            className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-[var(--shadow-card)]"
          >
            <p className="eyebrow text-ink-soft">
              {firstRun ? "Welcome" : "Appearance"}
            </p>
            <h2
              id="appearance-title"
              className="mt-1 font-display text-xl font-semibold text-ink"
            >
              {showSchemes ? "Pick a colour" : "How should Chalkline look?"}
            </h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              {showSchemes
                ? "The accent carries actions and completed work. You can change it any time."
                : "You can change this any time from the header."}
            </p>

            {showSchemes ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {ACCENTS.map((a) => {
                    const active = draftAccent === a;
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setDraftAccent(a)}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm transition-colors",
                          active
                            ? "border-jade bg-jade-wash text-ink"
                            : "border-line text-ink-soft hover:bg-paper",
                        )}
                      >
                        <span
                          className="h-4 w-4 shrink-0 rounded-full"
                          style={{ background: ACCENT_META[a][draftTheme] }}
                          aria-hidden
                        />
                        {ACCENT_META[a].label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => commit(draftTheme, draftAccent)}
                    className={buttonClass("primary")}
                  >
                    {pending ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSchemes(false)}
                    className={buttonClass("ghost")}
                  >
                    Back
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {THEMES.map((t) => {
                    const active = draftTheme === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setDraftTheme(t);
                          commit(t, draftAccent);
                        }}
                        onMouseEnter={() => setDraftTheme(t)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-[var(--radius-card)] border p-3 text-left transition-colors",
                          active ? "border-jade" : "border-line hover:bg-paper",
                        )}
                      >
                        {/* Miniature of the app in that theme. */}
                        <span
                          className="block rounded-[var(--radius-sm)] border p-2"
                          style={{
                            background: t === "dark" ? "#101413" : "#eaeeec",
                            borderColor: t === "dark" ? "#2a3532" : "#d9e0dd",
                          }}
                          aria-hidden
                        >
                          <span
                            className="block h-1.5 w-10 rounded-full"
                            style={{ background: ACCENT_META[draftAccent][t] }}
                          />
                          <span
                            className="mt-1.5 block h-1.5 w-16 rounded-full"
                            style={{ background: t === "dark" ? "#2a3532" : "#d9e0dd" }}
                          />
                          <span
                            className="mt-1.5 block h-1.5 w-12 rounded-full"
                            style={{ background: t === "dark" ? "#2a3532" : "#d9e0dd" }}
                          />
                        </span>
                        <span className="mt-2.5 block text-sm font-medium text-ink">
                          {THEME_LABELS[t]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowSchemes(true)}
                  className={cn(buttonClass("outline"), "mt-3 w-full")}
                >
                  Choose a different colour scheme
                </button>

                {firstRun ? null : (
                  <button
                    type="button"
                    onClick={cancel}
                    className={cn(buttonClass("ghost"), "mt-2 w-full")}
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
