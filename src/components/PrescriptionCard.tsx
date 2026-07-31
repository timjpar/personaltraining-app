import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui";

export type Metric = { label: string; value?: string | null };

// Signature typographic move: programmed numbers set in mono, tabular figures,
// with tiny uppercase mono labels — reads like a coach's program sheet.
export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  const shown = metrics.filter((m) => m.value && String(m.value).trim() !== "");
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2.5">
      {shown.map((m) => (
        <div key={m.label} className="flex flex-col gap-0.5">
          <span className="eyebrow text-ink-soft/70">{m.label}</span>
          <span className="metric text-[0.95rem] font-medium tracking-tight text-ink">
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// Divider above a warm-up / main / cool-down block. Only rendered when a
// session actually uses sections — see sectionGroups() callers.
export function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-2 flex items-center gap-2.5">
      <span className="eyebrow text-ink-soft">{label}</span>
      <span className="metric text-xs text-ink-soft/60">{count}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function exerciseMetrics(ex: {
  sets?: string | null;
  reps?: string | null;
  load?: string | null;
  tempo?: string | null;
  rest?: string | null;
}): Metric[] {
  return [
    { label: "Sets", value: ex.sets },
    { label: "Reps", value: ex.reps },
    { label: "Load", value: ex.load },
    { label: "Tempo", value: ex.tempo },
    { label: "Rest", value: ex.rest },
  ];
}

export function PrescriptionCard({
  index,
  name,
  metrics,
  notes,
  logged,
  footer,
  className,
}: {
  index: number | string;
  name: string;
  metrics: Metric[];
  notes?: string | null;
  logged?: boolean;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border bg-card p-4 sm:p-5",
        logged ? "border-jade/30 bg-jade-wash/40" : "border-line",
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <span className="metric mt-0.5 flex h-7 min-w-7 items-center justify-center rounded-[6px] border border-line bg-paper px-1.5 text-xs font-medium text-ink-soft">
          {String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-base font-semibold leading-tight text-ink">
              {name}
            </h3>
            {logged ? <Badge tone="jade">Logged</Badge> : null}
          </div>
          <div className="mt-3">
            <MetricStrip metrics={metrics} />
          </div>
          {notes ? (
            <p className="mt-3 border-l-2 border-line pl-3 text-sm leading-relaxed text-ink-soft">
              {notes}
            </p>
          ) : null}
          {footer ? <div className="mt-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
