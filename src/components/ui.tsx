import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "metric grid h-9 w-9 shrink-0 place-items-center rounded-full border border-jade/15 bg-jade-wash text-xs font-semibold text-jade-strong",
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-colors focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-jade text-white hover:bg-jade-strong",
  outline: "border border-line bg-card text-ink hover:bg-paper",
  ghost: "text-ink-soft hover:bg-paper hover:text-ink",
  danger: "border border-flag/30 text-flag hover:bg-flag/5",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  sm: "h-9 px-3.5 text-[0.8125rem]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md") {
  return cn(base, variants[variant], sizes[size]);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function Card({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={htmlFor}>
      <span className="eyebrow text-ink-soft">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-[var(--radius-sm)] border border-line bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus-visible:border-jade focus-visible:outline-none";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(inputBase, "min-h-20 resize-y leading-relaxed", className)} {...props} />
  );
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "jade" | "amber" | "flag";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-paper text-ink-soft border-line",
    jade: "bg-jade-wash text-jade-strong border-jade/20",
    amber: "bg-amber-wash text-amber border-amber/25",
    flag: "bg-flag/8 text-flag border-flag/25",
  } as const;
  return (
    <span
      className={cn(
        "eyebrow inline-flex items-center gap-1 rounded-full border px-2.5 py-1",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-[var(--radius-sm)] border border-flag/25 bg-flag/5 px-3.5 py-2.5 text-sm text-flag"
    >
      {children}
    </p>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {children ? <p className="max-w-sm text-sm text-ink-soft">{children}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </Card>
  );
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10", className)}
      {...props}
    />
  );
}

export function PageHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow text-ink-soft">{eyebrow}</p> : null}
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-[1.75rem]">
          {title}
        </h1>
        {children ? (
          <div className="mt-1.5 text-sm text-ink-soft">{children}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
