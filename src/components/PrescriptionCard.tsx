import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui";
import { VideoEmbed } from "@/components/VideoEmbed";

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
  weight?: string | null;
  load?: string | null;
  tempo?: string | null;
  rest?: string | null;
}): Metric[] {
  // MetricStrip drops empty values, so unused metrics simply don't render.
  return [
    { label: "Sets", value: ex.sets },
    { label: "Reps", value: ex.reps },
    { label: "Weight", value: ex.weight },
    { label: "Load", value: ex.load },
    { label: "Tempo", value: ex.tempo },
    { label: "Rest", value: ex.rest },
  ];
}

// A movement demo. `own` is a link the trainer attached, which embeds in-app;
// otherwise it's the generic YouTube search fallback, which can only link out.
export type Demo = { own: boolean; url: string };

function DemoMedia({ demo, name }: { demo: Demo; name: string }) {
  if (demo.own) return <VideoEmbed url={demo.url} name={name} />;
  return (
    <a
      href={demo.url}
      target="_blank"
      rel="noopener noreferrer"
      // -ml-2 + padding: a real touch target without the text losing its
      // left alignment with the metrics above it.
      className="-ml-2 mt-1 inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-sm text-ink-soft transition-colors hover:text-ink hover:underline sm:mt-2 sm:min-h-0 sm:py-1"
    >
      Search for a demo ↗
    </a>
  );
}

export function PrescriptionCard({
  index,
  name,
  metrics,
  notes,
  logged,
  footer,
  demo,
  struck,
  className,
}: {
  index: number | string;
  name: string;
  metrics: Metric[];
  notes?: string | null;
  logged?: boolean;
  footer?: ReactNode;
  // Only the client-facing views pass this; trainer pages render unchanged.
  demo?: Demo;
  // Live "crossed off the board" state while logging. Distinct from `logged`,
  // which is the saved, after-the-fact badge on a finished session.
  struck?: boolean;
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
        <span
          className={cn(
            "metric mt-0.5 flex h-7 min-w-7 items-center justify-center rounded-[6px] border border-line bg-paper px-1.5 text-xs font-medium text-ink-soft transition-opacity",
            struck && "opacity-55",
          )}
        >
          {String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            {/* Crossed off recedes. The eye should land on what still needs
                doing, so a struck lift drops to secondary ink and the rule
                rides at 55% — a finished line on a sheet, not a redaction. */}
            <h3
              className={cn(
                "font-display text-base font-semibold leading-tight transition-colors",
                struck ? "text-ink-soft" : "text-ink",
              )}
            >
              <span className={cn("strike", struck && "strike-on")}>{name}</span>
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
          {demo ? <DemoMedia demo={demo} name={name} /> : null}
          {footer ? <div className="mt-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
