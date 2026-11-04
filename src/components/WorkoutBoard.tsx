"use client";

// The side-by-side board: up to seven workouts as columns, or a week laid out
// Sunday to Saturday, with exercises dragged between them and one Save for the
// lot. Library workouts and scheduled sessions can sit side by side.
//
// Everything loaded lives in one store (see board-order.ts) next to the copy
// it was loaded as, so switching layouts or weeks keeps every unsaved change,
// and "changed" is simply "differs from that copy".
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type RefObject,
} from "react";
import {
  loadBoardWeek,
  loadBoardWorkouts,
  saveBoard,
  saveBoardShelf,
} from "@/app/(trainer)/library/compare/actions";
import { BoardShelf, type ShelfItem } from "@/components/BoardShelf";
import { AnimationToggle, ToggleChip } from "@/components/AnimationToggle";
import { UndoButtons } from "@/components/UndoButtons";
import { useFieldHistory } from "@/components/useFieldHistory";
import { useUndoHistory } from "@/components/useUndoHistory";
import { BoardWeekTotals, WeekTotalsToggle, useShowWeekTotals } from "@/components/BoardWeekTotals";
import { BoardWorkoutCard, type MoveTarget } from "@/components/BoardWorkoutCard";
import { DragOverlay } from "@/components/Drag";
import { Button, EmptyState, Input, Select, buttonClass } from "@/components/ui";
import { useBoardDrag, type BoardSubject, type BoardTarget } from "@/components/useBoardDrag";
import {
  MAX_COLUMNS,
  moveColumn,
  insertExercise,
  moveExercise,
  removeExercise,
  patchWorkout,
  serializeWorkout,
  setTotal,
  toSaveEntry,
  type BoardExercise,
  type BoardPicker,
  type BoardStore,
  type BoardWeek,
  type BoardWorkout,
  type Dir,
} from "@/lib/board-order";
import { cn } from "@/lib/cn";
import { SECTION_ORDER } from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import { useStoredSet, useStoredValue } from "@/lib/use-stored-set";
import type { PickerCatalog } from "@/lib/exercise-catalog";
import { workoutDay, withWorkoutDay } from "@/lib/library-view";
import {
  SHELF_SETS,
  exerciseStretches,
  exerciseVolume,
  sectionFor,
  suggestWorkouts,
  workoutVolume,
  type DaySlot,
} from "@/lib/board-suggest";

type Layout = "columns" | "week";

// Days of the week left off the week layout, by index from Sunday. Kept per
// device, like the other switches on the board: which days a coach looks at is
// how they like their screen, not part of anyone's program.
const NO_DAYS: readonly string[] = [];
const DAY_KEYS: ReadonlySet<string> = new Set(["0", "1", "2", "3", "4", "5", "6"]);

