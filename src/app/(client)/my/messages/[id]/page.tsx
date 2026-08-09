import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { requireClient } from "@/lib/auth";
import { getThreadFor, markThreadRead, threadLabelFor } from "@/lib/messaging";
import { THREAD_KINDS } from "@/lib/constants";
import { Container, Card, Badge } from "@/components/ui";
import { MessageList } from "@/components/MessageList";
import { MessageComposer } from "@/components/MessageComposer";
import { sendReply } from "../actions";

export default async function ClientThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await requireClient();

  const thread = await getThreadFor(id, client.id);
  if (!thread) notFound();

  // Same reasoning as the coach's copy of this page: a write nothing on the
  // page reads has no business blocking the render, so the badge settles on
  // the next navigation.
  after(() => markThreadRead(id, client.id));

  const isGroup = thread.kind === THREAD_KINDS.GROUP;
  const label = threadLabelFor(thread, client.id);
  const others = thread.participants.filter((p) => p.user.id !== client.id);

  return (
    <Container className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/my/messages"
            className="eyebrow text-ink-soft transition-colors hover:text-ink"
          >
            ← Messages
          </Link>
          <h1 className="mt-1 truncate font-display text-2xl font-semibold text-ink">
            {label}
          </h1>
          {isGroup ? (
            <p className="mt-1 text-sm text-ink-soft">
              {/* Who else is in the room, stated up front. An athlete replying
                  to what looks like a note from their coach should be able to
                  see that four other people are reading it. */}
              With {others.map((p) => p.user.name).join(", ")}
            </p>
          ) : null}
        </div>
        {isGroup ? <Badge tone="jade">Group</Badge> : null}
      </div>

      <Card className="mt-6 p-4 sm:p-5">
        {thread.messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">
            Nothing here yet.
          </p>
        ) : (
          <MessageList
            messages={thread.messages}
            viewerId={client.id}
            showSenderNames={isGroup}
          />
        )}
      </Card>

      <div className="mt-4">
        <MessageComposer
          action={sendReply}
          threadId={thread.id}
          placeholder="Reply…"
        />
      </div>
    </Container>
  );
}
