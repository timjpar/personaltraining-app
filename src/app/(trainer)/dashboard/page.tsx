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
import { NotificationsCard } from "@/components/NotificationsCard";
import { ProfilePhotoCard } from "@/components/ProfilePhotoCard";
import {
  saveProfilePhoto,
  removeProfilePhoto,
} from "@/app/profile-photo-actions";
import { avatarUrl } from "@/lib/avatar";
import { mailConfig } from "@/lib/mail";
import { zoneFor } from "@/lib/time-zone";
import { relativeTime, formatDate, formatDateLong, toDateInput } from "@/lib/format";
import { startOfWeek } from "@/lib/calendar";
import { sumMacros } from "@/lib/nutrition-form";
import {
  CLIENT_STAGE,
  FEED_TYPE,
  ROLES,
  balanceLabel,
  sessionState,
  toClientStage,
  toFeedType,
} from "@/lib/constants";
import { balanceFrom, balancesFor } from "@/lib/sessions";
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
      where: { trainerId: trainer.id, role: ROLES.CLIENT },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { workoutsAsClient: true } },
      },
    }),
    prisma.feedItem.findMany({
      where: { trainerId: trainer.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        client: true,
        workout: true,
        // Foods come along because the row shows the day's totals, and a
        // second query per feed item to get them would be twenty queries.
        nutritionLog: { include: { foods: true } },
      },
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

  // One grouped aggregate over the roster just loaded, not a query per client.
  const balances = await balancesFor(clients.map((c) => c.id));

  // Anyone whose block is nearly out or already gone. Sorted by how bad it is,
  // so the person who has trained past the end of theirs is named first — the
  // whole point of surfacing this on the landing page is that the conversation
  // happens before the next session, not after the tenth.
  const runningLow = clients
    .map((c) => ({ client: c, entry: balanceFrom(balances, c.id) }))
    .filter((row) => sessionState(row.entry) !== "OK")
    .sort((a, b) => a.entry.balance - b.entry.balance);

  const active = clients.filter(
    (c) => toClientStage(c.stage) === CLIENT_STAGE.ACTIVE,
  ).length;

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
        <StatCard label="Active clients" value={active} />
        <StatCard label="Done this week" value={completedThisWeek} />
        <StatCard label="To review" value={unread} />
      </div>

      {/* Paid sessions running out, named and linked. Above the feed and below
          the scoreboard, which is the one spot on this page that earns an
          interruption: it's about money rather than training, it needs doing
          before the next session, and it disappears the moment it's dealt with.
          Nothing renders here for a coach who doesn't sell blocks. */}
      {runningLow.length > 0 ? (
        // A plain div rather than <Card>, for the reason the feed items below
        // are ones too: cn() is a joiner with no conflict resolution, so a
        // background passed to Card lands *alongside* its own bg-card and loses
        // on stylesheet order. A tinted panel has to bring all its own classes.
        <div className="mt-6 rounded-[var(--radius-card)] border border-amber/30 bg-amber-wash p-4 shadow-[var(--shadow-card)] sm:p-5">
          <p className="eyebrow text-amber">Sessions running low</p>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {runningLow.map(({ client, entry }) => (
              <li key={client.id} className="text-sm">
                <Link
                  href={`/clients/${client.id}`}
                  className="font-medium text-ink hover:underline"
                >
                  {client.name}
                </Link>{" "}
                <span
                  className={
                    entry.balance <= 0 ? "text-flag" : "text-ink-soft"
                  }
                >
                  — {balanceLabel(entry)?.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
            <EmptyState title="Nothing from your athletes yet">
              When an athlete finishes a workout you programmed or logs what they
              ate, it shows up here — results, effort, and the day&rsquo;s macros.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {feed.map((item) => {
                const isUnread = !item.read;

                // The shell — avatar, timestamp, New badge, blockquote — is the
                // same for every event. Only these four pieces differ, so the
                // branch produces them and the markup below stays single.
                let headline: React.ReactNode = null;
                let badge: React.ReactNode = null;
                let link: { href: string; label: string } | null = null;
                let note: string | null = null;

                if (toFeedType(item.type) === FEED_TYPE.NUTRITION_LOGGED) {
                  // Guarded rather than assumed: the FK cascades, so a null
                  // here means a row that outlived its subject, and a feed
                  // that crashes on one is worse than one that skips it.
                  if (!item.nutritionLog) return null;
                  const totals = sumMacros([{ foods: item.nutritionLog.foods }]);
                  headline = (
                    <>
                      <span className="font-medium text-ink">
                        {item.client.name}
                      </span>{" "}
                      <span className="text-ink-soft">logged nutrition for</span>{" "}
                      <span className="font-medium text-ink">
                        {formatDate(item.nutritionLog.date)}
                      </span>
                    </>
                  );
                  // Reads by when it was touched but names the day it's *for*,
                  // so backfilling yesterday's log this morning still parses.
                  badge = (
                    <span className="metric text-xs text-ink-soft">
                      {totals.calories} kcal · P {totals.protein} · C{" "}
                      {totals.carbs} · F {totals.fat}
                    </span>
                  );
                  link = {
                    href: `/clients/${item.clientId}/nutrition/${toDateInput(
                      item.nutritionLog.date,
                    )}`,
                    label: "Review log →",
                  };
                  note = item.nutritionLog.notes;
                } else {
                  if (!item.workout) return null;
                  headline = (
                    <>
                      <span className="font-medium text-ink">
                        {item.client.name}
                      </span>{" "}
                      <span className="text-ink-soft">finished</span>{" "}
                      <span className="font-medium text-ink">
                        {item.workout.title}
                      </span>
                    </>
                  );
                  badge =
                    item.workout.rpe != null ? (
                      <Badge tone="amber">RPE {item.workout.rpe}</Badge>
                    ) : null;
                  link = {
                    href: `/workouts/${item.workout.id}`,
                    label: "Review session →",
                  };
                  note = item.workout.clientComment;
                }

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
                      <Avatar
                        name={item.client.name}
                        src={avatarUrl(item.client)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm leading-snug">{headline}</p>
                          <span className="metric shrink-0 whitespace-nowrap text-xs text-ink-soft">
                            {relativeTime(item.createdAt)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2.5">
                          {isUnread ? <Badge tone="jade">New</Badge> : null}
                          {badge}
                          <Link
                            href={link.href}
                            className="text-xs font-medium text-jade-strong hover:underline"
                          >
                            {link.label}
                          </Link>
                        </div>

                        {note ? (
                          <p className="mt-2.5 border-l-2 border-line pl-3 text-sm leading-relaxed text-ink-soft">
                            {note}
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
                  <Avatar name={c.name} src={avatarUrl(c)} />
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

      {/* Bottom and one column, for the reason the file's header comment gives
          about the feed: nothing goes above the thing this page exists to show. */}
      <section className="mt-10 flex max-w-md flex-col gap-6">
        <NotificationsCard
          digestHour={trainer.digestHour}
          instantWorkoutEmail={trainer.instantWorkoutEmail}
          instantNutritionEmail={trainer.instantNutritionEmail}
          timeZone={zoneFor(trainer)}
          mailConfigured={mailConfig() !== null}
        />
        <ProfilePhotoCard
          name={trainer.name}
          photoUrl={avatarUrl(trainer)}
          save={saveProfilePhoto}
          remove={removeProfilePhoto}
        />
      </section>
    </Container>
  );
}
