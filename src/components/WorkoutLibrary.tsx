"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Select } from "@/components/ui";
import {
  GROUPED_VIEWS,
  SORTED_VIEWS,
  LIBRARY_VIEW_COOKIE,
  LIBRARY_VIEW_COOKIE_MAX_AGE,
  LIBRARY_VIEW_LABELS,
  arrangeLibrary,
  toLibraryView,
  type LibraryRow,
  type LibraryView,
} from "@/lib/library-view";

// The coach's saved workouts, arranged the way this device last asked for.
//
// Arranged here rather than on the server so switching is instant: the whole
// library is already on the page, and a round-trip to reorder it would read as
// a picker that didn't work. The address bar is the state, written with
// replaceState, which Next keeps in step with useSearchParams. That makes a
// link to a view shareable, and it is what a back navigation restores, so the
// list never disagrees with the URL it is drawn under.
export function WorkoutLibrary({
  rows,
  stored,
}: {
  rows: LibraryRow[];
  // From the cookie, read on the server. Used when the URL names no view.
  stored: LibraryView;
}) {
  const searchParams = useSearchParams();
  const selectId = useId();
  const view = toLibraryView(searchParams.get("view")) ?? stored;
  const groups = useMemo(() => arrangeLibrary(rows, view), [rows, view]);
  // Only the date orders show the date: anywhere else it's a number to skip.
  const dated = view === "recent" || view === "oldest";

  function choose(next: LibraryView) {
    document.cookie = `${LIBRARY_VIEW_COOKIE}=${next}; path=/library; max-age=${LIBRARY_VIEW_COOKIE_MAX_AGE}; samesite=lax`;
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="metric shrink-0 text-xs text-ink-soft">
          {rows.length} workout{rows.length === 1 ? "" : "s"}
        </p>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {/* Beside the select, not wrapped round it: a wrapping label names
              the control "View By kind", reading its own value back. */}
          <label htmlFor={selectId} className="eyebrow text-ink-soft">
            View
          </label>
          <Select
            id={selectId}
            value={view}
            onChange={(e) => {
              const next = toLibraryView(e.target.value);
              if (next) choose(next);
            }}
            className="max-w-56"
          >
            <optgroup label="Group">
              {GROUPED_VIEWS.map((v) => (
                <option key={v} value={v}>
                  {LIBRARY_VIEW_LABELS[v]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Sort">
              {SORTED_VIEWS.map((v) => (
                <option key={v} value={v}>
                  {LIBRARY_VIEW_LABELS[v]}
                </option>
              ))}
            </optgroup>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <section key={group.key}>
            {group.label ? (
              <div className="mb-3 flex items-baseline gap-2.5">
                <h2 className="font-display text-lg font-semibold text-ink">
                  {group.label}
                </h2>
                <span className="metric text-xs text-ink-soft">
                  {group.rows.length}
                </span>
              </div>
            ) : null}

            <Card className="divide-y divide-line">
              {group.rows.map((t) => (
                <Link
                  key={t.id}
                  href={`/library/${t.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paper"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{t.title}</p>
                    <p className="metric mt-0.5 text-xs text-ink-soft">
                      {t.exercises} exercise{t.exercises === 1 ? "" : "s"}
                      {dated ? ` · Updated ${t.updatedLabel}` : null}
                    </p>
                  </div>
                  <span className="text-ink-soft">›</span>
                </Link>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </>
  );
}
