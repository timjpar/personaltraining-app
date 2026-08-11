import { massLabel, massValue } from "@/lib/units";
import type { Units } from "@/lib/constants";

// The four figures that sit above the trend chart. Styled as MacroBar's cells,
// which is already the app's language for "a row of numbers you read at a
// glance".
//
// Used to live in WeightTrend.tsx beside the bodyweight sparkline. That
// sparkline's last caller went when the hub cards took the full chart, so it
// was deleted and this moved out rather than keeping a file named after a
// component it no longer contains.
//
// Note what has no colour: the change figure. globals.css reserves amber for
// effort and jade for action and completion, and a bodyweight moving toward a
// goal is neither. An arrow and plain ink says the direction without turning a
// measurement into a verdict.
export function BodyStats({
  currentKg,
  previousKg,
  goalKg,
  units,
  sinceLabel,
}: {
  currentKg: number | null;
  previousKg: number | null;
  goalKg: number | null;
  units: Units;
  sinceLabel: string;
}) {
  const change =
    currentKg != null && previousKg != null ? currentKg - previousKg : null;
  const toGo =
    currentKg != null && goalKg != null ? goalKg - currentKg : null;

  const cells: { label: string; value: string; sub?: string }[] = [
    {
      label: "Current",
      value: massLabel(currentKg, units),
    },
    {
      label: `Change`,
      value:
        change == null
          ? "—"
          : `${change > 0 ? "↑" : change < 0 ? "↓" : ""} ${massValue(Math.abs(change), units).toFixed(1)}`,
      sub: change == null ? undefined : sinceLabel,
    },
    {
      label: "Goal",
      value: massLabel(goalKg, units),
    },
    {
      label: "To go",
      value:
        toGo == null ? "—" : massValue(Math.abs(toGo), units).toFixed(1),
      sub:
        toGo == null
          ? undefined
          : Math.abs(toGo) < 0.05
            ? "there"
            : toGo < 0
              ? "to lose"
              : "to gain",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-[var(--radius-sm)] border border-line bg-card px-3.5 py-2.5"
        >
          <p className="eyebrow text-ink-soft/70">{c.label}</p>
          <p className="metric mt-1 text-lg font-semibold leading-none text-ink">
            {c.value}
          </p>
          {c.sub ? (
            <p className="metric mt-1.5 whitespace-nowrap text-xs leading-none text-ink-soft">
              {c.sub}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
