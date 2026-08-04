import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Container,
  PageHeading,
  Card,
  Badge,
  Avatar,
  EmptyState,
  ButtonLink,
} from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { relativeTime, formatDateLong } from "@/lib/format";
import { startOfWeek } from "@/lib/calendar";
import { markAllRead } from "./actions";

// One scoreboard strip on a phone, three separate cards from `sm` up. The
// mobile shape is deliberate: at 375px a 2-up grid of tall cards orphaned the
// third one and burned most of a screen before the feed — the thing the
// trainer actually opened the page to read. Hairline dividers instead of gaps
// keep it to one band and match the sheet's rule vocabulary.
function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="px-3 py-3 sm:rounded-[var(--radius-card)] sm:border sm:border-line sm:bg-card sm:px-5 sm:py-4 sm:shadow-[var(--shadow-card)]">
      <p className="metric text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {value}
      </p>
      <p className="eyebrow mt-1 leading-tight tracking-[0.1em] text-ink-soft sm:tracking-[0.16em]">
        {label}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  const trainer = await requireTrainer();
  const firstName = trainer.name.split(/\s+/)[0];

  const [clients, feed, unread, completedThisWeek] = await Promise.all([
    prisma.user.findMany({
      where: { trainerId: trainer.id, role: "CLIENT" },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { workoutsAsClient: true } },
      },
    }),
    prisma.feedItem.findMany({
      where: { trainerId: trainer.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { client: true, workout: true },
    }),
    prisma.feedItem.count({ where: { trainerId: trainer.id, read: false } }),
    prisma.workout.count({
      where: {
        trainerId: trainer.id,
        status: "COMPLETED",
        completedAt: { gte: startOfWeek(new Date()) },
      },
    }),
  ]);

  return (
    <Container>
      <PageHeading
        eyebrow={formatDateLong(new Date())}
        title={`Good to see you, ${firstName}`}
        // Hidden on phones: both destinations are already one thumb-tap away
        // in the tab bar, and the pair was costing ~90px directly above the
        // feed this page exists to show.
        action={
          <div className="hidden items-center gap-2 sm:flex">
            <ButtonLink href="/calendar" variant="outline">
              Calendar
            </ButtonLink>
            <ButtonLink href="/clients">Clients</ButtonLink>
          </div>
        }
      >
        Here&rsquo;s what your athletes have been up to.
      </PageHeading>

      <div className="mt-6 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)] sm:mt-7 sm:gap-3 sm:divide-x-0 sm:border-0 sm:bg-transparent sm:shadow-none">
        <StatCard label="Active clients" value={clients.length} />
        <StatCard label="Done this week" value={completedThisWeek} />
        <StatCard label="To review" value={unread} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Activity feed — the trainer's half of the loop. */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Activity</h2>
            {unread > 0 ? (
              <form action={markAllRead}>
                <SubmitButton variant="ghost" size="sm" pendingLabel="Marking…">
                  Mark all read
                </SubmitButton>
              </form>
            ) : null}
          </div>

          {feed.length === 0 ? (
            <EmptyState title="No completed sessions yet">
              When an athlete finishes a workout you programmed, it shows up here
              with their results and how hard it felt.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {feed.map((item) => {
                const isUnread = !item.read;
                return (
                  <li
                    key={item.id}
                    className={
                      "rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-card)] " +
                      (isUnread
                        ? "border-jade/30 bg-jade-wash/30"
                        : "border-line bg-card")
                    }
                  >
                    <div className="flex gap-3.5">
                      <Avatar name={item.client.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm leading-snug">
                            <span className="font-medium text-ink">
                              {item.client.name}
                            </span>{" "}
                            <span className="text-ink-soft">finished</span>{" "}
                            <span className="font-medium text-ink">
                              {item.workout.title}
                            </span>
                          </p>
                          <span className="metric shrink-0 whitespace-nowrap text-xs text-ink-soft">
                            {relativeTime(item.createdAt)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2.5">
                          {isUnread ? <Badge tone="jade">New</Badge> : null}
                          {item.workout.rpe != null ? (
                            <Badge tone="amber">RPE {item.workout.rpe}</Badge>
                          ) : null}
                          <Link
                            href={`/workouts/${item.workout.id}`}
                            className="text-xs font-medium text-jade-strong hover:underline"
                          >
                            Review session →
                          </Link>
                        </div>

                        {item.workout.clientComment ? (
                          <p className="mt-2.5 border-l-2 border-line pl-3 text-sm leading-relaxed text-ink-soft">
                            {item.workout.clientComment}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Client quick list. */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Your clients</h2>
            <Link
              href="/clients"
              className="text-xs font-medium text-jade-strong hover:underline"
            >
              Manage →
            </Link>
          </div>

          {clients.length === 0 ? (
            <EmptyState
              title="No clients yet"
              action={<ButtonLink href="/clients" size="sm">Add your first client</ButtonLink>}
            >
              Add a client to start programming their training.
            </EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper"
                >
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                    <p className="metric text-xs text-ink-soft">
                      {c._count.workoutsAsClient} session
                      {c._count.workoutsAsClient === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="text-ink-soft">›</span>
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>
    </Container>
  );
}
