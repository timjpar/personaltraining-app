import Link from "next/link";
import { cn } from "@/lib/cn";

export function Wordmark({
  light = false,
  href = "/",
}: {
  light?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 shrink-0 items-center gap-2.5 sm:min-h-0"
    >
      <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-jade text-white">
        <svg
          width="17"
          height="17"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 13.5 L8 17 L17 4"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className={cn(
          "font-display text-lg font-semibold tracking-tight",
          light ? "text-white" : "text-ink",
        )}
      >
        Chalkline
      </span>
    </Link>
  );
}
