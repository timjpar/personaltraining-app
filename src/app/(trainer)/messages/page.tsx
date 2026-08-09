import { requireTrainer } from "@/lib/auth";
import { listThreads } from "@/lib/messaging";
import { Container, PageHeading, ButtonLink, EmptyState } from "@/components/ui";
import { ThreadList } from "@/components/ThreadList";

export default async function MessagesPage() {
  const trainer = await requireTrainer();
  const threads = await listThreads(trainer.id);

  return (
    <Container>
      <PageHeading
        eyebrow="Messages"
        title="Conversations"
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/messages/scheduled" variant="outline">
              Scheduled
            </ButtonLink>
            <ButtonLink href="/messages/new">New message</ButtonLink>
          </div>
        }
      >
        Talk to your athletes one to one, or start a group. Every message also
        goes to their inbox, and they can reply from either.
      </PageHeading>

      <div className="mt-6">
        <ThreadList
          threads={threads}
          basePath="/messages"
          empty={
            <EmptyState
              title="No conversations yet"
              action={<ButtonLink href="/messages/new">New message</ButtonLink>}
            >
              Start one with a client, or set up a message that goes out on a
              schedule.
            </EmptyState>
          }
        />
      </div>
    </Container>
  );
}
