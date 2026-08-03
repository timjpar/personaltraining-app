// Parses the workout builder's form fields into structured data.
// Exercise rows are addressed by opaque ids (see WorkoutBuilder) so adding and
// removing rows never has to reindex the inputs. The builder posts one id list
// per section (`rowIds_WARMUP`, `rowIds_MAIN`, `rowIds_COOLDOWN`); the field
// names themselves stay flat, since row ids are unique across sections.

import {
  SECTION_ORDER,
  toExerciseSection,
  SECTION_LABELS,
  type ExerciseSection,
} from "@/lib/constants";

export type ParsedExercise = {
  order: number;
  // Required, not optional: an omitted section would type-check and then
  // silently collapse the row into MAIN on the first edit.
  section: ExerciseSection;
  name: string;
  sets: string | null;
  reps: string | null;
  weight: string | null;
  load: string | null;
  tempo: string | null;
  rest: string | null;
  notes: string | null;
};

export type ParsedWorkout = {
  title: string;
  notes: string | null;
  scheduledDate: Date;
  exercises: ParsedExercise[];
};

// The prescription (title + notes + exercise rows) shared by dated workouts and
// date-less templates. Returns an error string if the shape is unusable.
export type ParsedPrescription = {
  title: string;
  notes: string | null;
  exercises: ParsedExercise[];
};

const idList = (formData: FormData, field: string) =>
  String(formData.get(field) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function parsePrescription(
  formData: FormData,
): { data?: ParsedPrescription; error?: string } {
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title) return { error: "Give the session a title." };

  const field = (id: string, name: string) => {
    const v = String(formData.get(`ex_${id}_${name}`) ?? "").trim();
    return v || null;
  };

  // A builder page left open across a deploy still posts the old single-list
  // shape. Treat it as the main section rather than dropping every row.
  const legacyIds = idList(formData, "rowIds");

  const exercises: ParsedExercise[] = [];
  for (const section of SECTION_ORDER) {
    const ids = idList(formData, `rowIds_${section}`);
    const rowIds =
      ids.length === 0 && section === "MAIN" && legacyIds.length
        ? legacyIds
        : ids;

    for (const id of rowIds) {
      const name = field(id, "name");
      if (!name) continue; // drop empty rows
      exercises.push({
        // Global 1..N in display order. Because this loop walks SECTION_ORDER,
        // warm-ups number first and cool-downs last without a secondary sort.
        order: exercises.length + 1,
        section,
        name,
        sets: field(id, "sets"),
        reps: field(id, "reps"),
        weight: field(id, "weight"),
        load: field(id, "load"),
        tempo: field(id, "tempo"),
        rest: field(id, "rest"),
        notes: field(id, "notes"),
      });
    }
  }

  if (exercises.length === 0) {
    return { error: "Add at least one exercise." };
  }

  return { data: { title, notes, exercises } };
}

export function parseWorkoutForm(
  formData: FormData,
): { data?: ParsedWorkout; error?: string } {
  const { data, error } = parsePrescription(formData);
  if (error || !data) return { error };

  const dateStr = String(formData.get("scheduledDate") ?? "").trim();
  if (!dateStr) return { error: "Pick a date for the session." };

  const scheduledDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(scheduledDate.getTime())) {
    return { error: "That date doesn't look right." };
  }

  return { data: { ...data, scheduledDate } };
}

export type PrescriptionRow = {
  name: string;
  sets: string | null;
  reps: string | null;
  weight: string | null;
  load: string | null;
  tempo: string | null;
  rest: string | null;
  notes: string | null;
  order: number;
  section: string;
};

// Copy prescription rows into the shape Workout.exercises and template
// exercises both want. It lives here rather than beside its callers because a
// "use server" module may only export async functions — which is how the
// program-assignment path ended up with its own drifting copy of this.
export function exerciseRowsFrom(exercises: PrescriptionRow[]) {
  return exercises.map((e) => ({
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    weight: e.weight,
    load: e.load,
    tempo: e.tempo,
    rest: e.rest,
    notes: e.notes,
    order: e.order,
    section: e.section,
  }));
}

// Split a flat, order-ascending list into its sections for display. Empty
// sections drop out, so a workout that never used warm-ups renders exactly as
// it did before this feature existed.
export function groupBySection<T extends { section: string }>(rows: T[]) {
  return SECTION_ORDER.map((section) => ({
    section,
    label: SECTION_LABELS[section],
    rows: rows.filter((r) => toExerciseSection(r.section) === section),
  })).filter((g) => g.rows.length > 0);
}

// Whether a session is worth labelling. All-main work — which is every workout
// written before this feature existed — reads better as a plain list, so the
// headings only appear once a coach has actually used them.
export function usesSections(rows: { section: string }[]) {
  return rows.some((r) => toExerciseSection(r.section) !== "MAIN");
}
