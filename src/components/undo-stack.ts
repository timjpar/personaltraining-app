"use client";

// One undo history for the page, shared by every editor on it, and the keys
// that drive it: Ctrl+Z / Cmd+Z to undo, Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y
// to redo, Ctrl+S / Cmd+S to save.
//
// Two kinds of editor write steps here. A form's own fields — the uncontrolled
// inputs most forms are made of — are recorded straight off the DOM by
// useFieldHistory. Editors whose edits live in React state (the plan builder's
// meals, the workout builder's rows, the board, the day log) record snapshots
// through useUndoHistory. One stack for both means a page that has both, like
// the plan builder's title above its meals, undoes in the order things were
// done rather than one kind first.
//
// Nothing here talks to the server. Undo puts an earlier value back on screen,
// and the editor's own save is what sends it.
import { useSyncExternalStore } from "react";

export type Step = {
  // The editor the step belongs to. Its steps go when it unmounts.
  owner: object;
  // Typing in one field, one focus at a time, is one step: a step with the
  // same group as the last one folds into it rather than adding another.
  group?: object | null;
  // What was being edited, so Ctrl+S with nothing focused saves the editor
  // the last change was made in.
  at: Element | null;
  // Each says whether it changed anything. One that finds its value already
  // in place is passed over, so a press is never spent on nothing.
  undo: () => boolean;
  redo: () => boolean;
};

export type Editor = {
  owner: object;
  root: HTMLElement;
  save?: () => void;
};

// Steps kept. A snapshot shares every row it didn't change with its
// neighbours, so this costs far less than this many copies of a plan.
const CAP = 200;

let past: Step[] = [];
let future: Step[] = [];
let applying = false;
const editors = new Set<Editor>();
let users = 0;

type Availability = { canUndo: boolean; canRedo: boolean };
const NONE: Availability = { canUndo: false, canRedo: false };
let availability = NONE;
const listeners = new Set<() => void>();

function emit() {
  const next = { canUndo: past.length > 0, canRedo: future.length > 0 };
  if (next.canUndo !== availability.canUndo || next.canRedo !== availability.canRedo) {
    availability = next;
    for (const l of listeners) l();
  }
}

// True while a step is being put back, so the edits that causes aren't
// recorded as new steps.
export const isApplying = () => applying;

export function record(step: Step) {
  if (applying) return;
  const last = past[past.length - 1];
  if (step.group && last && last.group === step.group && last.owner === step.owner) {
    past[past.length - 1] = { ...last, redo: step.redo };
  } else {
    past.push(step);
    if (past.length > CAP) past.shift();
  }
  future = [];
  emit();
}

function move(from: Step[], to: Step[], run: (s: Step) => boolean): boolean {
  applying = true;
  try {
    while (from.length > 0) {
      const s = from.pop()!;
      to.push(s);
      if (run(s)) return true;
    }
    return false;
  } finally {
    applying = false;
    emit();
  }
}

export const undo = () => move(past, future, (s) => s.undo());
export const redo = () => move(future, past, (s) => s.redo());

export function forget(owner: object) {
  past = past.filter((s) => s.owner !== owner);
  future = future.filter((s) => s.owner !== owner);
  emit();
}

export function useUndoAvailability(): Availability {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => availability,
    () => NONE,
  );
}

// ---- Fields -----------------------------------------------------------------

export type TextField = HTMLInputElement | HTMLTextAreaElement;

const TEXT_TYPES = new Set(["text", "search", "number", "email", "tel", "url", "password"]);

// A field the browser keeps its own typing history for.
export function textField(el: EventTarget | null): TextField | null {
  if (el instanceof HTMLTextAreaElement) return el;
  if (el instanceof HTMLInputElement && TEXT_TYPES.has(el.type)) return el;
  return null;
}

// Fields whose value lives in a useUndoHistory's state. Their changes are
// already steps there, so useFieldHistory leaves them alone.
const stateFields = new WeakSet<Element>();
export const isStateField = (el: Element) => stateFields.has(el);

// Called as a state editor records a step: the event behind it, if it came
// from a field, marks that field as one the state speaks for.
export function eventField(): Element | null {
  const target = typeof window === "undefined" ? null : window.event?.target;
  if (!(target instanceof Element)) return null;
  if (target.matches("input, textarea, select")) stateFields.add(target);
  return target;
}

// One token per visit to a text field. Typing steps carry it, so one visit's
// typing is one step and the next visit starts another.
const visits = new WeakMap<Element, object>();
const visitOf = (field: Element) => {
  let v = visits.get(field);
  if (!v) visits.set(field, (v = {}));
  return v;
};

