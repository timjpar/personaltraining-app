import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, Avatar, Badge, EmptyState } from "@/components/ui";
import { avatarUrl } from "@/lib/avatar";
import { allowances, rosterCounts, type StageAllowance } from "@/lib/roster";
import { balanceFrom, balancesFor } from "@/lib/sessions";
import {
  CLIENT_STAGE,
  CLIENT_STAGE_ORDER,
  CLIENT_STAGE_PLURALS,
  ROLES,
  balanceLabel,
  sessionState,
  toClientStage,
} from "@/lib/constants";
import { AddClientForm } from "./AddClientForm";

export default async function ClientsPage() {
  const trainer = await requireTrainer();

  const clients = await prisma.user.findMany({
    where: { trainerId: trainer.id, role: ROLES.CLIENT },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { workoutsAsClient: true } },
    },
  });

  // Both derived from the roster already in hand rather than re-queried: the
  // counts are a group-by over the same rows, and the balances are one grouped
  // aggregate for the whole list instead of one per client.
  const [counts, balances] = await Promise.all([
    rosterCounts(trainer.id),
    balancesFor(clients.map((c) => c.id)),
  ]);
  const room = allowances(counts);

  const byStage = Object.fromEntries(
    CLIENT_STAGE_ORDER.map((stage) => [
      stage,
      clients.filter((c) => toClientStage(c.stage) === stage),
    ]),
  );

  return (
    <Container>
      <PageHeading eyebrow="Roster" title="Clients">
        Everyone you coach, and everyone you&rsquo;re courting. Open one to
        program their training.
      </PageHeading>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-8">
          {clients.length === 0 ? (
            <EmptyState title="No clients yet">
              Add your first client with the form to the right, then open them up
              to program a session.
            </EmptyState>
          ) : (
            CLIENT_STAGE_ORDER.map((stage) => {
              const rows = byStage[stage];
              const allowance = room.find((a) => a.stage === stage)!;
              // A stage nobody is in doesn't get a heading and an empty card.
              // Prospects are the common case for that — plenty of coaches will
              // never use them, and a permanent empty section would be the app
              // insisting on a feature they didn't ask for.
              if (rows.length === 0 && stage === CLIENT_STAGE.PROSPECT) {
                return null;
              }

              return (
                <section key={stage}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h2 className="font-display text-lg font-semibold text-ink">
                      {CLIENT_STAGE_PLURALS[stage]}
                    </h2>
                    <AllowanceNote allowance={allowance} />
                  </div>

                  <Card className="divide-y divide-line">
                    {rows.map((c) => {
                      const entry = balanceFrom(balances, c.id);
                      const label = balanceLabel(entry);
                      const standing = sessionState(entry);
                      return (
                        <Link
                          key={c.id}
                          href={`/clients/${c.id}`}
                          className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-paper"
                        >
                          <Avatar name={c.name} src={avatarUrl(c)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                              {c.name}
                            </p>
                            <p className="metric truncate text-xs text-ink-soft">
                              {c.email}
                            </p>
                          </div>
                          {/* Only when it's worth reading. An untracked client
                              gets nothing, and a healthy balance gets nothing
                              either — a badge on every row is a badge nobody
                              scans. */}
                          {label && standing !== "OK" ? (
                            <Badge tone={standing === "OUT" ? "flag" : "amber"}>
                              {label}
                            </Badge>
                          ) : null}
                          <p className="metric hidden text-xs text-ink-soft sm:block">
                            {c._count.workoutsAsClient} session
                            {c._count.workoutsAsClient === 1 ? "" : "s"}
                          </p>
                          <span className="text-ink-soft">›</span>
                        </Link>
                      );
                    })}
                  </Card>
                </section>
              );
            })
          )}
        </div>

        <aside>
          <AddClientForm allowances={room} />
        </aside>
      </div>
    </Container>
  );
}

// "12 of 40" — and amber once there are three or fewer left, which is the same
// threshold a low session balance gets and for the same reason: a limit you
// discover by hitting it is a worse limit than one you saw coming.
function AllowanceNote({ allowance }: { allowance: StageAllowance }) {
  const tight = allowance.remaining <= 3;
  return (
    <p
      className={
        "metric text-xs " + (tight ? "text-amber" : "text-ink-soft")
      }
    >
      {allowance.used} of {allowance.limit}
      {allowance.full
        ? " · full"
        : tight
          ? ` · ${allowance.remaining} left`
          : ""}
    </p>
  );
}
