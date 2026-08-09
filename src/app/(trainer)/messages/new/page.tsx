import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { avatarUrl } from "@/lib/avatar";
import { ROLES } from "@/lib/constants";
import { Container, Card, EmptyState, ButtonLink } from "@/components/ui";
import { ThreadStarter } from "@/components/ThreadStarter";
import { startThread } from "../actions";

export default async function NewThreadPage() {
  const trainer = await requireTrainer();

  const clients = await prisma.user.findMany({
    where: { trainerId: trainer.id, role: ROLES.CLIENT },
    orderBy: { name: "asc" },
    select: { id: true, name: true, photoUpdatedAt: true },
  });

  return (
    <Container className="max-w-2xl">
      <Link
        href="/messages"
        className="eyebrow text-ink-soft transition-colors hover:text-ink"
      >
        ← Messages
      </Link>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
        New message
      </h1>

      <div className="mt-6">
        {clients.length === 0 ? (
          <EmptyState
            title="No clients yet"
            action={<ButtonLink href="/clients">Add a client</ButtonLink>}
          >
            Messages go to the athletes on your roster, so there needs to be
            someone on it first.
          </EmptyState>
        ) : (
          <Card className="p-5">
            <ThreadStarter
              action={startThread}
              clients={clients.map((c) => ({
                id: c.id,
                name: c.name,
                avatar: avatarUrl(c),
              }))}
            />
          </Card>
        )}
      </div>
    </Container>
  );
}
