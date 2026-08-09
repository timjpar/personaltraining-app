import { Avatar } from "@/components/ui";
import { avatarUrl } from "@/lib/avatar";
import { formatStamp } from "@/lib/format";

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: Date;
  emailedAt: Date | null;
  sender: { id: string; name: string; photoUpdatedAt: Date | null };
};

// A conversation, oldest at the top — the reading order of every messaging app
// anyone already uses, and the opposite of the feed on /dashboard, which is a
// list of events rather than something with a beginning.
export function MessageList({
  messages,
  viewerId,
  showSenderNames,
}: {
  messages: ThreadMessage[];
  viewerId: string;
  // A 1:1 has exactly two people and one of them is you, so naming the sender
  // above every line is noise. A group needs it.
  showSenderNames: boolean;
}) {
  return (
    <ol className="flex flex-col gap-4">
      {messages.map((message) => {
        const mine = message.sender.id === viewerId;
        return (
          <li
            key={message.id}
            className={mine ? "flex flex-row-reverse gap-2.5" : "flex gap-2.5"}
          >
            <Avatar
              name={message.sender.name}
              src={avatarUrl(message.sender)}
              className="mt-0.5 h-8 w-8"
            />
            <div
              className={
                mine
                  ? "flex min-w-0 max-w-[85%] flex-col items-end sm:max-w-[70%]"
                  : "flex min-w-0 max-w-[85%] flex-col items-start sm:max-w-[70%]"
              }
            >
              {showSenderNames && !mine ? (
                <p className="eyebrow mb-1 text-ink-soft">
                  {message.sender.name}
                </p>
              ) : null}
              <div
                className={
                  mine
                    ? "rounded-[var(--radius-card)] rounded-tr-sm bg-jade px-3.5 py-2.5 text-sm leading-relaxed text-white"
                    : "rounded-[var(--radius-card)] rounded-tl-sm border border-line bg-card px-3.5 py-2.5 text-sm leading-relaxed text-ink"
                }
              >
                {/* pre-wrap, not a split into <p>: what someone typed into a
                    chat box is one block of text whose line breaks they chose,
                    and React escapes it on the way in. */}
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                {formatStamp(message.createdAt)}
                {/* Only ever shown on your own messages. Whether a copy
                    reached someone's inbox is the sender's business, and on
                    the receiving side it's both obvious and irrelevant. */}
                {mine && message.emailedAt ? " · emailed" : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
