// The side-by-side board (/library/compare): the workouts it holds and every
// way it rearranges them, as pure functions — drag and drop, the arrows and
// the "Move to" picker all go through these, so the three can't disagree.
//
// A board holds library workouts and scheduled sessions side by side. Both are
// a title, notes and exercise rows in three sections, which is all the board
// edits; anything else about them stays in the full editor. Every loaded
// workout lives in one store keyed by `t:<id>` or `w:<id>`, so switching
// between columns and the week never drops an unsaved change.
import { SECTION_ORDER, type ExerciseSection } from "@/lib/constants";

export type Dir = -1 | 1;

// Controlled inputs, so every field is a string and "" means blank; the save
// turns blanks back into nulls.
export type BoardExercise = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  load: string;
  tempo: string;
  rest: string;
  notes: string;
};

export const EXERCISE_FIELDS = [
  "name",
  "sets",
  "reps",
  "weight",
  "load",
  "tempo",
  "rest",
  "notes",
] as const satisfies readonly (keyof BoardExercise)[];

export type BoardRows = Record<ExerciseSection, BoardExercise[]>;

export type BoardKind = "template" | "session";

export type BoardWorkout = {
  key: string;
  kind: BoardKind;
  id: string;
  title: string;
  notes: string;
  discipline: string;
  // Sessions only: the date (yyyy-mm-dd), its time as text, and who it's for.
  date: string | null;
  time: string | null;
  person: { id: string; name: string; self: boolean } | null;
  // A logged session. Shown for comparison, never changed here.
  locked: boolean;
  // Templates only: updatedAt when this copy was read, so a save can tell the
  // library workout changed somewhere else since.
  version: string | null;
  rows: BoardRows;
};

export type BoardStore = Record<string, BoardWorkout>;

// The week layout's seven days and what's on them. `src` is "library" (the
// day each library workout's title names) or a person's real week of sessions.
export type BoardDay = {
  label: string; // "Mon"
  name: string; // "Monday"
  date: string | null; // yyyy-mm-dd, for a person's week
  dayOfMonth: number | null;
  today: boolean;
};

export type BoardWeek = {
  src: string;
  // The Sunday a person's week starts on, and the weeks either side of it.
  week: string | null;
  prev: string | null;
  next: string | null;
  thisWeek: string | null;
  label: string;
  days: BoardDay[];
  keys: string[];
};

// What "Add workout" lists.
export type BoardPickerItem = {
  key: string;
  title: string;
  // The heading it's listed under: a day for the library, a date for sessions.
  group: string;
  detail: string;
  logged: boolean;
};

export type BoardPicker = { library: BoardPickerItem[]; scheduled: BoardPickerItem[] };

export const MAX_COLUMNS = 7;

export function boardKey(kind: BoardKind, id: string): string {
  return `${kind === "template" ? "t" : "w"}:${id}`;
}

// Keys arrive in the URL and in action arguments, so they're checked rather
// than trusted: a cuid or a uuid, nothing else.
export function parseBoardKey(key: unknown): { kind: BoardKind; id: string } | null {
  const m = /^([tw]):([A-Za-z0-9_-]{1,64})$/.exec(String(key ?? ""));
  if (!m) return null;
  return { kind: m[1] === "t" ? "template" : "session", id: m[2] };
}

export const emptyRows = (): BoardRows => ({ WARMUP: [], MAIN: [], COOLDOWN: [] });

export const blankExercise = (id: string): BoardExercise => ({
  id,
  name: "",
  sets: "",
  reps: "",
  weight: "",
  load: "",
  tempo: "",
  rest: "",
  notes: "",
});

export function allExercises(w: BoardWorkout): BoardExercise[] {
  return SECTION_ORDER.flatMap((s) => w.rows[s]);
}

export function exerciseCount(w: BoardWorkout): number {
  return SECTION_ORDER.reduce((n, s) => n + w.rows[s].length, 0);
}

// The working sets in a workout, for comparing columns at a glance: the
// leading number of each row's sets ("3", "3-4", "4 + 1 back-off" all count
// their first figure). Rows with no number don't count.
export function setTotal(w: BoardWorkout): number {
  let n = 0;
  for (const ex of allExercises(w)) {
    const m = /^\s*(\d+)/.exec(ex.sets);
    if (m) n += Number(m[1]);
  }
  return n;
}

export function usesBoardSections(w: BoardWorkout): boolean {
  return w.rows.WARMUP.length > 0 || w.rows.COOLDOWN.length > 0;
}

export function findExercise(
  w: BoardWorkout,
  id: string,
): { section: ExerciseSection; index: number } | null {
  for (const section of SECTION_ORDER) {
    const index = w.rows[section].findIndex((r) => r.id === id);
    if (index >= 0) return { section, index };
  }
  return null;
}

// Replaces one workout, leaving every other object as it was — the cards are
// memoized on their workout, so only the one that changed re-renders.
function put(store: BoardStore, w: BoardWorkout): BoardStore {
  return { ...store, [w.key]: w };
}

const editable = (w: BoardWorkout | undefined): w is BoardWorkout =>
  w != null && !w.locked;

export function patchWorkout(
  store: BoardStore,
  key: string,
  patch: Partial<Pick<BoardWorkout, "title" | "notes" | "date">>,
): BoardStore {
  const w = store[key];
  if (!editable(w)) return store;
  return put(store, { ...w, ...patch });
}

