"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { FoodPreset } from "@/lib/food-presets";
import { FOOD_PRESETS, normalizeFoodName } from "@/lib/food-presets";

type Group = { label: string; foods: FoodPreset[] };

// Rendered options are capped: with an empty query the whole catalog would
// re-render on every keystroke, and each food row carries three spans to the
// exercise picker's one. The cap truncates the groups themselves so the flat
// list, the group offsets and the keyboard index all stay in agreement.
const MAX_OPTIONS = 80;

// Unlike ExercisePicker this is a controlled field and not a form input at all.
// NutritionBuilder already serializes every food through one hidden JSON blob,
// so there is no no-JS behaviour to preserve — and a second copy of the name
// held in here would drift from the row it belongs to.
export function FoodPicker({
  value,
  onChange,
  onPick,
  onPickCustom,
  custom,
  placeholder = "Food",
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (name: string) => void;
  // A catalog entry was committed. The parent fills quantity and macros from
  // it; the picker never writes those itself.
  onPick: (preset: FoodPreset) => void;
  // The "use as a custom food" row was taken. The parent drops the serving
  // link, since there's no per-serving base left to scale from.
  onPickCustom?: (name: string) => void;
  // Trainer-authored foods, shown ahead of the catalog. Nothing supplies these
  // yet; the slot is here so adding them later needs no signature change.
  custom?: FoodPreset[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const activeRef = useRef<HTMLDivElement | null>(null);

  const { groups, truncated } = useMemo(() => {
    const q = normalizeFoodName(value);
    const seen = new Set<string>();
    const out: Group[] = [];
    let budget = MAX_OPTIONS;
    let cut = false;

    // A food shows up once, in the first group that claims it: mine beats the
    // catalog. Two Enter targets for the same name would make keyboard
    // navigation feel broken.
    const push = (label: string, foods: FoodPreset[]) => {
      const picked: FoodPreset[] = [];
      for (const f of foods) {
        const key = normalizeFoodName(f.name);
        if (seen.has(key) || (q && !key.includes(q))) continue;
        seen.add(key);
        picked.push(f);
      }
      if (q) {
        // Stable sort, so this only lifts prefix matches above interior ones.
        picked.sort(
          (a, b) =>
            Number(!normalizeFoodName(a.name).startsWith(q)) -
            Number(!normalizeFoodName(b.name).startsWith(q)),
        );
      }
      if (!picked.length || budget <= 0) {
        if (picked.length) cut = true;
        return;
      }
      if (picked.length > budget) {
        cut = true;
        picked.length = budget;
      }
      budget -= picked.length;
      out.push({ label, foods: picked });
    };

    if (custom?.length) push("My foods", custom);
    for (const c of FOOD_PRESETS) push(c.label, c.foods);

    return { groups: out, truncated: cut };
  }, [value, custom]);

  const flat = useMemo(() => groups.flatMap((g) => g.foods), [groups]);

  // Where each group starts in `flat`, so options can compute their own index
  // without a counter being mutated mid-render.
  const groupStart = useMemo(() => {
    const starts: number[] = [];
    let n = 0;
    for (const g of groups) {
      starts.push(n);
      n += g.foods.length;
    }
    return starts;
  }, [groups]);

  // Keep the arrow-key highlight on screen. "nearest" makes this a no-op when
  // the option is already visible, so hovering with the mouse doesn't jump.
  useEffect(() => {
    if (active >= 0) activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const commit = (preset: FoodPreset) => {
    // Name first, then the macros. React batches both into one render.
    onChange(preset.name);
    onPick(preset);
    setOpen(false);
    setActive(-1);
  };

  const commitCustom = () => {
    const next = value.trim();
    if (next) {
      onChange(next);
      onPickCustom?.(next);
    }
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
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="bg-card text-sm"
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
          aria-label="Foods"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-[var(--radius-card)] border border-line bg-card py-1 shadow-[var(--shadow-card)]"
        >
          {groups.map((group, gi) => (
            <div key={group.label} role="group" aria-label={group.label}>
              <p className="eyebrow sticky top-0 bg-card px-3 py-1.5 text-ink-soft/70">
                {group.label}
              </p>
              {group.foods.map((f, fi) => {
                const i = groupStart[gi] + fi;
                const isActive = i === active;
                return (
                  <div
                    key={`${group.label}-${f.name}`}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={isActive}
                    ref={isActive ? activeRef : undefined}
                    // Keep focus on the input so the panel doesn't blur away
                    // before the click lands.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => commit(f)}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-baseline gap-2.5 px-3 py-2.5 text-sm",
                      isActive ? "bg-jade-wash text-jade-strong" : "text-ink",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    {/* The serving and the calories are what tell two entries
                        apart — there's no food equivalent of ExerciseFigure. */}
                    <span className="hidden shrink-0 text-xs text-ink-soft sm:block">
                      {f.serving}
                    </span>
                    <span className="metric shrink-0 text-xs text-ink-soft">
                      {f.calories} kcal
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {truncated ? (
            <p className="px-3 py-2 text-xs text-ink-soft/70">
              Keep typing to narrow…
            </p>
          ) : null}

          {flat.length === 0 ? (
            <div
              onMouseDown={(e) => e.preventDefault()}
              onClick={commitCustom}
              className="flex min-h-11 cursor-pointer items-center px-3 py-2.5 text-sm text-ink-soft"
            >
              {value.trim()
                ? // The field already accepts anything; this row is here so
                  // coaches can see that it does.
                  `Use “${value.trim()}” as a custom food`
                : "Start typing to search foods."}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
