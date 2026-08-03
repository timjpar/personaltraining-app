"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Input } from "@/components/ui";
import { ExerciseFigure } from "@/components/ExerciseFigure";
import { archetypeFor } from "@/lib/exercise-archetypes";
import { cn } from "@/lib/cn";
import type { PickerCatalog } from "@/lib/exercise-catalog";
import {
  EXERCISE_PRESETS,
  normalizeExerciseName,
} from "@/lib/exercise-presets";

type Group = { label: string; names: string[] };

// The field stays an ordinary <input name=…>, so FormData carries the typed
// value whether or not the dropdown was ever opened — and whether or not
// JavaScript ran. The panel only adds suggestions on top of that.
export function ExercisePicker({
  name,
  defaultValue,
  catalog,
  preferredCategories,
  placeholder = "Exercise name",
  className,
  "aria-label": ariaLabel,
}: {
  name: string;
  defaultValue?: string | null;
  catalog: PickerCatalog;
  // Preset category labels to float to the top — a warm-up row opens on
  // warm-up movements. Everything else stays reachable below.
  preferredCategories?: readonly string[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const activeRef = useRef<HTMLDivElement | null>(null);

  const groups = useMemo<Group[]>(() => {
    const q = normalizeExerciseName(value);
    const seen = new Set<string>();
    const out: Group[] = [];

    // A name shows up once, in the first group that claims it: recent beats
    // mine beats presets. Two Enter targets for the same string would make
    // keyboard navigation feel broken.
    const push = (label: string, names: string[]) => {
      const picked: string[] = [];
      for (const n of names) {
        const key = normalizeExerciseName(n);
        if (seen.has(key) || (q && !key.includes(q))) continue;
        seen.add(key);
        picked.push(n);
      }
      if (q) {
        // Stable sort, so this only lifts prefix matches above interior ones.
        picked.sort(
          (a, b) =>
            Number(!normalizeExerciseName(a).startsWith(q)) -
            Number(!normalizeExerciseName(b).startsWith(q)),
        );
      }
      if (picked.length) out.push({ label, names: picked });
    };

    push("Recent", catalog.recent);
    push("My exercises", catalog.custom);

    const preferred = preferredCategories ?? [];
    const categories = [
      ...EXERCISE_PRESETS.filter((c) => preferred.includes(c.label)),
      ...EXERCISE_PRESETS.filter((c) => !preferred.includes(c.label)),
    ];
    for (const c of categories) push(c.label, c.exercises);

    return out;
  }, [value, catalog, preferredCategories]);

  const flat = useMemo(() => groups.flatMap((g) => g.names), [groups]);

  // Where each group starts in `flat`, so options can compute their own index
  // without a counter being mutated mid-render.
  const groupStart = useMemo(() => {
    let n = 0;
    return groups.map((g) => {
      const start = n;
      n += g.names.length;
      return start;
    });
  }, [groups]);

  // Keep the arrow-key highlight on screen. "nearest" makes this a no-op when
  // the option is already visible, so hovering with the mouse doesn't jump.
  useEffect(() => {
    if (active >= 0) activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const commit = (next: string) => {
    setValue(next);
    setOpen(false);
    setActive(-1);
  };

  const move = (delta: number) => {
    if (flat.length === 0) return;
    setActive((i) => {
      const next = i + delta;
      if (next < 0) return flat.length - 1;
      if (next >= flat.length) return 0;
      return next;
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      move(e.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (e.key === "Enter") {
      // Only swallow Enter while the panel is up, so the form still submits
      // normally from a closed field.
      if (!open) return;
      e.preventDefault();
      if (active >= 0 && flat[active]) commit(flat[active]);
      else setOpen(false);
      return;
    }

    if (e.key === "Escape") {
      if (!open) return;
      e.preventDefault();
      setOpen(false);
      setActive(-1);
      return;
    }

    // Tab closes and keeps whatever was typed — a highlighted option is a
    // suggestion until it's chosen, never an autocomplete that fires on blur.
    if (e.key === "Tab") setOpen(false);
  };

  return (
    <div
      className={cn("relative", className)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <Input
        name={name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="font-medium"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && active >= 0 ? `${listId}-opt-${active}` : undefined
        }
        aria-label={ariaLabel}
      />

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Exercises"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-[var(--radius-card)] border border-line bg-card py-1 shadow-[var(--shadow-card)]"
        >
          {groups.map((group, gi) => (
            <div key={group.label} role="group" aria-label={group.label}>
              <p className="eyebrow sticky top-0 bg-card px-3 py-1.5 text-ink-soft/70">
                {group.label}
              </p>
              {group.names.map((n, ni) => {
                const i = groupStart[gi] + ni;
                const isActive = i === active;
                return (
                  <div
                    key={`${group.label}-${n}`}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={isActive}
                    ref={isActive ? activeRef : undefined}
                    // Keep focus on the input so the panel doesn't blur away
                    // before the click lands.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => commit(n)}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm",
                      isActive ? "bg-jade-wash text-jade-strong" : "text-ink",
                    )}
                  >
                    {/* Only the highlighted row animates — 178 moving figures
                        would be noise, and the motion doubles as a cue. */}
                    <ExerciseFigure
                      archetype={archetypeFor(n)}
                      animated={isActive}
                      className={cn("shrink-0", isActive ? "text-jade-strong" : "text-ink-soft")}
                    />
                    {n}
                  </div>
                );
              })}
            </div>
          ))}

          {flat.length === 0 ? (
            <div
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpen(false)}
              className="flex min-h-11 cursor-pointer items-center px-3 py-2.5 text-sm text-ink-soft"
            >
              {value.trim()
                ? // The plain input already accepts anything; this row is here
                  // so coaches can see that it does.
                  `Use “${value.trim()}” as a new exercise`
                : "No exercises yet — start typing."}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
