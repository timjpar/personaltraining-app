import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { avatarUrl } from "@/lib/avatar";
import { zoneFor } from "@/lib/time-zone";
import { formatTime } from "@/lib/calendar";
import { mailConfig } from "@/lib/mail";
import {
  BROADCAST_AUDIENCES,
  ROLES,
  WEEKDAY_LABELS,
  toBroadcastAudience,
} from "@/lib/constants";
import { Container, Card, Badge, PageHeading } from "@/components/ui";
import { ScheduledMessageForm } from "@/components/ScheduledMessageForm";
import { saveBroadcast } from "../actions";

export default async function ScheduledMessagesPage() {
  const trainer = await requireTrainer();

  const [clients, broadcasts] = await Promise.all([
    prisma.user.findMany({
      where: { trainerId: trainer.id, role: ROLES.CLIENT },
      orderBy: { name: "asc" },
      select: { id: true, name: true, photoUpdatedAt: true },
    }),
    prisma.broadcast.findMany({
      where: { trainerId: trainer.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { recipients: true } } },
    }),
  ]);

  const zone = zoneFor(trainer);

  return (
    <Container className="max-w-3xl">
      <Link
        href="/messages"
        className="eyebrow text-ink-soft transition-colors hover:text-ink"
      >
        ← Messages
      </Link>
      <div className="mt-1">
        <PageHeading title="Scheduled messages">
          Write it once and it goes out on the days you pick, in your name, to
          each athlete&rsquo;s own thread.
        </PageHeading>
      </div>

      {/* Same call GoogleCalendarCard and NotificationsCard make: say plainly
          that mail isn't configured rather than letting a coach tick "email it
          as well" and wonder why nothing arrives. The thread copy still works,
          which is why this is a note and not a blocked page. */}
      {!mailConfig() ? (
        <p className="mt-4 rounded-[var(--radius-sm)] border border-amber/25 bg-amber-wash px-3.5 py-2.5 text-sm text-ink">
          Email isn&rsquo;t set up on this server, so these will only appear in
          the app — nothing will reach an inbox.
        </p>
      ) : null}

      {broadcasts.length > 0 ? (
        <Card className="mt-6 divide-y divide-line overflow-hidden">
          {broadcasts.map((b) => {
            const audience = toBroadcastAudience(b.audience);
            const who =
              audience === BROADCAST_AUDIENCES.ALL
                ? "Everyone"
                : `${b._count.recipients} ${
                    b._count.recipients === 1 ? "person" : "people"
                  }`;
            return (
              <Link
                key={b.id}
                href={`/messages/scheduled/${b.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-paper"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {b.label}
                    </span>
                    {b.active ? null : <Badge>Paused</Badge>}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-ink-soft">
                    {b.body}
                  </span>
                </span>
                <span className="metric shrink-0 text-right text-xs text-ink-soft">
                  {b.weekdays.length === 7
                    ? "Every day"
                    : b.weekdays.map((d) => WEEKDAY_LABELS[d]).join(" ")}
                  <span className="mt-0.5 block">
                    {formatTime(b.hour * 60)} · {who}
                  </span>
                </span>
              </Link>
            );
          })}
        </Card>
      ) : null}

      <Card className="mt-6 p-5">
        <h2 className="font-display text-base font-semibold text-ink">
          {broadcasts.length > 0 ? "Add another" : "Write your first one"}
        </h2>
        <div className="mt-4">
          <ScheduledMessageForm
            action={saveBroadcast}
            timeZone={zone}
            clients={clients.map((c) => ({
              id: c.id,
              name: c.name,
              avatar: avatarUrl(c),
            }))}
          />
        </div>
      </Card>
    </Container>
  );
}
