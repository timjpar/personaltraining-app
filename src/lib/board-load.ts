// Reads for the side-by-side board (/library/compare): workouts by key, a
// week of them, and the list the "Add workout" picker offers. Server-only — it
// talks to Prisma — and every query is scoped to the trainer, so a key from the
// URL can only ever reach the caller's own workouts.
import { prisma } from "@/lib/db";
import {
  CLIENT_STAGE,
  ROLES,
  WORKOUT_STATUS,
  toExerciseSection,
} from "@/lib/constants";
import { addDays, formatDate, toDateInput } from "@/lib/format";
import { formatTime, isSameDay, parseDayParam, startOfWeekSunday } from "@/lib/calendar";
import { DAY_LABELS, workoutDay } from "@/lib/library-view";
import {
  boardKey,
  emptyRows,
  parseBoardKey,
  type BoardDay,
  type BoardPicker,
  type BoardWeek,
  type BoardWorkout,
} from "@/lib/board-order";

const EXERCISES = {
  orderBy: { order: "asc" },
  select: {
    id: true,
    name: true,
    sets: true,
    reps: true,
    weight: true,
    load: true,
    tempo: true,
    rest: true,
    notes: true,
    section: true,
  },
} as const;

type ExerciseRow = {
  id: string;
  name: string;
  sets: string | null;
  reps: string | null;
  weight: string | null;
  load: string | null;
  tempo: string | null;
  rest: string | null;
  notes: string | null;
  section: string;
};

function rowsOf(exercises: ExerciseRow[]) {
  const rows = emptyRows();
  for (const e of exercises) {
    rows[toExerciseSection(e.section)].push({
      id: e.id,
      name: e.name,
      sets: e.sets ?? "",
      reps: e.reps ?? "",
      weight: e.weight ?? "",
      load: e.load ?? "",
      tempo: e.tempo ?? "",
      rest: e.rest ?? "",
      notes: e.notes ?? "",
    });
  }
  return rows;
}

function templateToBoard(t: {
  id: string;
  title: string;
  notes: string | null;
  discipline: string;
  updatedAt: Date;
  exercises: ExerciseRow[];
}): BoardWorkout {
  return {
    key: boardKey("template", t.id),
    kind: "template",
    id: t.id,
    title: t.title,
    notes: t.notes ?? "",
    discipline: t.discipline,
    date: null,
    time: null,
    person: null,
    locked: false,
    version: t.updatedAt.toISOString(),
    rows: rowsOf(t.exercises),
  };
}

function sessionToBoard(
  w: {
    id: string;
    title: string;
    notes: string | null;
    discipline: string;
    scheduledDate: Date;
    startMinute: number | null;
    status: string;
    clientId: string;
    client: { name: string };
    exercises: ExerciseRow[];
  },
  trainerId: string,
): BoardWorkout {
  const self = w.clientId === trainerId;
  return {
    key: boardKey("session", w.id),
    kind: "session",
    id: w.id,
    title: w.title,
    notes: w.notes ?? "",
    discipline: w.discipline,
    date: toDateInput(w.scheduledDate),
    time: w.startMinute == null ? null : formatTime(w.startMinute),
    person: { id: w.clientId, name: self ? "You" : w.client.name, self },
    locked: w.status === WORKOUT_STATUS.COMPLETED,
    version: null,
    rows: rowsOf(w.exercises),
  };
}

const SESSION_INCLUDE = {
  exercises: EXERCISES,
  client: { select: { name: true } },
} as const;

/** The trainer's workouts for these keys, in key order. Unknown keys drop out. */
export async function boardWorkouts(
  trainerId: string,
  keys: string[],
): Promise<BoardWorkout[]> {
  const parsed = keys.map(parseBoardKey).filter((k) => k != null);
  const templateIds = parsed.filter((k) => k.kind === "template").map((k) => k.id);
  const sessionIds = parsed.filter((k) => k.kind === "session").map((k) => k.id);

  const [templates, sessions] = await Promise.all([
    templateIds.length
      ? prisma.workoutTemplate.findMany({
          where: { id: { in: templateIds }, trainerId },
          include: { exercises: EXERCISES },
        })
      : [],
    sessionIds.length
      ? prisma.workout.findMany({
          where: { id: { in: sessionIds }, trainerId },
          include: SESSION_INCLUDE,
        })
      : [],
  ]);

  const byKey = new Map<string, BoardWorkout>();
  for (const t of templates) byKey.set(boardKey("template", t.id), templateToBoard(t));
  for (const w of sessions) byKey.set(boardKey("session", w.id), sessionToBoard(w, trainerId));
  return keys.map((k) => byKey.get(k)).filter((w) => w != null);
}

