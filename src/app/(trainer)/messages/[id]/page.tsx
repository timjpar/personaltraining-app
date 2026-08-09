import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { requireTrainer } from "@/lib/auth";
import { getThreadFor, markThreadRead, threadLabelFor } from "@/lib/messaging";
import { THREAD_KINDS } from "@/lib/constants";
import { Container, Card, Badge } from "@/components/ui";
import { MessageList } from "@/components/MessageList";
import { MessageComposer } from "@/components/MessageComposer";
import { sendMessage } from "../actions";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainer = await requireTrainer();

  // Scoped to threads this coach is in, so a guessed id is a 404 rather than
  // someone else's conversation.
  const thread = await getThreadFor(id, trainer.id);
  if (!thread) notFound();

  // In after(), for the reason /calendar puts syncIfStale there: a render
  // shouldn't block on a write nothing on the page reads. The cost is that the
  // tab badge in the layout, which rendered alongside this page, still counts
  // these messages — it settles on the next navigation, which is the moment
  // anyone would look at it again.
  after(() => markThreadRead(id, trainer.id));

  const isGroup = thread.kind === THREAD_KINDS.GROUP;
  const label = threadLabelFor(thread, trainer.id);
  const others = thread.participants.filter((p) => p.user.id !== trainer.id);

  return (
    <Container className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/messages"
            className="eyebrow text-ink-soft transition-colors hover:text-ink"
          >
            ← Messages
          </Link>
          <h1 className="mt-1 truncate font-display text-2xl font-semibold text-ink">
            {label}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {isGroup
              ? others.map((p) => p.user.name).join(", ")
              : others[0]?.user.email}
          </p>
        </div>
        {isGroup ? <Badge tone="jade">Group</Badge> : null}
      </div>

      <Card className="mt-6 p-4 sm:p-5">
        {thread.messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">
            Nothing here yet. Say hello.
          </p>
        ) : (
          <MessageList
            messages={thread.messages}
            viewerId={trainer.id}
            showSenderNames={isGroup}
          />
        )}
      </Card>

      <div className="mt-4">
        <MessageComposer action={sendMessage} threadId={thread.id} />
      </div>
    </Container>
  );
}
