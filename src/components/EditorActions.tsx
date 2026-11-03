import type { ReactNode } from "react";
import { UndoButtons } from "@/components/UndoButtons";
import { cn } from "@/lib/cn";

// The top of an editor: undo and redo, then its second save. A form that is
// longer than a screen keeps its first save up here as well as at the bottom,
// so a change near the top doesn't mean scrolling down to send it.
export function EditorActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <UndoButtons />
      {children}
    </div>
  );
}

// A section heading drawn by the form itself, for a form that sits partway
// down a page rather than under its PageHeading: the title, a line under it,
// and the editor's actions beside them. Without a title — the page's own
// heading is right above — the actions get a line of their own.
export function FormHeading({
  title,
  intro,
  size = "lg",
  children,
}: {
  title?: string;
  intro?: ReactNode;
  size?: "lg" | "base";
  children: ReactNode;
}) {
  if (!title) {
    return (
      <div className="flex justify-end">
        <EditorActions>{children}</EditorActions>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2
          className={cn(
            "font-display font-semibold text-ink",
            size === "lg" ? "text-lg" : "text-base",
          )}
        >
          {title}
        </h2>
        {intro ? <p className="mt-1 text-sm text-ink-soft">{intro}</p> : null}
      </div>
      <EditorActions>{children}</EditorActions>
    </div>
  );
}
