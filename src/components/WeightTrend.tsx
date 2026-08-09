import { massLabel, massValue } from "@/lib/units";
import { formatDate } from "@/lib/format";
import type { Units } from "@/lib/constants";

// A bodyweight sparkline, drawn as inline SVG. No chart library — none is
// installed, and this is one polyline. Everything is a token class rather than
// a hex value, so the line re-colours with the accent scheme for free.
//
// This is the glance. The table beside it is the data, and it is also the real
// accessible representation — which is why both ship rather than one or the
// other. The <title> here only names the range.

export type TrendPoint = { date: Date; kg: number };

export function WeightTrend({
  points,
  goalKg,
  units,
  className,
}: {
  points: TrendPoint[];
  goalKg?: number | null;
  units: Units;
  className?: string;
}) {
  // One point is a dot, not a trend, and zero is nothing at all. The caller
  // shows an EmptyState instead.
  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());

  const W = 300;
  const H = 80;
  const padX = 4;
  const padY = 8;

  const tMin = sorted[0].date.getTime();
  const tMax = sorted[sorted.length - 1].date.getTime();
  const tSpan = tMax - tMin;

  const values = sorted.map((p) => p.kg);
  if (goalKg != null) values.push(goalKg);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  // Guard the degenerate case where every reading is identical: without this
  // the range is zero and every y divides by it.
  const pad = Math.max(1, (vMax - vMin) * 0.15);
  const lo = vMin - pad;
  const hi = vMax + pad;

  // x is proportional to *time*, not to index. Weigh-ins are irregular, and
  // even spacing would draw a three-week gap as though it were a week.
  const x = (d: Date) =>
    tSpan === 0
      ? padX
      : padX + ((d.getTime() - tMin) / tSpan) * (W - padX * 2);
  const y = (kg: number) =>
    padY + ((hi - kg) / (hi - lo)) * (H - padY * 2);

  const line = sorted.map((p) => `${x(p.date)},${y(p.kg)}`).join(" ");
  const area = `M ${x(sorted[0].date)},${H} L ${line.split(" ").join(" L ")} L ${x(sorted[sorted.length - 1].date)},${H} Z`;

  const last = sorted[sorted.length - 1];
  const goalY = goalKg != null ? y(goalKg) : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className ?? "h-20 w-full"}
      // The geometry stretches to whatever width the card gives it — uniform
      // scaling would lock the drawing to the viewBox's 3.75:1 and leave it
      // floating in the middle of a wide card. What normally makes that a bad
      // trade is the stroke stretching with it; vectorEffect below opts every
      // stroked element out of the transform, so the line keeps its weight at
      // any width and only the shape responds.
      preserveAspectRatio="none"
      role="img"
    >
      <title>
        {`Bodyweight from ${formatDate(sorted[0].date)} to ${formatDate(last.date)}, ${massLabel(sorted[0].kg, units)} to ${massLabel(last.kg, units)}`}
      </title>

      <path d={area} className="fill-jade/10" />

      {goalY != null ? (
        <line
          x1={padX}
          x2={W - padX}
          y1={goalY}
          y2={goalY}
          className="stroke-line"
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      <polyline
        points={line}
        className="fill-none stroke-jade"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* The newest reading. A zero-length line with a round cap rather than a
          <circle>, which the non-uniform scale above would draw as an ellipse
          — a capped stroke is exempt from the transform like its neighbours,
          so this stays a circle of exactly strokeWidth across. */}
      <line
        x1={x(last.date)}
        y1={y(last.kg)}
        x2={x(last.date)}
        y2={y(last.kg)}
        className="stroke-jade"
        strokeWidth={6}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// The four figures that sit above the trend. Styled as MacroBar's cells, which
// is already the app's language for "a row of numbers you read at a glance".
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
