"use client";

import { useMemo, useState } from "react";
import { Card, Input, EmptyState } from "@/components/ui";
import { ExerciseFigure } from "@/components/ExerciseFigure";
import { archetypeFor, demoSearchUrl } from "@/lib/exercise-archetypes";
import {
  EXERCISE_CATEGORIES,
  EXERCISE_NOTES,
  normalizeExerciseName,
  disciplineForName,
} from "@/lib/exercise-presets";
import {
  DISCIPLINES,
  DISCIPLINE_ORDER,
  DISCIPLINE_LABELS,
  toDiscipline,
  type Discipline,
} from "@/lib/constants";
import { cn } from "@/lib/cn";

// A trainer's own movements. Names only — the catalog is the same for everyone,
// so it's imported below rather than sent down from the server with the page.
export type CustomMovement = { name: string; discipline: string | null };

type Row = { name: string; note?: string; discipline: Discipline };
type Section = { label: string; blurb?: string; rows: Row[] };

// Anchors, so a section is linkable even though the contents row is gone.
function anchor(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Built once at module scope: it's the same 17 sections on every render, and
// rebuilding 235 rows per keystroke would be work for nothing.
const CATALOG_SECTIONS: Section[] = EXERCISE_CATEGORIES.map((c) => ({
  label: c.label,
  blurb: c.blurb,
  rows: c.exercises.map((name) => ({
    name,
    // The protocol notes were written for climbers, so they only belong on
    // climbing rows. Push-Up appears under Bodyweight too, and there it should
    // not carry an antagonist-work prescription it was never written for.
    note:
      c.discipline === DISCIPLINES.CLIMBING
        ? EXERCISE_NOTES.get(normalizeExerciseName(name))
        : undefined,
    discipline: c.discipline,
  })),
}));

type Filter = Discipline | "ALL";

const FILTERS = ["ALL", ...DISCIPLINE_ORDER] as const satisfies readonly Filter[];

const FILTER_LABELS: Record<Filter, string> = {
  ALL: "All",
  ...DISCIPLINE_LABELS,
};

export function ExerciseCatalog({ custom }: { custom: CustomMovement[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");

  // The trainer's own movements lead, because they're the ones the built-in
  // list can't tell them about. Unlike a catalog section its rows don't share a
  // discipline — each carries its own, which is the point of storing it.
  const allSections: Section[] = useMemo(() => {
    if (custom.length === 0) return CATALOG_SECTIONS;
    return [
      {
        label: "My exercises",
        blurb:
          "Movements you've programmed that aren't in the built-in list. Edit one below to say what kind of training it is.",
        rows: custom.map((m) => ({
          name: m.name,
          discipline: m.discipline
            ? toDiscipline(m.discipline)
            : (disciplineForName(m.name) ?? DISCIPLINES.OTHER),
        })),
      },
      ...CATALOG_SECTIONS,
    ];
  }, [custom]);

  const key = normalizeExerciseName(query);

  // Counts respect the search but not the chosen chip, so they answer "what
  // else matches?" rather than restating the section you're already looking at.
  const counts = useMemo(() => {
    const tally: Record<string, number> = { ALL: 0 };
    for (const section of allSections) {
      for (const row of section.rows) {
        if (key && !normalizeExerciseName(row.name).includes(key)) continue;
        tally.ALL += 1;
        tally[row.discipline] = (tally[row.discipline] ?? 0) + 1;
      }
    }
    return tally;
  }, [allSections, key]);

  const sections = useMemo(
    () =>
      allSections
        .map((section) => ({
          ...section,
          rows: section.rows.filter(
            (row) =>
              (filter === "ALL" || row.discipline === filter) &&
              (!key || normalizeExerciseName(row.name).includes(key)),
          ),
        }))
        .filter((section) => section.rows.length > 0),
    [allSections, filter, key],
  );

  // The finger-strength warning is climbing's, so it appears when climbing work
  // does — not on a page filtered down to barbell movements.
  const showsClimbing = sections.some((s) =>
    s.rows.some((r) => r.discipline === DISCIPLINES.CLIMBING),
  );

  return (
    <div>
      <div className="mt-6 flex flex-col gap-3 border-y border-line py-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f;
            const n = counts[f] ?? 0;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className={cn(
                  "eyebrow inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 transition-colors sm:min-h-0 sm:px-2.5 sm:py-1",
                  active
                    ? "border-jade bg-jade-wash text-jade-strong"
                    : "border-line text-ink-soft hover:border-jade/30 hover:text-jade-strong",
                  // Never disabled: a zero chip is still how you clear a filter
                  // that is hiding everything.
                  n === 0 && !active && "opacity-45",
                )}
              >
                {FILTER_LABELS[f]}
                <span className="metric text-[0.9em] opacity-70">{n}</span>
              </button>
            );
          })}
        </div>

        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movements…"
          aria-label="Search movements"
          className="text-sm"
        />
      </div>

      {sections.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nothing matches">
            No movement here is called “{query.trim()}”
            {filter === "ALL" ? "" : ` under ${FILTER_LABELS[filter]}`}. Try a
            shorter word, or widen the filter to All.
          </EmptyState>
        </div>
      ) : (
        sections.map((section) => (
          <section
            key={section.label}
            id={anchor(section.label)}
            className="mt-9 scroll-mt-20"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-ink">
                {section.label}
              </h2>
              <span className="metric shrink-0 text-xs text-ink-soft">
                {section.rows.length}
              </span>
            </div>
            {section.blurb ? (
              <p className="mt-1 text-sm text-ink-soft">{section.blurb}</p>
            ) : null}

            <Card className="mt-3">
              <ul className="divide-y divide-line">
                {section.rows.map((row) => (
                  <li
                    key={row.name}
                    className="flex items-start gap-3 px-4 py-3.5"
                  >
                    <span className="mt-0.5 shrink-0 text-ink-soft">
                      <ExerciseFigure archetype={archetypeFor(row.name)} />
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* The same fallback the client workout page uses when a
                          trainer hasn't attached their own demo. */}
                      <a
                        href={demoSearchUrl(row.name)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-ink transition-colors hover:text-jade-strong"
                      >
                        {row.name}
                        <span aria-hidden className="ml-1 text-ink-soft">
                          ↗
                        </span>
                      </a>
                      {row.note ? (
                        <p className="mt-0.5 text-sm text-ink-soft">{row.note}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))
      )}

      {showsClimbing ? (
        <p className="mt-9 text-xs text-ink-soft">
          Loads and rest on the climbing movements are conventional starting
          points, not a plan. Finger strength work in particular is where
          climbers get hurt — build into it slowly, and stop a set while it still
          looks clean.
        </p>
      ) : null}
    </div>
  );
}
