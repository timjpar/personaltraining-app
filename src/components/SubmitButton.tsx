"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui";

// Submit button that reflects the enclosing <form>'s pending state.
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "md" | "sm";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(buttonClass(variant, size), className)}
    >
      {pending ? pendingLabel ?? "Working…" : children}
    </button>
  );
}