// The order a day's workouts are stacked in, as the coach set it with the
// arrows: workout keys, first to last. Per device, like the days above; a key
// it doesn't name keeps the order the week arrived in, after the ones it does.
const asText = (raw: unknown) => (typeof raw === "string" ? raw : "");
function parseOrder(raw: string): string[] {
  try {
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}
const NO_SUGGESTION: ReadonlySet<string> = new Set();
// A row for an exercise off the shelf: its name and the sets the suggestions
// counted it at, the rest for the coach to fill in.
const findRow = (w: BoardWorkout | undefined, id: string) =>
  w ? SECTION_ORDER.flatMap((s) => w.rows[s]).find((r) => r.id === id) : undefined;
const shelfRow = (id: string, name: string): BoardExercise => ({
  id,
  name,
  sets: SHELF_SETS,
  reps: "",
  weight: "",
  load: "",
  tempo: "",
  rest: "",
  notes: "",
});
// What a shelf card lists under the name: the muscles it works, or for a
// stretch, what it stretches.
const musclesNamed = (name: string) => {
  const worked = [...exerciseVolume(name).values()].sort((a, b) => b.sets - a.sets);
  return worked.length ? worked.map((v) => v.label) : exerciseStretches(name);
};
const onOff = (raw: unknown) => (raw === "on" ? "on" : "off");
type Board = { store: BoardStore; base: BoardStore };
type Notice = { tone: "ok" | "error"; text: string };

const LAYOUTS: { value: Layout; label: string }[] = [
  { value: "columns", label: "Columns" },
  { value: "week", label: "Week" },
];

// Undo puts back the user's edits and nothing else: workouts loaded since the
// snapshot stay, the saved copies stay, and each workout keeps the version the
// library last gave it, so saving after an undo isn't refused as stale.
function restore(snapshot: Board, current: Board): Board {
  const store = { ...current.store };
  for (const [key, w] of Object.entries(snapshot.store)) {
    store[key] = { ...w, version: current.store[key]?.version ?? w.version };
  }
  return { store, base: current.base };
}

function isChanged(b: Board, key: string): boolean {
  const w = b.store[key];
  const base = b.base[key];
  if (w === base) return false;
  return !base || serializeWorkout(w) !== serializeWorkout(base);
}

// Freshly loaded workouts join the board — except one with unsaved changes,
// which keeps them. The save checks it against the library, so an edit made
// elsewhere meanwhile is caught there rather than silently dropped here.
function join(b: Board, workouts: BoardWorkout[]): Board {
  let store = b.store;
  let base = b.base;
  for (const w of workouts) {
    if (isChanged(b, w.key)) continue;
    if (store === b.store) {
      store = { ...b.store };
      base = { ...b.base };
    }
    store[w.key] = w;
    base[w.key] = w;
  }
  return store === b.store ? b : { store, base };
}

// Which day of the week on screen a workout sits on: the day its title names
// for the library, its date for a person's week. Null is no day.
function dayOf(w: BoardWorkout, week: BoardWeek): number | null {
  if (week.src === "library") return w.kind === "template" ? workoutDay(w.title) : null;
  const i = week.days.findIndex((d) => d.date === w.date);
  return i < 0 ? null : i;
}

export function WorkoutBoard({
  initialLayout,
  initialColumns,
  initialWeek,
  workouts,
  picker,
  people,
  catalog,
  initialShelf,
}: {
  initialLayout: Layout;
  initialColumns: string[];
  initialWeek: BoardWeek | null;
  workouts: BoardWorkout[];
  picker: BoardPicker;
  // Whose week can be shown: "me", then the roster.
  people: { id: string; name: string }[];
  catalog: PickerCatalog;
  // The exercise shelf as saved on the account.
  initialShelf: string[];
}) {
  // Every edit to the store is a step Ctrl+Z can take back (useUndoHistory);
  // what loads and what a save sends back come in through `replace`, which
  // isn't one. Which workouts are on screen, and how, isn't undone either.
  const history = useUndoHistory<Board>(
    () => {
      const store = Object.fromEntries(workouts.map((w) => [w.key, w]));
      return { store, base: store };
    },
    { restore },
  );
  const board = history.state;
  const setBoard = history.set;
  const replaceBoard = history.replace;
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [columns, setColumns] = useState<string[]>(initialColumns);
  const [week, setWeek] = useState<BoardWeek | null>(initialWeek);
  // Exercise rows open for editing, by id. Here rather than in each row, so a
  // row stays open when an arrow moves it into another section and it remounts.
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [showTotals] = useShowWeekTotals();
  const [hiddenDays, setHiddenDays] = useStoredSet("pt_board_hidden_days", NO_DAYS, DAY_KEYS);
  const isShown = useCallback((day: number) => !hiddenDays.has(String(day)), [hiddenDays]);
  const [orderRaw, storeOrder] = useStoredValue("pt_board_day_order", asText);
  const dayOrder = useMemo(() => parseOrder(orderRaw), [orderRaw]);
  // One day always stays: a week of nothing is the board looking broken.
  const toggleDay = (day: number) => {
    const next = new Set(hiddenDays);
    if (next.has(String(day))) next.delete(String(day));
    else if (next.size < DAY_KEYS.size - 1) next.add(String(day));
    setHiddenDays(next);
  };
  // The shelf of exercises waiting to go into the week's workouts
  // (BoardShelf), by name. Saved to the account on every change, so it's
  // there next visit and on any device; whether it's out is per device.
  const [shelfShown, storeShelfShown] = useStoredValue("pt_board_shelf_open", onOff);
  const [shelf, setShelfState] = useState<string[]>(initialShelf);
  const [shelfSave, setShelfSave] = useState<"saved" | "saving" | "error">("saved");
  const shelfSeq = useRef(0);
  const shelfNow = useRef(shelf);
  const setShelf = useCallback((next: string[]) => {
    shelfNow.current = next;
    setShelfState(next);
    setShelfSave("saving");
    const seq = ++shelfSeq.current;
    saveBoardShelf(next)
      .then((res) => {
        if (seq === shelfSeq.current) setShelfSave(res.ok ? "saved" : "error");
      })
      .catch(() => {
        if (seq === shelfSeq.current) setShelfSave("error");
      });
  }, []);
  // On, or off, the shelf by name; a name is on it once.
  const shelve = useCallback(
    (name: string) => {
      const n = name.trim();
      if (!n) return;
      const rest = shelfNow.current.filter((k) => k.toLowerCase() !== n.toLowerCase());
      setShelf([...rest, n]);
    },
    [setShelf],
  );
  // One shelf exercise traded for another step on its path, in its place.
  const swapShelved = useCallback(
    (from: string, to: string) => {
      const list = shelfNow.current.filter((k) => k.toLowerCase() !== to.toLowerCase() || k === from);
      setShelf(list.map((k) => (k === from ? to : k)));
    },
    [setShelf],
  );
  const unshelve = useCallback(
    (name: string) => setShelf(shelfNow.current.filter((k) => k !== name)),
    [setShelf],
  );
  // A shelf kept in this browser before it was saved to the account comes
  // along once, then the browser copy is cleared.
  const [legacyShelf, storeLegacyShelf] = useStoredValue("pt_board_exercise_shelf", asText);
  const legacyMoved = useRef(false);
  useEffect(() => {
    if (legacyMoved.current || !legacyShelf) return;
    legacyMoved.current = true;
    const old = parseOrder(legacyShelf);
    storeLegacyShelf("");
    const known = new Set(shelf.map((n) => n.toLowerCase()));
    const extra = old.filter((n) => !known.has(n.toLowerCase()));
    // After this render, not during it: it saves, like any other change.
    if (extra.length) void Promise.resolve().then(() => setShelf([...shelf, ...extra]));
  });
  const [saving, startSave] = useTransition();
  const [loading, startLoad] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDialogElement>(null);

  const edit = useCallback(
    (fn: (store: BoardStore) => BoardStore) =>
      setBoard((b) => {
        const store = fn(b.store);
        return store === b.store ? b : { ...b, store };
      }),
    [setBoard],
  );

  const toggleRow = useCallback(
    (id: string, to?: boolean) =>
      setOpen((prev) => {
        const has = prev.has(id);
        const next = to ?? !has;
        if (next === has) return prev;
        const out = new Set(prev);
        if (next) out.add(id);
        else out.delete(id);
        return out;
      }),
    [],
  );

  // An arrow press moves its row, and a moved row loses focus — React moves
  // its node, or remounts it in another section. Put focus back on the arrow
  // that was pressed, or its partner once that one hits the end, the way the
  // plan builder does.
  const refocus = useRef<{ id: string; dir: Dir } | null>(null);
  const requestRefocus = useCallback((id: string, dir: Dir) => {
    refocus.current = { id, dir };
  }, []);
  useEffect(() => {
    const target = refocus.current;
    refocus.current = null;
    if (!target) return;
    for (const dir of [target.dir, -target.dir]) {
      const el = document.querySelector<HTMLButtonElement>(
        `[data-board-move="${target.id}:${dir}"]`,
      );
      if (el && !el.disabled) {
        el.focus();
        return;
      }
    }
  }, [board.store]);

  const changed = useMemo(
    () =>
      Object.keys(board.store)
        .filter((k) => isChanged(board, k))
        .map((k) => board.store[k]),
    [board],
  );

  const weekView = useMemo(() => {
    if (!week) return null;
    const days: BoardWorkout[][] = week.days.map(() => []);
    const tray: BoardWorkout[] = [];
    for (const key of week.keys) {
      const w = board.store[key];
      if (!w) continue;
      const day = dayOf(w, week);
      if (day != null) days[day].push(w);
      else if (week.src === "library") tray.push(w);
    }
    const rank = (key: string) => {
      const i = dayOrder.indexOf(key);
      return i < 0 ? Infinity : i;
    };
    for (const list of days) list.sort((a, b) => rank(a.key) - rank(b.key));
    return { days, tray };
  }, [week, board.store, dayOrder]);

  // The pressed arrow moves with its card, and React moving a node drops its
  // focus; put it back, or on the other arrow once this one hits the end.
  const dayMoved = useRef<{ key: string; dir: Dir } | null>(null);
  // One workout a place up or down its day. The day's new order replaces
  // whatever was stored for those workouts, so other days keep theirs.
  const stepInDay = useCallback(
    (key: string, dir: Dir) => {
      const list = weekView?.days.find((d) => d.some((w) => w.key === key));
      if (!list) return;
      const keys = list.map((w) => w.key);
      const i = keys.indexOf(key);
      const j = i + dir;
      if (j < 0 || j >= keys.length) return;
      [keys[i], keys[j]] = [keys[j], keys[i]];
      storeOrder(JSON.stringify([...dayOrder.filter((k) => !keys.includes(k)), ...keys]));
      dayMoved.current = { key, dir };
    },
    [weekView, dayOrder, storeOrder],
  );
  useEffect(() => {
    const target = dayMoved.current;
    dayMoved.current = null;
    if (!target) return;
    for (const dir of [target.dir, -target.dir]) {
      const el = document.querySelector<HTMLButtonElement>(
        `[data-board-day-move="${target.key}:${dir}"]`,
      );
      if (el && !el.disabled) {
        el.focus();
        return;
      }
    }
  }, [dayOrder]);

  const columnWorkouts = useMemo(
    () => columns.map((k) => board.store[k]).filter((w) => w != null),
    [columns, board.store],
  );

  const visible = useMemo(() => {
    if (layout === "columns") return columnWorkouts;
    if (!weekView) return [];
    // Only the days on screen: the week totals and the bar scale follow what
    // the coach chose to look at.
    const days = weekView.days.filter((_, i) => isShown(i));
    return [...days.flat(), ...(trayOpen ? weekView.tray : [])];
  }, [layout, columnWorkouts, weekView, trayOpen, isShown]);

  // Where a row's "Move to…" can send it. Rebuilt from a signature so typing in
  // a row doesn't hand every card a new list and re-render it.
  const targetsSig = JSON.stringify(
    visible.filter((w) => !w.locked).map((w) => [w.key, w.title]),
  );
  const targets = useMemo<MoveTarget[]>(
    () => (JSON.parse(targetsSig) as [string, string][]).map(([key, title]) => ({ key, title })),
    [targetsSig],
  );
  const maxSets = visible.reduce((m, w) => Math.max(m, setTotal(w)), 0);

  // A whole workout onto a day: a library workout's day is its title's prefix,
  // a session's is its date.
  const moveToDay = useCallback(
    (key: string, day: number | null) => {
      const wk = week;
      if (!wk) return;
      edit((s) => {
        const w = s[key];
        if (!w || w.locked) return s;
        if (w.kind === "template") {
          if (workoutDay(w.title) === day) return s;
          return patchWorkout(s, key, { title: withWorkoutDay(w.title, day) });
        }
        const date = day == null ? null : wk.days[day]?.date;
        return date && date !== w.date ? patchWorkout(s, key, { date }) : s;
      });
    },
    [edit, week],
  );

  const onDrop = useCallback(
    (subject: BoardSubject, target: BoardTarget) => {
      if (subject.kind === "exercise" && target.kind === "exercise") {
        edit((s) => moveExercise(s, { key: subject.key, id: subject.id }, target));
      } else if (subject.kind === "workout" && target.kind === "column") {
        setColumns((c) => moveColumn(c, subject.key, target.index));
      } else if (subject.kind === "workout" && target.kind === "day") {
        moveToDay(subject.key, target.day);
      } else if (subject.kind === "exercise" && target.kind === "shelf") {
        // Out of its workout and onto the shelf, by name, to go back in later.
        const name = findRow(board.store[subject.key], subject.id)?.name.trim();
        if (!name) return;
        edit((s) => removeExercise(s, subject.key, subject.id));
        shelve(name);
      } else if (subject.kind === "shelf" && target.kind === "exercise") {
        // Off the shelf and into the workout.
        const id = crypto.randomUUID();
        edit((s) =>
          insertExercise(s, target.key, target.section, target.index, shelfRow(id, subject.key)),
        );
        toggleRow(id, true);
        unshelve(subject.key);
      }
    },
    [edit, moveToDay, toggleRow, board.store, shelve, unshelve],
  );

  const drag = useBoardDrag(layout, onDrop, () => scrollerRef.current);
  const inHand = drag.dragging;
  const draggingFor = (w: BoardWorkout): string | null =>
    !inHand || inHand.key !== w.key || inHand.kind === "shelf"
      ? null
      : inHand.kind === "workout"
        ? "workout"
        : inHand.id;

  // A shelf exercise into a workout, at the end of the section it belongs in,
  // open so its reps can go in. An edit like any other: Save keeps it, Ctrl+Z
  // takes it back.
  const place = (name: string, key: string) => {
    const w = board.store[key];
    if (!w || w.locked) return;
    const id = crypto.randomUUID();
    const section = sectionFor(name);
    edit((s) => insertExercise(s, key, section, s[key]?.rows[section].length ?? 0, shelfRow(id, name)));
    toggleRow(id, true);
    unshelve(name);
    setNotice({ tone: "ok", text: `Moved ${name} into ${w.title.trim() || "Untitled workout"}.` });
  };

  // What each workout on the week already trains, for the shelf's
  // suggestions.
  const volumes = useMemo(() => {
    const out = new Map<string, ReturnType<typeof workoutVolume>>();
    for (const k of week?.keys ?? []) {
      const w = board.store[k];
      if (w) out.set(k, workoutVolume(w));
    }
    return out;
  }, [week, board.store]);
  const shelfItems = useMemo((): ShelfItem[] => {
    if (!week || !weekView) return [];
    const today = toDateInput(new Date());
    const days: DaySlot[] = week.days.map((d, i) => ({
      // A day already gone in a person's week is no place to plan.
      open: isShown(i) && !(d.date != null && d.date < today),
      label: d.label,
      workouts: weekView.days[i].map((workout) => ({
        workout,
        volume: volumes.get(workout.key) ?? new Map(),
      })),
    }));
    return shelf.map((name) => {
      const suggestions = suggestWorkouts(name, days, { cyclic: week.src === "library" });
      return { name, muscles: musclesNamed(name), suggestions };
    });
  }, [shelf, week, weekView, volumes, isShown]);
  const suggestedFor = (name: string) =>
    new Set(shelfItems.find((i) => i.name === name)?.suggestions.map((s) => s.key));

  const stepColumn = useCallback(
    (key: string, dir: Dir) =>
      setColumns((c) => {
        const i = c.indexOf(key);
        return i < 0 ? c : moveColumn(c, key, i + dir);
      }),
    [],
  );
  const removeColumn = useCallback(
    (key: string) => setColumns((c) => c.filter((k) => k !== key)),
    [],
  );
  const setDay = useCallback(
    (key: string, value: string) => moveToDay(key, value === "none" ? null : Number(value)),
    [moveToDay],
  );

  const dayOptions = useMemo(
    () =>
      week
        ? [
            ...week.days.map((d, i) => ({
              value: String(i),
              label: d.dayOfMonth != null ? `${d.name} ${d.dayOfMonth}` : d.name,
            })),
            ...(week.src === "library" ? [{ value: "none", label: "No day" }] : []),
          ]
        : undefined,
    [week],
  );

  // The view in the URL, so a reload or a bookmark comes back to it. Written
  // without a navigation, which would reload the page and lose what's unsaved.
  // Not on the first render: the URL already says what's on screen, and this
  // effect runs before the router hooks replaceState, so the router would keep
  // the old URL and put it back after the next save.
  const urlWritten = useRef(false);
  useEffect(() => {
    if (!urlWritten.current) {
      urlWritten.current = true;
      return;
    }
    const parts: string[] = [];
    if (layout === "week") {
      parts.push("layout=week");
      if (week && week.src !== "library") {
        parts.push(`src=${encodeURIComponent(week.src)}`);
        if (week.week && week.week !== week.thisWeek) parts.push(`week=${week.week}`);
      }
    }
    if (columns.length) parts.push(`w=${columns.join(",")}`);
    window.history.replaceState(
      null,
      "",
      parts.length ? `?${parts.join("&")}` : window.location.pathname,
    );
  }, [layout, columns, week]);

  // A newly added column lands off to the right on a narrow screen; bring it
  // into view.
  const columnCount = useRef(columns.length);
  useEffect(() => {
    if (columns.length > columnCount.current) {
      const row = scrollerRef.current;
      row?.scrollTo({ left: row.scrollWidth, behavior: "smooth" });
    }
    columnCount.current = columns.length;
  }, [columns.length]);

  // Leaving with unsaved changes asks first: a reload or a closed tab through
  // the browser's own prompt, a link inside the app through a confirm. The
  // link check runs in the capture phase, ahead of the router's own handler.
  const dirty = useRef(false);
  useEffect(() => {
    dirty.current = changed.length > 0;
  });
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const click = (e: MouseEvent) => {
      if (!dirty.current || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (!window.confirm("You have unsaved changes on this board. Leave without saving them?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, []);

  useEffect(() => {
    if (notice?.tone !== "ok") return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const loadWeek = (src: string, wk: string | null) => {
    startLoad(async () => {
      try {
        const res = await loadBoardWeek(src, wk);
        if (!res) {
          setNotice({ tone: "error", text: "That person isn't on your roster any more." });
          return;
        }
        replaceBoard((b) => join(b, res.workouts));
        setWeek(res.week);
      } catch {
        setNotice({ tone: "error", text: "That week didn't load. Check your connection and try again." });
      }
    });
  };

  const showLayout = (next: Layout) => {
    if (next === layout) return;
    setLayout(next);
    if (next === "week" && !week) loadWeek("library", null);
  };

  const openPicker = () => pickerRef.current?.showModal();

  const addColumn = (key: string) => {
    pickerRef.current?.close();
    if (columns.includes(key) || columns.length >= MAX_COLUMNS) return;
    const add = () =>
      setColumns((c) => (c.includes(key) || c.length >= MAX_COLUMNS ? c : [...c, key]));
    if (board.store[key]) {
      add();
      return;
    }
    startLoad(async () => {
      try {
        const [w] = await loadBoardWorkouts([key]);
        if (!w) {
          setNotice({ tone: "error", text: "That workout isn't there any more." });
          return;
        }
        replaceBoard((b) => join(b, [w]));
        add();
      } catch {
        setNotice({ tone: "error", text: "That workout didn't load. Check your connection and try again." });
      }
    });
  };

  const save = () => {
    const entries = changed.map(toSaveEntry);
    if (entries.length === 0 || saving) return;
    startSave(async () => {
      try {
        const res = await saveBoard(entries);
        if (res.ok) {
          replaceBoard((b) => {
            const store = { ...b.store };
            const base = { ...b.base };
            for (const w of res.workouts) {
              store[w.key] = w;
              base[w.key] = w;
            }
            return { store, base };
          });
          setErrors({});
          setNotice({
            tone: "ok",
            text: `Saved ${res.workouts.length} workout${res.workouts.length === 1 ? "" : "s"}.`,
          });
        } else {
          setErrors(res.errors ?? {});
          setNotice({
            tone: "error",
            text:
              res.error ??
              "Nothing was saved. The workouts outlined in red each say what they need.",
          });
        }
      } catch {
        setNotice({ tone: "error", text: "Nothing was saved. Check your connection and try again." });
      }
    });
  };

  // Ctrl+S saves the board, the same as its button.
  useFieldHistory(rootRef, { save });

  // Undoable like any other edit, so a discard by mistake is one Ctrl+Z away.
  const discard = () => {
    const n = changed.length;
    if (!window.confirm(`Discard your changes to ${n} workout${n === 1 ? "" : "s"}?`)) return;
    setBoard((b) => ({ ...b, store: b.base }));
    setErrors({});
    setNotice(null);
  };

  // While a shelf exercise is in hand, the workouts it would fit best.
  const suggested = inHand?.kind === "shelf" ? suggestedFor(inHand.key) : NO_SUGGESTION;
  const card = (w: BoardWorkout, extra: Partial<ComponentProps<typeof BoardWorkoutCard>> = {}) => (
    <BoardWorkoutCard
      key={w.key}
      workout={w}
      layout={layout}
      catalog={catalog}
      dragging={draggingFor(w)}
      revealSections={inHand?.kind === "exercise" || inHand?.kind === "shelf"}
      suggested={suggested.has(w.key)}
      open={open}
      error={errors[w.key]}
      maxSets={maxSets}
      targets={targets}
      grip={drag.grip}
      onEdit={edit}
      onToggleRow={toggleRow}
      onRefocus={requestRefocus}
      onDayStep={stepInDay}
      {...extra}
    />
  );

  const changedNames = changed.map((w) => w.title.trim() || "Untitled workout");

  return (
    <div ref={rootRef} className="pb-32">
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <div
          role="group"
          aria-label="Layout"
          className="inline-flex rounded-[var(--radius-sm)] border border-line bg-card p-0.5"
        >
          {LAYOUTS.map((l) => (
            <button
              key={l.value}
              type="button"
              aria-pressed={layout === l.value}
              onClick={() => showLayout(l.value)}
              className={cn(
                "eyebrow min-h-10 rounded-[calc(var(--radius-sm)-2px)] px-3.5 transition-colors sm:min-h-8",
                layout === l.value ? "bg-jade-wash text-jade-strong" : "text-ink-soft hover:text-ink",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        {layout === "columns" ? (
          <>
            <button
              type="button"
              onClick={openPicker}
              disabled={columns.length >= MAX_COLUMNS}
              className={buttonClass("outline", "sm")}
            >
              + Add workout
            </button>
            <span className="metric text-xs text-ink-soft">
              {columns.length} of {MAX_COLUMNS} open
            </span>
          </>
        ) : week ? (
          <>
            <div className="w-44">
              <Select
                value={week.src}
                onChange={(e) => loadWeek(e.target.value, null)}
                aria-label="Whose week"
                className="py-1.5 sm:min-h-9"
              >
                <option value="library">Library</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            {week.src === "library" ? (
              <span className="text-xs text-ink-soft">
                Each workout sits on the day its title starts with, as in “Mon · Lift”.
              </span>
            ) : (
              <>
                <div className="metric inline-flex items-center overflow-hidden rounded-[var(--radius-sm)] border border-line text-xs text-ink-soft">
                  <button
                    type="button"
                    aria-label="Previous week"
                    onClick={() => loadWeek(week.src, week.prev)}
                    className="grid h-10 w-11 place-items-center transition-colors hover:bg-card hover:text-ink sm:h-8"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => loadWeek(week.src, week.thisWeek)}
                    className="grid h-10 place-items-center border-x border-line px-4 transition-colors hover:bg-card hover:text-ink sm:h-8"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    aria-label="Next week"
                    onClick={() => loadWeek(week.src, week.next)}
                    className="grid h-10 w-11 place-items-center transition-colors hover:bg-card hover:text-ink sm:h-8"
                  >
                    ›
                  </button>
                </div>
                <span className="font-display text-base font-semibold text-ink">{week.label}</span>
              </>
            )}
          </>
        ) : null}

        {loading ? <span className="eyebrow text-ink-soft">Loading…</span> : null}

        <div className="ml-auto flex flex-wrap gap-2">
          {layout === "week" ? (
            <ToggleChip
              pressed={shelfShown === "on"}
              onToggle={() => storeShelfShown(shelfShown === "on" ? "off" : "on")}
            >
              Library
            </ToggleChip>
          ) : null}
          <WeekTotalsToggle />
          <AnimationToggle />
        </div>
      </div>

      {layout === "week" && week ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Days shown">
          <span className="eyebrow mr-1 text-ink-soft">Days</span>
          {week.days.map((d, i) => (
            <ToggleChip key={d.label} pressed={isShown(i)} onToggle={() => toggleDay(i)}>
              {d.label}
            </ToggleChip>
          ))}
          {hiddenDays.size > 0 ? (
            <button
              type="button"
              onClick={() => setHiddenDays(new Set())}
              className="metric ml-1 min-h-10 rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-8"
            >
              Show all
            </button>
          ) : null}
        </div>
      ) : null}

      {showTotals && visible.length ? <BoardWeekTotals workouts={visible} /> : null}

      <div inert={saving} className={cn("transition-opacity", saving && "opacity-60")}>
        {layout === "columns" ? (
          columnWorkouts.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Nothing open yet"
                action={
                  <Button size="sm" onClick={openPicker}>
                    Add a workout
                  </Button>
                }
              >
                Open up to seven workouts from your library, your calendar or both, then drag
                exercises between them.
              </EmptyState>
            </div>
          ) : (
            <div
              ref={scrollerRef}
              className={cn(
                "-mx-5 mt-6 flex items-start gap-3 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8",
                // Snapping fights the scroll a drag does at the edge, so it's
                // off while anything is in hand.
                !inHand && "snap-x snap-mandatory scroll-px-5 sm:scroll-px-8 lg:snap-none",
              )}
            >
              {columnWorkouts.map((w, i) => (
                <div
                  key={w.key}
                  data-board-column={w.key}
                  className="w-[min(18rem,calc(100vw-3.5rem))] shrink-0 snap-start lg:w-auto lg:min-w-[16rem] lg:max-w-[26rem] lg:flex-1"
                >
                  {card(w, {
                    columnIndex: i,
                    columnCount: columnWorkouts.length,
                    onColumnStep: stepColumn,
                    onRemoveColumn: removeColumn,
                  })}
                </div>
              ))}
              {columns.length < MAX_COLUMNS ? (
                <button
                  type="button"
                  onClick={openPicker}
                  className="grid min-h-40 w-40 shrink-0 snap-start place-items-center rounded-[var(--radius-card)] border border-dashed border-line text-sm text-ink-soft transition-colors hover:border-jade hover:text-ink"
                >
                  + Add workout
                </button>
              ) : null}
            </div>
          )
        ) : week && weekView ? (
          <>
            {shelfShown === "on" ? (
              <BoardShelf
                items={shelfItems}
                catalog={catalog}
                dayLabels={week.days.map((d) => (d.dayOfMonth != null ? `${d.label} ${d.dayOfMonth}` : d.label))}
                dragging={inHand?.kind === "shelf" ? inHand.key : null}
                grip={drag.grip}
                onAdd={shelve}
                onRemove={unshelve}
                dropping={inHand?.kind === "exercise"}
                onSwap={swapShelved}
                workouts={week.days.flatMap((d, i) =>
                  weekView.days[i]
                    .filter((w) => !w.locked)
                    .map((w) => {
                      const title = w.title.trim() || "Untitled workout";
                      // A library title already starts with its day.
                      return { key: w.key, label: workoutDay(title) != null ? title : `${d.label} · ${title}` };
                    }),
                )}
                saveState={shelfSave}
                onPlace={place}
              />
            ) : null}
            <div
              ref={scrollerRef}
              className="mt-6 flex flex-col gap-7 lg:-mx-8 lg:grid lg:auto-cols-[minmax(12.5rem,1fr)] lg:grid-flow-col lg:gap-3 lg:overflow-x-auto lg:px-8 lg:pb-4"
            >
              {week.days.map((d, i) => {
                if (!isShown(i)) return null;
                const list = weekView.days[i];
                return (
                  <section
                    key={d.name}
                    data-board-day={i}
                    aria-label={d.dayOfMonth != null ? `${d.name} ${d.dayOfMonth}` : d.name}
                    className="min-w-0"
                  >
                    {/* A coach's week reads across the top of a whiteboard:
                        the day, its date in big figures, and today ruled in
                        the accent. */}
                    <header
                      className={cn(
                        "mb-3 flex items-baseline gap-2 border-t-2 pt-2",
                        d.today ? "border-jade" : "border-line",
                      )}
                    >
                      <span className={cn("eyebrow", d.today ? "text-jade-strong" : "text-ink-soft")}>
                        <span className="lg:hidden">{d.name}</span>
                        <span className="hidden lg:inline">{d.label}</span>
                      </span>
                      {d.dayOfMonth != null ? (
                        <span className="font-display text-xl font-semibold leading-none text-ink">
                          {d.dayOfMonth}
                        </span>
                      ) : null}
                      {d.today ? <span className="eyebrow text-jade-strong">Today</span> : null}
                      <span className="metric ml-auto text-xs text-ink-soft/70">
                        {list.length ? list.length : ""}
                      </span>
                    </header>
                    <div data-board-day-list className="flex flex-col gap-3">
                      {list.map((w, j) =>
                        card(w, {
                          dayValue: String(i),
                          dayOptions,
                          onDay: setDay,
                          dayIndex: j,
                          dayCount: list.length,
                        }),
                      )}
                      {list.length === 0 ? (
                        <p className="grid min-h-16 place-items-center rounded-[var(--radius-card)] border border-dashed border-line px-3 text-center text-xs text-ink-soft/70">
                          {week.src === "library" ? "Nothing on this day" : "No sessions"}
                        </p>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>

            {week.src === "library" ? (
              <section
                data-board-day="none"
                aria-label="No day"
                className="mt-8 rounded-[var(--radius-card)] border border-dashed border-line p-4"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="eyebrow text-ink-soft">No day</h2>
                  <span className="metric text-xs text-ink-soft/70">{weekView.tray.length}</span>
                  <p className="w-full text-xs text-ink-soft sm:w-auto sm:flex-1">
                    Library workouts whose title doesn’t start with a day. Drop one on a day to add
                    that day to its title, or drop one here to take it off.
                  </p>
                  {weekView.tray.length ? (
                    <button
                      type="button"
                      aria-expanded={trayOpen}
                      onClick={() => setTrayOpen((o) => !o)}
                      className={buttonClass("ghost", "sm")}
                    >
                      {trayOpen ? "Hide" : "Show"}
                    </button>
                  ) : null}
                </div>
                <div
                  data-board-day-list
                  className={cn(
                    trayOpen &&
                      weekView.tray.length > 0 &&
                      "mt-4 grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-4",
                  )}
                >
                  {trayOpen
                    ? weekView.tray.map((w) => card(w, { dayValue: "none", dayOptions, onDay: setDay }))
                    : null}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <p className="mt-6 text-sm text-ink-soft">Loading the week…</p>
        )}
      </div>

      <AddWorkoutDialog
        dialogRef={pickerRef}
        picker={picker}
        openKeys={columns}
        onPick={addColumn}
      />

      {changed.length > 0 || notice ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-40 px-3 lg:bottom-5">
          <div className="pointer-events-auto mx-auto flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-card)] border border-line bg-card/95 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur">
            {changed.length > 0 ? (
              <>
                <p className="min-w-0 flex-1 text-sm text-ink">
                  <span className="metric">{changed.length}</span> workout
                  {changed.length === 1 ? "" : "s"} changed
                  <span className="block truncate text-xs text-ink-soft">
                    {changedNames.join(" · ")}
                  </span>
                </p>
                <UndoButtons />
                <button
                  type="button"
                  onClick={discard}
                  disabled={saving}
                  className={buttonClass("ghost", "sm")}
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className={buttonClass("primary", "sm")}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </>
            ) : null}
            {notice ? (
              <p
                role={notice.tone === "error" ? "alert" : "status"}
                className={cn(
                  "w-full text-sm",
                  notice.tone === "error" ? "text-flag" : "text-jade-strong",
                )}
              >
                {notice.text}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <DragOverlay line={drag.line} label={inHand?.label} pointer={drag.pointer} />
    </div>
  );
}

function AddWorkoutDialog({
  dialogRef,
  picker,
  openKeys,
  onPick,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  picker: BoardPicker;
  openKeys: string[];
  onPick: (key: string) => void;
}) {
  const [tab, setTab] = useState<"library" | "scheduled">("library");
  const [query, setQuery] = useState("");
  const full = openKeys.length >= MAX_COLUMNS;

  const items = picker[tab];
  const q = query.trim().toLowerCase();
  const shown = q
    ? items.filter((i) => `${i.title} ${i.detail} ${i.group}`.toLowerCase().includes(q))
    : items;
  const groups: { label: string; items: typeof shown }[] = [];
  for (const item of shown) {
    const last = groups[groups.length - 1];
    if (last && last.label === item.group) last.items.push(item);
    else groups.push({ label: item.group, items: [item] });
  }

  const empty = q
    ? "Nothing matches that."
    : tab === "library"
      ? "Your library is empty. Save a workout there first."
      : "No sessions from two weeks ago to eight weeks ahead.";

  return (
    <dialog
      ref={dialogRef}
      aria-label="Add a workout"
      // A click on the dialog itself, not its contents, is on the backdrop.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto w-[min(92vw,32rem)] rounded-[var(--radius-card)] border border-line bg-card p-0 text-ink shadow-[var(--shadow-card)] backdrop:bg-black/60"
    >
      <div className="flex max-h-[80vh] flex-col">
        <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight">Add a workout</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              {full
                ? "Seven are open, the most that fit side by side. Remove one to add another."
                : `${MAX_COLUMNS - openKeys.length} more can open side by side.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] text-ink-soft transition-colors hover:bg-paper hover:text-ink sm:h-9 sm:w-9"
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3 px-4 pt-3 sm:px-5">
          <div
            role="group"
            aria-label="Show"
            className="inline-flex self-start rounded-[var(--radius-sm)] border border-line bg-card p-0.5"
          >
            {(
              [
                ["library", "Library"],
                ["scheduled", "Scheduled"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  "eyebrow min-h-10 rounded-[calc(var(--radius-sm)-2px)] px-3.5 transition-colors sm:min-h-8",
                  tab === value ? "bg-jade-wash text-jade-strong" : "text-ink-soft hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "library" ? "Search your library" : "Search by title or person"}
            aria-label="Search"
          />
        </div>

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3 sm:px-3">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="eyebrow px-2 pb-1 pt-3 text-ink-soft">{g.label}</p>
              <ul>
                {g.items.map((item) => {
                  const isOpen = openKeys.includes(item.key);
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        disabled={isOpen || full}
                        onClick={() => onPick(item.key)}
                        className="flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-left transition-colors hover:bg-paper disabled:cursor-default disabled:hover:bg-transparent"
                      >
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm", isOpen ? "text-ink-soft" : "text-ink")}>
                            {item.title}
                          </span>
                          <span className="block truncate text-xs text-ink-soft">
                            {item.detail}
                            {item.logged ? " · Logged" : ""}
                          </span>
                        </span>
                        <span className={cn("eyebrow shrink-0", isOpen ? "text-jade-strong" : "text-ink-soft")}>
                          {isOpen ? "Open" : full ? "" : "Add"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {shown.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-ink-soft">{empty}</p>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