export function patchExercise(
  store: BoardStore,
  key: string,
  id: string,
  patch: Partial<Omit<BoardExercise, "id">>,
): BoardStore {
  const w = store[key];
  if (!editable(w)) return store;
  const at = findExercise(w, id);
  if (!at) return store;
  const list = [...w.rows[at.section]];
  list[at.index] = { ...list[at.index], ...patch };
  return put(store, { ...w, rows: { ...w.rows, [at.section]: list } });
}

// The id comes from the caller (crypto.randomUUID) so this stays pure.
export function addExercise(
  store: BoardStore,
  key: string,
  section: ExerciseSection,
  id: string,
): BoardStore {
  const w = store[key];
  if (!editable(w)) return store;
  return put(store, {
    ...w,
    rows: { ...w.rows, [section]: [...w.rows[section], blankExercise(id)] },
  });
}

export function removeExercise(store: BoardStore, key: string, id: string): BoardStore {
  const w = store[key];
  if (!editable(w)) return store;
  const at = findExercise(w, id);
  if (!at) return store;
  return put(store, {
    ...w,
    rows: { ...w.rows, [at.section]: w.rows[at.section].filter((r) => r.id !== id) },
  });
}

// A copy of one exercise, every field and all, just below it. The id comes
// from the caller, as with addExercise.
export function duplicateExercise(
  store: BoardStore,
  key: string,
  id: string,
  copyId: string,
): BoardStore {
  const w = store[key];
  if (!editable(w)) return store;
  const at = findExercise(w, id);
  if (!at) return store;
  const list = [...w.rows[at.section]];
  list.splice(at.index + 1, 0, { ...list[at.index], id: copyId });
  return put(store, { ...w, rows: { ...w.rows, [at.section]: list } });
}

// Where a dragged exercise lands: before `index` in `section` of workout
// `key`, counted with the dragged exercise already taken out — the same
// convention useExerciseDrag uses within one workout.
export type ExerciseDrop = { key: string; section: ExerciseSection; index: number };

// Out of one workout and into another, or within one. Neither end may be a
// logged session. A workout the move empties stays empty; the save says so.
export function moveExercise(
  store: BoardStore,
  from: { key: string; id: string },
  to: ExerciseDrop,
): BoardStore {
  const source = store[from.key];
  const target = store[to.key];
  if (!editable(source) || !editable(target)) return store;
  const at = findExercise(source, from.id);
  if (!at) return store;
  const row = source.rows[at.section][at.index];

  const without: BoardWorkout = {
    ...source,
    rows: {
      ...source.rows,
      [at.section]: source.rows[at.section].filter((r) => r.id !== from.id),
    },
  };
  const into = from.key === to.key ? without : target;
  const list = [...into.rows[to.section]];
  const index = Math.max(0, Math.min(to.index, list.length));
  list.splice(index, 0, row);
  const landed: BoardWorkout = { ...into, rows: { ...into.rows, [to.section]: list } };

  if (from.key === to.key) return put(store, landed);
  return put(put(store, without), landed);
}

// One place up or down. At the edge of a section it crosses into the next one
// — the end of the section above, or the start of the one below — so the
// arrows reach every place a drag can.
export function stepExercise(
  store: BoardStore,
  key: string,
  id: string,
  dir: Dir,
): BoardStore {
  const w = store[key];
  if (!editable(w)) return store;
  const at = findExercise(w, id);
  if (!at) return store;
  const len = w.rows[at.section].length;
  const s = SECTION_ORDER.indexOf(at.section);

  if (at.index + dir >= 0 && at.index + dir < len) {
    return moveExercise(store, { key, id }, { key, section: at.section, index: at.index + dir });
  }
  const next = SECTION_ORDER[s + dir];
  if (!next) return store;
  return moveExercise(
    store,
    { key, id },
    { key, section: next, index: dir < 0 ? w.rows[next].length : 0 },
  );
}

export function canStepExercise(w: BoardWorkout, id: string, dir: Dir): boolean {
  const at = findExercise(w, id);
  if (!at) return false;
  if (at.index + dir >= 0 && at.index + dir < w.rows[at.section].length) return true;
  return SECTION_ORDER[SECTION_ORDER.indexOf(at.section) + dir] != null;
}

// Columns are a view: reordering them changes nothing saved. `index` is
// counted with the moved column already taken out.
export function moveColumn(keys: string[], key: string, index: number): string[] {
  const rest = keys.filter((k) => k !== key);
  if (rest.length === keys.length) return keys;
  const at = Math.max(0, Math.min(index, rest.length));
  return [...rest.slice(0, at), key, ...rest.slice(at)];
}

const clean = (s: string) => s.trim();

// What a save would write, in a form two copies of a workout can be compared
// by: unchanged means not sent. Trimmed, because the save trims too, so a
// space typed and deleted again isn't a change.
export function serializeWorkout(w: BoardWorkout): string {
  return JSON.stringify([
    clean(w.title),
    clean(w.notes),
    w.date,
    SECTION_ORDER.map((s) =>
      w.rows[s].map((r) => [r.id, ...EXERCISE_FIELDS.map((f) => clean(r[f]))]),
    ),
  ]);
}

// One changed workout as the save action receives it.
export type BoardSaveEntry = {
  key: string;
  title: string;
  notes: string;
  date: string | null;
  version: string | null;
  rows: BoardRows;
};

export function toSaveEntry(w: BoardWorkout): BoardSaveEntry {
  return {
    key: w.key,
    title: w.title,
    notes: w.notes,
    date: w.date,
    version: w.version,
    rows: w.rows,
  };
}
