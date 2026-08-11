"use client";

// A set of string keys kept in localStorage, read the way barcode.ts reads the
// pointer: through useSyncExternalStore rather than latched into state by an
// effect.
//
// The mechanism is doing real work here, not showing off. Reading localStorage
// during render is a hydration mismatch — the server has no storage — and
// reading it in an effect means the component renders once with the wrong
// answer and the store is no longer the source of truth. The third argument is
// the fix: on the server, and on the hydrating render, the snapshot is null and
// the caller falls back to its defaults, so both renders agree. React swaps in
// the stored value on the commit after hydration.
//
// The cost is honest and worth naming: the reader sees the default selection
// for one frame before their own appears. The upgrade, if that ever grates, is
// a client-written cookie read server-side — the shape pt_theme and pt_accent
// already use — which costs a round-trip's worth of nothing and removes the
// flip entirely.

import { useCallback, useMemo, useSyncExternalStore } from "react";

// The `storage` event fires in *other* tabs, never the one that wrote. Without
// a local listener set, a toggle would update storage and nothing on screen.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Every access is wrapped. localStorage is not "usually there" — it throws
// outright when cookies are blocked, and Safari's private mode has historically
// thrown on write. A chart is not worth taking the page down for.
function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable. The selection still lives in this render's snapshot
    // for the rest of the visit; it just won't outlast it.
  }
  for (const l of listeners) l();
}

/**
 * `fallback` and `valid` must be module-level constants at the call site. A
 * fresh array or Set each render re-runs the parse every time and defeats the
 * memo.
 */
export function useStoredSet(
  key: string,
  fallback: readonly string[],
  valid: ReadonlySet<string>,
): [ReadonlySet<string>, (next: ReadonlySet<string>) => void] {
  // Returns the raw string, not a parsed Set. useSyncExternalStore compares
  // snapshots with Object.is, so handing back a fresh Set each call would throw
  // "The result of getSnapshot should be cached" and spin. Parsing happens in
  // the memo below, where a new object per change is exactly right.
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );

  const selected = useMemo<ReadonlySet<string>>(() => {
    if (raw == null) return new Set(fallback);
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set(fallback);
      // Unknown keys are dropped rather than kept. A metric removed in a later
      // release would otherwise sit in storage and come back as a phantom
      // selection the reader can't see or clear. An empty result is left empty:
      // "I turned everything off" is a choice, not a corrupt value.
      return new Set(
        parsed.filter((k): k is string => typeof k === "string" && valid.has(k)),
      );
    } catch {
      return new Set(fallback);
    }
  }, [raw, fallback, valid]);

  const store = useCallback(
    (next: ReadonlySet<string>) => write(key, JSON.stringify([...next])),
    [key],
  );

  return [selected, store];
}
