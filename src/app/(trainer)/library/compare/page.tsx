import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { PageHeading } from "@/components/ui";
import { WorkoutBoard } from "@/components/WorkoutBoard";
import { assignableClients } from "@/lib/assignees";
import { boardPicker, boardWeek, boardWorkouts } from "@/lib/board-load";
import { MAX_COLUMNS, parseBoardKey, type BoardWorkout } from "@/lib/board-order";
import { getPickerCatalog } from "@/lib/exercise-catalog";
import { prisma } from "@/lib/db";

type Search = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// The board's state lives in the URL — ?layout=week&src=…&week=… and
// ?w=t:<id>,w:<id> for the columns — so a reload or a bookmark opens the same
// view. The board rewrites it as it changes, without a navigation.
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const trainer = await requireTrainer();
  const sp = await searchParams;

  const layout = one(sp.layout) === "week" ? "week" : "columns";
  const keys = [
    ...new Set(
      (one(sp.w) ?? "")
        .split(",")
        .map((k) => k.trim())
        .filter((k) => parseBoardKey(k)),
    ),
  ].slice(0, MAX_COLUMNS);

  const [columnWorkouts, requestedWeek, picker, clients, catalog, me] = await Promise.all([
    boardWorkouts(trainer.id, keys),
    layout === "week" ? boardWeek(trainer.id, one(sp.src) || "library", one(sp.week)) : null,
    boardPicker(trainer.id),
    assignableClients(trainer.id),
    getPickerCatalog(trainer.id),
    prisma.user.findUnique({ where: { id: trainer.id }, select: { boardShelf: true } }),
  ]);
  // A week for someone no longer on the roster opens on the library instead.
  const week =
    layout === "week" ? (requestedWeek ?? (await boardWeek(trainer.id, "library"))) : null;

  const workouts = new Map<string, BoardWorkout>();
  for (const w of [...columnWorkouts, ...(week?.workouts ?? [])]) workouts.set(w.key, w);

  return (
    // Wider than Container: seven columns need the whole screen.
    <div className="mx-auto w-full max-w-[120rem] px-5 py-8 sm:px-8 sm:py-10">
      <Link
        href="/library"
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ Workouts
      </Link>
      <div className="mt-3">
        <PageHeading eyebrow="Workouts" title="Side by side">
          Compare workouts, drag exercises between them, and save every change at once.
        </PageHeading>
      </div>

      <WorkoutBoard
        initialLayout={layout}
        initialColumns={columnWorkouts.map((w) => w.key)}
        initialWeek={week?.week ?? null}
        workouts={[...workouts.values()]}
        picker={picker}
        people={[
          { id: "me", name: "You" },
          ...clients.map((c) => ({ id: c.id, name: c.name })),
        ]}
        catalog={catalog}
        initialShelf={me?.boardShelf ?? []}
      />
    </div>
  );
}
