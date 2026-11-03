"use client";

// Puts an editor on the page's undo history (undo-stack.ts) and gives it
// Ctrl+S / Cmd+S.
//
// Every change to one of the editor's own fields — a box typed in and left, a
// select picked, a box ticked — is recorded as a step, read straight off the
// DOM, which is where an uncontrolled form keeps its values. Undo writes the
// old value back the way the browser would, with an input or change event or
// a click, so a field React controls hears about it too. Fields whose value
// lives in a useUndoHistory are left to that.
//
// A form saves with its button marked data-save, through requestSubmit, so
// the browser's own checks run and a pending save can't be sent twice. Any
// other editor passes `save`.
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  editorOf,
  isApplying,
  isStateField,
  record,
  retain,
  textField,
} from "@/components/undo-stack";

type Value = string | boolean | null;
type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const SKIP = new Set(["hidden", "submit", "button", "reset", "image", "file"]);

function control(el: EventTarget | null): Control | null {
  if (el instanceof HTMLInputElement) return SKIP.has(el.type) ? null : el;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return el;
  return null;
}

const isBox = (el: Control): el is HTMLInputElement =>
  el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio");

function radios(root: HTMLElement, name: string) {
  return [...root.querySelectorAll<HTMLInputElement>("input[type=radio]")].filter(
    (r) => r.name === name,
  );
}

function read(root: HTMLElement, el: Control): Value {
  if (el instanceof HTMLInputElement && el.type === "radio") {
    return radios(root, el.name).find((r) => r.checked)?.value ?? null;
  }
  if (el instanceof HTMLInputElement && el.type === "checkbox") return el.checked;
  return el.value;
}

// The field a step was recorded on, or the one that has replaced it: a row
// that moves between sections remounts its inputs under the same names.
function find(root: HTMLElement, el: Control): Control | null {
  if (el.isConnected && root.contains(el)) return el;
  if (!el.name) return null;
  const all = [...root.querySelectorAll<Control>("input, textarea, select")].filter(
    (c) => c.name === el.name && (!isBox(el) || el.type === "radio" || c.value === el.value),
  );
  return all.length === 1 || (el.type === "radio" && all.length > 0) ? all[0] : null;
}

const setValue = (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, v: string) => {
  // The prototype's setter, not the element's: React tracks the last value
  // it saw through the element's own property, and only an event carrying a
  // value it didn't set reaches a controlled field's onChange.
  const proto = Object.getPrototypeOf(el) as object;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
};

function write(root: HTMLElement, recorded: Control, value: Value): boolean {
  const el = find(root, recorded);
  if (!el || el.disabled) return false;
  if (read(root, el) === value) return false;
  if (el instanceof HTMLInputElement && el.type === "radio") {
    const target = radios(root, el.name).find((r) => r.value === value);
    if (target) target.click();
    else for (const r of radios(root, el.name)) r.checked = false;
  } else if (el instanceof HTMLInputElement && el.type === "checkbox") {
    // A click rather than setting `checked`: it's the event React listens to.
    el.click();
  } else {
    setValue(el, String(value ?? ""));
  }
  el.scrollIntoView({ block: "nearest" });
  return true;
}

export function useFieldHistory(
  ref: RefObject<HTMLElement | null>,
  options: { save?: () => void } = {},
) {
  const [owner] = useState(() => ({}));
  const saveRef = useRef(options.save);
  useEffect(() => {
    saveRef.current = options.save;
  });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // What each field held before the change about to happen to it, read on
    // the way in so it's there when `change` fires. A text field's is what it
    // held when focused, so one visit's typing is one step; a radio group's is
    // kept by name, since the radio a change fires on isn't the one that was
    // checked.
    const before = new Map<Control | string, Value>();
    const slot = (el: Control) =>
      el instanceof HTMLInputElement && el.type === "radio" ? `radio:${el.name}` : el;
    const note = (e: Event) => {
      const el = control(e.target);
      if (!el || !root.contains(el)) return;
      const key = slot(el);
      const text = textField(el) != null;
      const fresh = e.type === "focusin" ? text : !text && typeof key !== "string";
      if (fresh || !before.has(key)) before.set(key, read(root, el));
    };
    // Everything there at the start, so even a change that arrives with no
    // focus or press first — a password manager, a test — has a before.
    for (const el of root.querySelectorAll("input, textarea, select")) {
      const c = control(el);
      if (c) before.set(slot(c), read(root, c));
    }

    // On the document, after React's own listener there, so a field whose
    // onChange records a state step is already marked as one by now.
    const onChange = (e: Event) => {
      const el = control(e.target);
      if (!el || editorOf(el)?.owner !== owner || isStateField(el)) return;
      const key = slot(el);
      const next = read(root, el);
      // Undo itself writing the field: what it holds now is where the next
      // change starts from.
      if (isApplying()) {
        before.set(key, next);
        return;
      }
      const prev =
        el instanceof HTMLInputElement && el.type === "checkbox" ? !el.checked : before.get(key);
      before.set(key, next);
      if (prev === undefined || prev === next) return;
      record({
        owner,
        at: el,
        undo: () => write(root, el, prev),
        redo: () => write(root, el, next),
      });
    };

    const save = () => {
      if (saveRef.current) return saveRef.current();
      if (!(root instanceof HTMLFormElement)) return;
      const button = root.querySelector<HTMLButtonElement>("button[data-save]");
      if (button && !button.disabled) root.requestSubmit(button);
    };
    const savable = Boolean(saveRef.current) || root.querySelector("button[data-save]") != null;

    root.addEventListener("focusin", note);
    root.addEventListener("pointerdown", note, true);
    root.addEventListener("keydown", note, true);
    document.addEventListener("change", onChange);
    const release = retain(owner, { root, save: savable ? save : undefined });
    return () => {
      root.removeEventListener("focusin", note);
      root.removeEventListener("pointerdown", note, true);
      root.removeEventListener("keydown", note, true);
      document.removeEventListener("change", onChange);
      release();
    };
  }, [ref, owner]);
}
