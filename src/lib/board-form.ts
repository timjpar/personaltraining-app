// Parses what the board's Save sends (see board-order.ts) into rows ready to
// write. A server action is a POST anyone can send, so nothing about the shape
// is trusted: keys and row ids are checked, text is trimmed and capped, and a
// row id appearing twice is refused rather than guessed at.
//
// The rules a workout has to meet are the builder's (parsePrescription in
// workout-form.ts): a title, at least one named exercise, rows with no name
// dropped, and `order` numbered 1..N down SECTION_ORDER. Errors are per
// workout, so the board can show each on its own card; if any workout has one,
// nothing is saved.
import { SECTION_ORDER } from "@/lib/constants";
import { parseDayParam } from "@/lib/calendar";
import { EXERCISE_FIELDS, parseBoardKey, type BoardKind } from "@/lib/board-order";
import type { ParsedExercise } from "@/lib/workout-form";

export const MAX_SAVE_WORKOUTS = 60;
const MAX_ROWS = 120;
const MAX_TITLE = 300;
const MAX_NOTES = 20000;
const MAX_FIELD = 2000;

// Saved rows have cuids and new ones uuids; both fit.
const ROW_ID = /^[A-Za-z0-9_-]{1,64}$/;

export type ParsedBoardExercise = ParsedExercise & {
  // The id the board knew the row by. For a session it may be an existing
  // Exercise, which is updated in place rather than recreated.
  rowId: string;
};

export type ParsedBoardWorkout = {
  key: string;
  kind: BoardKind;
  id: string;
  title: string;
  notes: string | null;
  // Sessions only.
  scheduledDate: Date | null;
  // Templates only: updatedAt as the board read it.
  version: Date | null;
  exercises: ParsedBoardExercise[];
};

export type BoardParseResult = {
  data?: ParsedBoardWorkout[];
  // Not tied to one workout: the payload itself is unusable.
  error?: string;
  // Keyed by board key.
  errors?: Record<string, string>;
};

// The columns an Exercise or TemplateExercise row is written with — the
// parsed row without the id the board knew it by.
export function exerciseColumns(e: ParsedBoardExercise): ParsedExercise {
  return {
    order: e.order,
    section: e.section,
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    weight: e.weight,
    load: e.load,
    tempo: e.tempo,
    rest: e.rest,
    notes: e.notes,
  };
}

const RELOAD ="That save didn't come through in one piece. Reload the page and try again.";

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function parseBoardSave(payload: unknown): BoardParseResult {
  if (!Array.isArray(payload) || payload.length === 0) return { error: "There's nothing to save." };
  if (payload.length > MAX_SAVE_WORKOUTS) {
    return { error: `Save up to ${MAX_SAVE_WORKOUTS} workouts at a time.` };
  }

  const errors: Record<string, string> = {};
  const seenKeys = new Set<string>();
  const seenRows = new Set<string>();
  const out: ParsedBoardWorkout[] = [];

  for (const entry of payload) {
    if (!isRecord(entry)) return { error: RELOAD };
    const parsedKey = parseBoardKey(entry.key);
    if (!parsedKey) return { error: RELOAD };
    const key = String(entry.key);
    if (seenKeys.has(key)) return { error: RELOAD };
    seenKeys.add(key);
    const { kind, id } = parsedKey;

    const rows = entry.rows;
    if (!isRecord(rows)) return { error: RELOAD };

    // Rows first, so a duplicate id is caught even on a workout that also
    // fails for an ordinary reason.
    const exercises: ParsedBoardExercise[] = [];
    let rowCount = 0;
    let tooLong: string | null = null;
    for (const section of SECTION_ORDER) {
      const list = rows[section];
      if (list === undefined) continue;
      if (!Array.isArray(list)) return { error: RELOAD };
      for (const raw of list) {
        if (!isRecord(raw)) return { error: RELOAD };
        const rowId = String(raw.id ?? "");
        if (!ROW_ID.test(rowId)) return { error: RELOAD };
        if (seenRows.has(rowId)) {
          return { error: "One exercise turned up in two places. Reload the page and try again." };
        }
        seenRows.add(rowId);
        rowCount++;

        const name = text(raw.name);
        if (!name) continue; // drop empty rows, as the builder does

        const value = (f: (typeof EXERCISE_FIELDS)[number]) => {
          const v = text(raw[f]);
          if (v.length > MAX_FIELD) tooLong ??= `Something on “${name.slice(0, 60)}” is too long to save.`;
          return v || null;
        };
        exercises.push({
          rowId,
          // Global 1..N, warm-ups first, as parsePrescription numbers them.
          order: exercises.length + 1,
          section,
          name: value("name") ?? name,
          sets: value("sets"),
          reps: value("reps"),
          weight: value("weight"),
          load: value("load"),
          tempo: value("tempo"),
          rest: value("rest"),
          notes: value("notes"),
        });
      }
    }

    const title = text(entry.title);
    const notes = text(entry.notes);
    if (!title) {
      errors[key] = "Give it a title.";
      continue;
    }
    if (title.length > MAX_TITLE) {
      errors[key] = "That title is too long.";
      continue;
    }
    if (notes.length > MAX_NOTES) {
      errors[key] = "Those notes are too long.";
      continue;
    }
    if (tooLong) {
      errors[key] = tooLong;
      continue;
    }
    if (rowCount > MAX_ROWS) {
      errors[key] = `A workout can hold up to ${MAX_ROWS} exercises.`;
      continue;
    }
    if (exercises.length === 0) {
      errors[key] = "Add at least one exercise.";
      continue;
    }

    let scheduledDate: Date | null = null;
    let version: Date | null = null;
    if (kind === "session") {
      scheduledDate = parseDayParam(entry.date);
      if (!scheduledDate) {
        errors[key] = "Pick a date for the session.";
        continue;
      }
    } else {
      version = typeof entry.version === "string" ? new Date(entry.version) : null;
      if (!version || Number.isNaN(version.getTime())) return { error: RELOAD };
    }

    out.push({
      key,
      kind,
      id,
      title,
      notes: notes || null,
      scheduledDate,
      version,
      exercises,
    });
  }

  if (Object.keys(errors).length) return { errors };
  return { data: out };
}
