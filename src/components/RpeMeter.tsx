import { cn } from "@/lib/cn";

// Session RPE as a 10-segment bar. Amber is reserved for effort throughout.
export function RpeMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-5 w-1.5 rounded-full",
              i < value ? "bg-amber" : "bg-line",
            )}
          />
        ))}
      </div>
      <span className="metric text-sm font-medium text-ink">
        {value}
        <span className="text-ink-soft">/10</span>
      </span>
    </div>
  );
}