const WEEKDAYS: BoardDay[] = DAY_LABELS.map((name) => ({
  label: name.slice(0, 3),
  name,
  date: null,
  dayOfMonth: null,
  today: false,
}));

function weekLabel(start: Date): string {
  const end = addDays(start, 6);
  const month = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()} – ${end.getDate()}`
    : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}

/**
 * A week for the board. `src` is "library" for the library laid out by the day
 * each title names, "me" for the coach's own sessions, or a client's id. Null
 * for a client who isn't on this trainer's roster.
 */
export async function boardWeek(
  trainerId: string,
  src: string,
  weekParam?: string | null,
): Promise<{ week: BoardWeek; workouts: BoardWorkout[] } | null> {
  if (src === "library") {
    const templates = await prisma.workoutTemplate.findMany({
      where: { trainerId },
      include: { exercises: EXERCISES },
      orderBy: { title: "asc" },
    });
    const workouts = templates.map(templateToBoard);
    return {
      week: {
        src,
        week: null,
        prev: null,
        next: null,
        thisWeek: null,
        label: "Library",
        days: WEEKDAYS,
        keys: workouts.map((w) => w.key),
      },
      workouts,
    };
  }

  let personId = trainerId;
  if (src !== "me" && src !== trainerId) {
    const client = await prisma.user.findFirst({
      where: {
        id: src,
        trainerId,
        role: ROLES.CLIENT,
        stage: { not: CLIENT_STAGE.ARCHIVED },
      },
      select: { id: true },
    });
    if (!client) return null;
    personId = client.id;
  }

  const today = new Date();
  const start = startOfWeekSunday(parseDayParam(weekParam) ?? today);
  const sessions = await prisma.workout.findMany({
    where: {
      trainerId,
      clientId: personId,
      scheduledDate: { gte: start, lt: addDays(start, 7) },
    },
    include: SESSION_INCLUDE,
    // Postgres sorts nulls last ascending, so a day's timed sessions come
    // first and its all-day ones after.
    orderBy: [{ scheduledDate: "asc" }, { startMinute: "asc" }],
  });
  const workouts = sessions.map((w) => sessionToBoard(w, trainerId));

  const days: BoardDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const name = DAY_LABELS[d.getDay()];
    return {
      label: name.slice(0, 3),
      name,
      date: toDateInput(d),
      dayOfMonth: d.getDate(),
      today: isSameDay(d, today),
    };
  });

  return {
    week: {
      src: personId === trainerId ? "me" : personId,
      week: toDateInput(start),
      prev: toDateInput(addDays(start, -7)),
      next: toDateInput(addDays(start, 7)),
      thisWeek: toDateInput(startOfWeekSunday(today)),
      label: weekLabel(start),
      days,
      keys: workouts.map((w) => w.key),
    },
    workouts,
  };
}

// What "Add workout" offers: every library workout, and sessions from two
// weeks back to eight ahead — the stretch a coach plans in and looks back on.
export async function boardPicker(trainerId: string): Promise<BoardPicker> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [templates, sessions] = await Promise.all([
    prisma.workoutTemplate.findMany({
      where: { trainerId },
      select: { id: true, title: true, _count: { select: { exercises: true } } },
    }),
    prisma.workout.findMany({
      where: {
        trainerId,
        scheduledDate: { gte: addDays(today, -14), lt: addDays(today, 57) },
      },
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        status: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: [{ scheduledDate: "asc" }, { startMinute: "asc" }],
      take: 400,
    }),
  ]);

  const library = templates
    .map((t) => ({ t, day: workoutDay(t.title) }))
    .sort((a, b) => (a.day ?? 7) - (b.day ?? 7) || a.t.title.localeCompare(b.t.title))
    .map(({ t, day }) => ({
      key: boardKey("template", t.id),
      title: t.title,
      group: day == null ? "No day" : DAY_LABELS[day],
      detail: `${t._count.exercises} exercise${t._count.exercises === 1 ? "" : "s"}`,
      logged: false,
    }));

  const scheduled = sessions.map((w) => ({
    key: boardKey("session", w.id),
    title: w.title,
    group: formatDate(w.scheduledDate),
    detail: w.clientId === trainerId ? "You" : w.client.name,
    logged: w.status === WORKOUT_STATUS.COMPLETED,
  }));

  return { library, scheduled };
}
