// Parses the workout builder's form fields into structured data.
// Exercise rows are addressed by opaque ids (see WorkoutBuilder) so adding and
// removing rows never has to reindex the inputs.

export type ParsedExercise = {
  order: number;
  name: string;
  sets: string | null;
  reps: string | null;
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

  const rowIds = String(formData.get("rowIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const exercises: ParsedExercise[] = [];
  for (const id of rowIds) {
    const name = field(id, "name");
    if (!name) continue; // drop empty rows
    exercises.push({
      order: exercises.length + 1,
      name,
      sets: field(id, "sets"),
      reps: field(id, "reps"),
      load: field(id, "load"),
      tempo: field(id, "tempo"),
      rest: field(id, "rest"),
      notes: field(id, "notes"),
    });
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
