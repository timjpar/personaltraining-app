import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { avatarUrl } from "@/lib/avatar";
import { zoneFor } from "@/lib/time-zone";
import { formatStamp } from "@/lib/format";
import { ROLES, toBroadcastAudience } from "@/lib/constants";
import { Container, Card } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ScheduledMessageForm } from "@/components/ScheduledMessageForm";
import { saveBroadcast, deleteBroadcast } from "../../actions";

export default async function EditScheduledMessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainer = await requireTrainer();

  const [broadcast, clients] = await Promise.all([
    // Scoped by trainerId, so another coach's id is a 404 rather than an edit
    // form for their message.
    prisma.broadcast.findFirst({
      where: { id, trainerId: trainer.id },
      include: {
        recipients: { select: { clientId: true } },
        // The last few sends, so "is this thing actually working" is
        // answerable from the page rather than from the database.
        runs: { orderBy: { claimedAt: "desc" }, take: 5 },
      },
    }),
    prisma.user.findMany({
      where: { trainerId: trainer.id, role: ROLES.CLIENT },
      orderBy: { name: "asc" },
      select: { id: true, name: true, photoUpdatedAt: true },
    }),
  ]);

  if (!broadcast) notFound();

  return (
    <Container className="max-w-3xl">
      <Link
        href="/messages/scheduled"
        className="eyebrow text-ink-soft transition-colors hover:text-ink"
      >
        ← Scheduled messages
      </Link>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
        {broadcast.label}
      </h1>

      <Card className="mt-6 p-5">
        <ScheduledMessageForm
          action={saveBroadcast}
          timeZone={zoneFor(trainer)}
          clients={clients.map((c) => ({
            id: c.id,
            name: c.name,
            avatar: avatarUrl(c),
          }))}
          existing={{
            id: broadcast.id,
            label: broadcast.label,
            body: broadcast.body,
            hour: broadcast.hour,
            weekdays: broadcast.weekdays,
            audience: toBroadcastAudience(broadcast.audience),
            alsoEmail: broadcast.alsoEmail,
            active: broadcast.active,
            recipientIds: broadcast.recipients.map((r) => r.clientId),
          }}
        />
      </Card>

      {broadcast.runs.length > 0 ? (
        <Card className="mt-6 p-5">
          <h2 className="font-display text-base font-semibold text-ink">
            Recent sends
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {broadcast.runs.map((run) => (
              <li
                key={run.id}
                className="metric flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-ink">{run.day}</span>
                <span className="text-ink-soft">
                  {run.ok
                    ? `${run.sent} sent · ${run.sentAt ? formatStamp(run.sentAt) : ""}`
                    : "Didn't go out"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mt-6 p-5">
        <h2 className="font-display text-base font-semibold text-ink">
          Delete this
        </h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Messages it has already sent stay in your athletes&rsquo; threads —
          they were real messages. This only stops future ones.
        </p>
        <form action={deleteBroadcast} className="mt-4">
          <input type="hidden" name="id" value={broadcast.id} />
          <SubmitButton variant="danger" pendingLabel="Deleting…">
            Delete
          </SubmitButton>
        </form>
      </Card>
    </Container>
  );
}