// The group for a state step: the visit, when the step is typing.
export function typingGroup(): object | null {
  const e = typeof window === "undefined" ? undefined : window.event;
  if (e?.type !== "input") return null;
  const field = textField(e.target);
  return field ? visitOf(field) : null;
}

// ---- Keys -------------------------------------------------------------------

// What each text field held when it was focused, and what it held after the
// last thing typed into it. Between the two, the field's own undo has work to
// do, so the keys are left to the browser; once it's back where it started,
// or something other than typing has rewritten it (which empties the
// browser's history for it), the page's history takes over.
const start = new WeakMap<TextField, string>();
const typed = new WeakMap<TextField, string>();
// Fields the browser has just undone in, whose own redo goes first.
const redoable = new WeakSet<TextField>();

export const startValue = (field: TextField) => start.get(field) ?? field.value;

function onFocus(e: FocusEvent) {
  const field = textField(e.target);
  if (!field) return;
  start.set(field, field.value);
  typed.delete(field);
  redoable.delete(field);
  visits.set(field, {});
}

function onInput(e: Event) {
  const field = textField(e.target);
  if (!field || !e.isTrusted) return;
  typed.set(field, field.value);
  if (e instanceof InputEvent && e.inputType === "historyUndo") redoable.add(field);
  else if (!(e instanceof InputEvent && e.inputType === "historyRedo")) redoable.delete(field);
}

// The editor a field belongs to: the innermost, since one can sit inside
// another — a progression path's editor inside a workout's form.
export function editorOf(el: Element | null): Editor | undefined {
  if (!el?.isConnected) return undefined;
  let found: Editor | undefined;
  for (const ed of editors) {
    if (ed.root.contains(el) && (!found || found.root.contains(ed.root))) found = ed;
  }
  return found;
}

// The editor Ctrl+S means: the one with focus, else the one last edited, else
// the only one there is.
function saveTarget(): Editor | undefined {
  const focused = editorOf(document.activeElement);
  if (focused) return focused.save ? focused : undefined;
  for (let i = past.length - 1; i >= 0; i--) {
    const ed = editorOf(past[i].at);
    if (ed?.save) return ed;
  }
  const savable = [...editors].filter((ed) => ed.save);
  return savable.length === 1 ? savable[0] : undefined;
}

// The letter pressed, on any keyboard layout.
function letter(e: KeyboardEvent): string {
  const k = e.key.toLowerCase();
  if (/^[a-z]$/.test(k)) return k;
  return e.code.startsWith("Key") ? e.code.slice(3).toLowerCase() : k;
}

function onKey(e: KeyboardEvent) {
  if (e.defaultPrevented || e.isComposing || e.altKey) return;
  if (!(e.metaKey || e.ctrlKey)) return;
  const key = letter(e);

  if (key === "s" && !e.shiftKey) {
    // Never the browser's "save page as" while an editor is open; it saves
    // HTML nobody wants.
    e.preventDefault();
    if (!e.repeat) saveTarget()?.save?.();
    return;
  }

  const isUndo = key === "z" && !e.shiftKey;
  const isRedo = (key === "z" && e.shiftKey) || (key === "y" && e.ctrlKey && !e.shiftKey);
  if (!isUndo && !isRedo) return;

  const field = textField(e.target);
  if (field) {
    // A search box in the header has nothing to do with the editor.
    if (!editorOf(field)) return;
    const own = typed.get(field) === field.value;
    if (isUndo && own && field.value !== startValue(field)) return;
    if (isRedo && own && redoable.has(field)) return;
  }
  e.preventDefault();
  if (isUndo) undo();
  else redo();
  if (field) {
    // Whatever the step did to the field is now where its typing starts.
    requestAnimationFrame(() => {
      start.set(field, field.value);
      typed.delete(field);
      redoable.delete(field);
      visits.set(field, {});
    });
  }
}

// Every editor holds the keys while it's mounted, and gives back its steps
// when it goes.
export function retain(owner: object, editor?: Omit<Editor, "owner">): () => void {
  const entry = editor ? { owner, ...editor } : null;
  if (entry) editors.add(entry);
  if (users++ === 0) {
    const active = textField(document.activeElement);
    if (active) start.set(active, active.value);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKey);
  }
  return () => {
    if (entry) editors.delete(entry);
    forget(owner);
    if (--users === 0) {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onKey);
    }
  };
}
