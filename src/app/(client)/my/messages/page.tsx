import { requireClient } from "@/lib/auth";
import { listThreads } from "@/lib/messaging";
import { Container, PageHeading, EmptyState } from "@/components/ui";
import { ThreadList } from "@/components/ThreadList";

export default async function ClientMessagesPage() {
  const client = await requireClient();
  const threads = await listThreads(client.id);

  return (
    <Container>
      <PageHeading eyebrow="Messages" title="Your coach">
        Anything you want to ask between sessions. Replies land here and in your
        email.
      </PageHeading>

      <div className="mt-6">
        <ThreadList
          threads={threads}
          basePath="/my/messages"
          empty={
            // No "start a conversation" button, and the copy says why rather
            // than leaving an athlete hunting for one that isn't there.
            <EmptyState title="Nothing here yet">
              When your coach messages you it&rsquo;ll show up here, and you can
              reply from the same place.
            </EmptyState>
          }
        />
      </div>
    </Container>
  );
}
