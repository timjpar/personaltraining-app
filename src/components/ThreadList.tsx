import Link from "next/link";
import { Avatar, Card } from "@/components/ui";
import { avatarUrl } from "@/lib/avatar";
import { relativeTime } from "@/lib/format";
import { THREAD_KINDS } from "@/lib/constants";
import type { ThreadSummary } from "@/lib/messaging";

// The inbox, for either role. A server component with no state of its own —
// the only thing that differs between a coach's list and an athlete's is where
// the rows point, which is what basePath is.
export function ThreadList({
  threads,
  basePath,
  empty,
}: {
  threads: ThreadSummary[];
  basePath: string;
  empty: React.ReactNode;
}) {
  if (threads.length === 0) return <>{empty}</>;

  return (
    <Card className="divide-y divide-line overflow-hidden">
      {threads.map((thread) => {
        // A group's row draws the first two faces; a 1:1 draws the one person
        // it's with. Beyond two the stack stops reading as faces and starts
        // reading as noise, so the rest are a count.
        const faces = thread.others.slice(0, 2);
        const extra = thread.others.length - faces.length;

        return (
          <Link
            key={thread.id}
            href={`${basePath}/${thread.id}`}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-paper"
          >
            <span className="flex shrink-0 -space-x-2">
              {faces.map((person) => (
                <Avatar
                  key={person.id}
                  name={person.name}
                  src={avatarUrl(person)}
                  className="ring-2 ring-card"
                />
              ))}
              {extra > 0 ? (
                <span className="metric grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-paper text-xs font-semibold text-ink-soft ring-2 ring-card">
                  +{extra}
                </span>
              ) : null}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="truncate text-sm font-medium text-ink">
                  {thread.label}
                </span>
                {thread.kind === THREAD_KINDS.GROUP ? (
                  <span className="eyebrow shrink-0 text-ink-soft">Group</span>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-sm text-ink-soft">
                {thread.lastMessage ? (
                  <>
                    {/* Whose line it was matters most in a group, but it
                        costs nothing in a 1:1 and keeps one shape. */}
                    <span className="text-ink-soft/80">
                      {thread.lastMessage.senderName}:
                    </span>{" "}
                    {thread.lastMessage.body}
                  </>
                ) : (
                  "No messages yet"
                )}
              </span>
            </span>

            <span className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-xs text-ink-soft">
                {relativeTime(thread.lastMessageAt)}
              </span>
              {thread.unread > 0 ? (
                <span className="metric grid h-5 min-w-5 place-items-center rounded-full bg-jade px-1.5 text-[0.625rem] font-semibold text-white">
                  {thread.unread}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </Card>
  );
}
