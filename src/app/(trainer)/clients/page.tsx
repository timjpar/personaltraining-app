import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, Avatar, EmptyState } from "@/components/ui";
import { avatarUrl } from "@/lib/avatar";
import { AddClientForm } from "./AddClientForm";

export default async function ClientsPage() {
  const trainer = await requireTrainer();

  const clients = await prisma.user.findMany({
    where: { trainerId: trainer.id, role: "CLIENT" },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { workoutsAsClient: true } },
      workoutsAsClient: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { completedAt: true },
      },
    },
  });

  return (
    <Container>
      <PageHeading eyebrow="Roster" title="Clients">
        Everyone you coach. Open a client to program their training.
      </PageHeading>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          {clients.length === 0 ? (
            <EmptyState title="No clients yet">
              Add your first client with the form to the right, then open them up
              to program a session.
            </EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}`}
                  className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-paper"
                >
                  <Avatar name={c.name} src={avatarUrl(c)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                    <p className="metric truncate text-xs text-ink-soft">{c.email}</p>
                  </div>
                  <p className="metric hidden text-xs text-ink-soft sm:block">
                    {c._count.workoutsAsClient} session
                    {c._count.workoutsAsClient === 1 ? "" : "s"}
                  </p>
                  <span className="text-ink-soft">›</span>
                </Link>
              ))}
            </Card>
          )}
        </section>

        <aside>
          <AddClientForm />
        </aside>
      </div>
    </Container>
  );
}
