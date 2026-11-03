"use client";

// Undo and redo for an editor whose edits live in React state: the plan
// builder's meals, the workout builder's rows, the board's store, the day log.
// The browser already undoes typing inside one text field; what it can't take
// back is everything React did — a food removed, a row dragged, a unit picked
// — so each edit goes onto the page's history (undo-stack.ts) as a pair of
// snapshots, the state before and after.
//
// `set` is the editor's setState for edits. `replace` is for changes that
// aren't the user's, like fresh data from the server, so undo doesn't take
// them back. `reset` forgets this editor's steps, for after a save whose
// result can't be undone into.
import { useCallback, useEffect, useRef, useState } from "react";
import { eventField, isApplying, record, retain, forget, typingGroup } from "@/components/undo-stack";

// Typing back to where it started leaves a step that changes nothing; undo
// passes over those rather than spending a press on them.
const same = <T,>(a: T, b: T) => a === b || JSON.stringify(a) === JSON.stringify(b);

export function useUndoHistory<T>(
  initial: T | (() => T),
  options: {
    // Folds in what the state doesn't hold — the workout builder's
    // uncontrolled boxes — before a snapshot is put away, so a row brought
    // back by undo comes back with its sets and reps.
    capture?: (state: T) => T;
    // How an older snapshot goes back on screen, when some of the state isn't
    // the user's to undo (the board keeps workouts it loaded since).
    restore?: (snapshot: T, current: T) => T;
  } = {},
) {
  const [state, setState] = useState<T>(initial);
  // The present as of the last edit, ahead of the render it's waiting for, so
  // an edit can build on the one just before it in the same event and record
  // both steps itself — a state updater can run twice and mustn't record
  // anything.
  const present = useRef(state);
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });
  // The editor's identity on the page's history.
  const [owner] = useState(() => ({}));
  useEffect(() => retain(owner), [owner]);

  const commit = useCallback((next: T) => {
    present.current = next;
    setState(next);
  }, []);

  const apply = useCallback(
    (snapshot: T) => {
      const current = present.current;
      const next = opts.current.restore ? opts.current.restore(snapshot, current) : snapshot;
      if (same(next, current)) return false;
      commit(next);
      return true;
    },
    [commit],
  );

  const set = useCallback(
    (fn: (state: T) => T) => {
      const prev = present.current;
      const next = fn(prev);
      if (next === prev) return;
      const at = eventField();
      if (isApplying()) {
        commit(next);
        return;
      }
      const before = opts.current.capture?.(prev) ?? prev;
      commit(next);
      record({
        owner,
        group: typingGroup(),
        at,
        undo: () => apply(before),
        redo: () => apply(next),
      });
    },
    [commit, apply, owner],
  );

  const replace = useCallback(
    (fn: (state: T) => T) => {
      const next = fn(present.current);
      if (next !== present.current) commit(next);
    },
    [commit],
  );

  const reset = useCallback(() => forget(owner), [owner]);

  return { state, set, replace, reset };
}
