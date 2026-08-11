import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui";
import { VideoEmbed } from "@/components/VideoEmbed";
import { setValuesFor, storedSetCount } from "@/lib/exercise-sets";

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

// What the athlete actually logged, read back on a finished session. A plain
// function rather than a component so "nothing was logged" is a null the
// caller can pass straight to `footer` — PrescriptionCard only wraps a footer
// it was given, so an empty element would leave a 16px gap under the card.
//
// One of these for all three readers (trainer review, the athlete's own copy,
// admin) because the only honest difference between them is whose session it
// is. They were three copies of the same markup until sets needed adding to
// all of them.
//
// Set by set once there is more than one, which is the point of logging them
// that way: "6,6,6,5 @ 60,60,65,65" on one line is four facts crammed into two
// strings and a coach has to unzip them by eye. A single set — and every result
// logged before per-set rows existed — keeps the one-line form it always had.
export function loggedResult({
  label = "Logged",
  sets,
  reps,
  load,
}: {
  label?: string;
  sets?: string | null;
  reps?: string | null;
  load?: string | null;
}): ReactNode {
  const count = storedSetCount({ sets, reps, load });
  const perSet = count > 1 && Boolean(reps || load);

  if (!perSet) {
    const parts: Array<[string, string]> = [];
    if (sets) parts.push(["sets", `${sets} sets`]);
    if (reps) parts.push(["reps", `${reps} reps`]);
    // The "@" keeps a bare number from reading as another count.
    if (load) parts.push(["load", `@ ${load}`]);
    if (parts.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[var(--radius-sm)] bg-jade-wash/60 px-3.5 py-2.5">
        <span className="eyebrow text-jade-strong">{label}</span>
        {parts.map(([key, text]) => (
          <span key={key} className="metric text-sm text-ink">
            {text}
          </span>
        ))}
      </div>
    );
  }

  const repValues = setValuesFor(reps, count);
  const loadValues = setValuesFor(load, count);

  return (
    <div className="rounded-[var(--radius-sm)] bg-jade-wash/60 px-3.5 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="eyebrow text-jade-strong">{label}</span>
        {sets ? (
          <span className="metric text-sm text-ink">{sets} sets</span>
        ) : null}
      </div>
      {/* auto columns, not fractions: these are short values that belong
          beside each other, and a grid still lines them up down the card the
          way a fraction would. */}
      <div className="mt-2 flex flex-col gap-1">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1.25rem_auto_auto] justify-start gap-x-3"
          >
            <span className="metric text-xs text-ink-soft/70">{i + 1}</span>
            {/* An em dash rather than an empty cell: a set that was left blank
                is something the coach should see, not a gap they have to count
                rows to notice. */}
            <span className="metric text-sm text-ink">
              {repValues[i] || "—"}
            </span>
            <span className="metric text-sm text-ink-soft">
              {loadValues[i] ? `× ${loadValues[i]}` : ""}
            </span>
          </div>
        ))}
      </div>
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
